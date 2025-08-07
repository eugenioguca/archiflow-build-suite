import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Download, 
  Eye, 
  Trash2, 
  Upload, 
  FileText, 
  Image as ImageIcon,
  File,
  Calendar,
  User
} from "lucide-react";
import { useDropzone } from 'react-dropzone';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface DesignDocument {
  id: string;
  name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  description?: string;
  design_phase: string;
  created_at: string;
  client_id: string;
  profiles?: {
    full_name: string;
  };
}

interface DesignDocumentManagerProps {
  projectId: string;
  clientId: string;
  teamMembers: any[];
}

const DESIGN_PHASES = [
  { value: 'zonificacion', label: 'Zonificación', color: 'bg-blue-500' },
  { value: 'volumetria', label: 'Volumetría', color: 'bg-green-500' },
  { value: 'acabados', label: 'Acabados', color: 'bg-orange-500' },
  { value: 'renders', label: 'Renders', color: 'bg-purple-500' },
  { value: 'planos_finales', label: 'Planos Finales', color: 'bg-red-500' },
  { value: 'general', label: 'General', color: 'bg-gray-500' }
];

const ALLOWED_FILE_TYPES = {
  'image/jpeg': 'Imagen',
  'image/png': 'Imagen', 
  'image/gif': 'Imagen',
  'image/webp': 'Imagen',
  'application/pdf': 'PDF',
  'application/dwg': 'AutoCAD',
  'application/dxf': 'AutoCAD',
  'image/vnd.dwg': 'AutoCAD',
  'application/octet-stream': 'Archivo'
};

export const DesignDocumentManager: React.FC<DesignDocumentManagerProps> = ({
  projectId,
  clientId,
  teamMembers
}) => {
  const [documents, setDocuments] = useState<DesignDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadDetails, setUploadDetails] = useState({
    phase: 'general',
    description: ''
  });

  const fetchDocuments = async () => {
    try {
        const { data, error } = await supabase
          .from('documents')
          .select(`
            id,
            name,
            file_path,
            file_type,
            file_size,
            description,
            design_phase,
            created_at,
            client_id,
            profiles:uploaded_by (full_name)
          `)
          .eq('project_id', projectId)
          .eq('department', 'diseño')
          .eq('document_status', 'active')
          .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Error al cargar documentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [projectId]);

  const onDrop = (acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => 
      Object.keys(ALLOWED_FILE_TYPES).includes(file.type) || 
      file.name.toLowerCase().endsWith('.dwg') ||
      file.name.toLowerCase().endsWith('.dxf')
    );

    if (validFiles.length !== acceptedFiles.length) {
      toast.error('Algunos archivos no son válidos para diseño');
    }

    if (validFiles.length > 0) {
      setSelectedFiles(validFiles);
      setShowUploadDialog(true);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'application/dwg': ['.dwg'],
      'application/dxf': ['.dxf'],
      'application/octet-stream': ['.dwg', '.dxf']
    },
    multiple: true
  });

  const uploadDocuments = async () => {
    if (!selectedFiles.length) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileExt = file.name.split('.').pop();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${clientId}/${projectId}/design/${uploadDetails.phase}/${Date.now()}_${sanitizedName}`;

        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('project-documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get current user for uploaded_by
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuario no autenticado");

        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!profile) throw new Error("Perfil no encontrado");

        // Save to database
        const { error: dbError } = await supabase
          .from('documents')
          .insert({
            name: file.name,
            file_path: fileName,
            file_type: file.type || 'application/octet-stream',
            file_size: file.size,
            description: uploadDetails.description,
            design_phase: uploadDetails.phase,
            project_id: projectId,
            client_id: clientId,
            department: 'design',
            department_permissions: ['design', 'all'],
            document_status: 'active',
            uploaded_by: profile.id
          });

        if (dbError) throw dbError;

        setUploadProgress(((i + 1) / selectedFiles.length) * 100);
      }

      toast.success(`${selectedFiles.length} documento(s) subido(s) exitosamente`);
      fetchDocuments();
      setShowUploadDialog(false);
      setSelectedFiles([]);
      setUploadDetails({ phase: 'general', description: '' });
    } catch (error) {
      console.error('Error uploading documents:', error);
      toast.error('Error al subir documentos');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const downloadDocument = async (document: DesignDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-documents')
        .download(document.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Error al descargar el archivo');
    }
  };

  const deleteDocument = async (documentId: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({ document_status: 'deleted' })
        .eq('id', documentId);

      if (error) throw error;

      toast.success('Documento eliminado');
      fetchDocuments();
    } catch (error) {
      toast.error('Error al eliminar documento');
    }
  };

  const getFileIcon = (fileType: string, fileName: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (fileType === 'application/pdf') return <FileText className="w-4 h-4 text-red-500" />;
    if (fileName.toLowerCase().endsWith('.dwg') || fileName.toLowerCase().endsWith('.dxf')) {
      return <File className="w-4 h-4 text-blue-500" />;
    }
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const groupDocumentsByPhase = () => {
    return DESIGN_PHASES.map(phase => ({
      ...phase,
      documents: documents.filter(doc => doc.design_phase === phase.value)
    }));
  };

  if (loading) {
    return <div className="flex justify-center items-center h-48">Cargando documentos...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              {isDragActive ? 'Suelta los archivos aquí' : 'Subir documentos de diseño'}
            </h3>
            <p className="text-muted-foreground mb-4">
              Arrastra archivos aquí o haz clic para seleccionar
            </p>
            <p className="text-sm text-muted-foreground">
              Formatos soportados: PDF, Imágenes (JPG, PNG, GIF, WebP), AutoCAD (DWG, DXF)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Documents by Phase */}
      <div className="grid gap-6">
        {groupDocumentsByPhase().map(phase => (
          <Card key={phase.value}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded ${phase.color}`}></div>
                {phase.label}
                <Badge variant="secondary">{phase.documents.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {phase.documents.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay documentos en esta fase
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {phase.documents.map(document => (
                    <Card key={document.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {getFileIcon(document.file_type, document.name)}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{document.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {formatFileSize(document.file_size)}
                            </p>
                            {document.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {document.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <User className="w-3 h-3" />
                              <span>{document.profiles?.full_name || 'Usuario'}</span>
                              <Calendar className="w-3 h-3 ml-2" />
                              <span>{new Date(document.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadDocument(document)}
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteDocument(document.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalles de los Documentos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Archivos seleccionados</Label>
              <div className="mt-2 space-y-1">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="text-sm p-2 bg-muted rounded">
                    {file.name} ({formatFileSize(file.size)})
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="phase">Fase de Diseño</Label>
              <Select
                value={uploadDetails.phase}
                onValueChange={(value) => setUploadDetails(prev => ({...prev, phase: value}))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DESIGN_PHASES.map(phase => (
                    <SelectItem key={phase.value} value={phase.value}>
                      {phase.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                value={uploadDetails.description}
                onChange={(e) => setUploadDetails(prev => ({...prev, description: e.target.value}))}
                placeholder="Describe el contenido de estos documentos..."
              />
            </div>

            {uploading && (
              <div className="space-y-2">
                <Label>Progreso de subida</Label>
                <Progress value={uploadProgress} />
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowUploadDialog(false)}
                disabled={uploading}
              >
                Cancelar
              </Button>
              <Button
                onClick={uploadDocuments}
                disabled={uploading}
              >
                {uploading ? 'Subiendo...' : 'Subir Documentos'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};