import React, { useState, useEffect } from "react";
import { DragDropUploader } from "@/components/ui/drag-drop-uploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, 
  Image, 
  Trash2, 
  Download, 
  Eye,
  Upload,
  FolderOpen
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface DesignDocument {
  id: string;
  name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  description?: string;
  design_phase?: string;
  created_at: string;
  uploader_name: string;
}

interface DesignDocumentUploaderProps {
  projectId: string;
  teamMembers: any[];
}

const DESIGN_FILE_TYPES = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/gif': 'GIF',
  'application/dwg': 'DWG',
  'application/dxf': 'DXF',
  'application/zip': 'ZIP',
  'image/svg+xml': 'SVG'
};

const DESIGN_PHASES = [
  { value: 'zonificacion', label: 'Zonificación' },
  { value: 'volumetria', label: 'Volumetría' },
  { value: 'acabados', label: 'Acabados' },
  { value: 'renders', label: 'Renders' },
  { value: 'planos_finales', label: 'Planos Finales' },
  { value: 'general', label: 'General' }
];

export function DesignDocumentUploader({ projectId, teamMembers }: DesignDocumentUploaderProps) {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<DesignDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<string>('general');
  const [documentName, setDocumentName] = useState('');
  const [documentDescription, setDocumentDescription] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    fetchDesignDocuments();
  }, [projectId]);

  const fetchDesignDocuments = async () => {
    setLoading(true);
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

      const processedDocuments: DesignDocument[] = data?.map(doc => ({
        id: doc.id,
        name: doc.name,
        file_path: doc.file_path,
        file_type: doc.file_type,
        file_size: doc.file_size,
        description: doc.description,
        design_phase: doc.design_phase,
        created_at: doc.created_at,
        uploader_name: doc.profiles?.full_name || 'Usuario desconocido'
      })) || [];

      setDocuments(processedDocuments);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los documentos de diseño",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
    if (files.length > 0) {
      setShowUploadDialog(true);
    }
  };

  const uploadDocuments = async () => {
    if (selectedFiles.length === 0 || !documentName.trim()) {
      toast({
        title: "Error",
        description: "Selecciona archivos y proporciona un nombre",
        variant: "destructive"
      });
      return;
    }

    // Check if user is architect or admin
    const hasPermission = teamMembers.some(member => 
      member.role === 'architect' || member.role === 'project_manager'
    );

    if (!hasPermission) {
      toast({
        title: "Error",
        description: "Solo arquitectos y gerentes de proyecto pueden subir documentos de diseño",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Perfil no encontrado");

      // Get client_id from the project
      const { data: projectData, error: projectError } = await supabase
        .from("client_projects")
        .select("client_id")
        .eq("id", projectId)
        .single();

      if (projectError || !projectData) throw new Error("No se pudo obtener información del proyecto");

      for (const file of selectedFiles) {
        // Upload file to storage with sanitized filename
        const fileExt = file.name.split('.').pop();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${projectData.client_id}/${projectId}/${Date.now()}_${sanitizedName}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('project-documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Save document record
        const { error: dbError } = await supabase
          .from('documents')
          .insert({
            project_id: projectId,
            client_id: projectData.client_id,
            name: `${documentName} - ${file.name}`,
            file_path: uploadData.path,
            file_type: file.type,
            file_size: file.size,
            description: documentDescription || null,
            department: 'diseño',
            design_phase: selectedPhase,
            uploaded_by: profile.id,
            document_status: 'active',
            department_permissions: ['design', 'admin']
          });

        if (dbError) throw dbError;
      }

      toast({
        title: "Documentos subidos",
        description: `${selectedFiles.length} documento(s) de diseño subido(s) exitosamente`
      });

      // Reset form and refresh documents
      setSelectedFiles([]);
      setDocumentName('');
      setDocumentDescription('');
      setSelectedPhase('general');
      setShowUploadDialog(false);
      fetchDesignDocuments();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al subir documentos",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const downloadDocument = async (doc: DesignDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-documents')
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo descargar el documento",
        variant: "destructive"
      });
    }
  };

  const deleteDocument = async (documentId: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({ document_status: 'deleted' })
        .eq('id', documentId);

      if (error) throw error;

      setDocuments(documents.filter(doc => doc.id !== documentId));
      toast({
        title: "Documento eliminado",
        description: "El documento ha sido eliminado"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el documento",
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="h-5 w-5 text-blue-500" />;
    }
    return <FileText className="h-5 w-5 text-gray-500" />;
  };

  const groupDocumentsByPhase = () => {
    const grouped = documents.reduce((acc, doc) => {
      const phase = doc.design_phase || 'general';
      if (!acc[phase]) acc[phase] = [];
      acc[phase].push(doc);
      return acc;
    }, {} as Record<string, DesignDocument[]>);

    return grouped;
  };

  const groupedDocuments = groupDocumentsByPhase();

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Subir Documentos de Diseño
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DragDropUploader
            onFilesSelected={handleFilesSelected}
            accept={{
              'application/pdf': ['.pdf'],
              'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.svg'],
              'application/dwg': ['.dwg'],
              'application/dxf': ['.dxf'],
              'application/zip': ['.zip']
            }}
            multiple={true}
            maxSize={50 * 1024 * 1024} // 50MB
            showPreview={true}
          />
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-md" aria-describedby="upload-dialog-description">
          <DialogHeader>
            <DialogTitle>Detalles del Documento</DialogTitle>
          </DialogHeader>
          <div id="upload-dialog-description" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="document-name">Nombre del Documento *</Label>
              <Input
                id="document-name"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="Ej: Planos Arquitectónicos Nivel 1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="design-phase">Fase de Diseño</Label>
              <Select value={selectedPhase} onValueChange={setSelectedPhase}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DESIGN_PHASES.map((phase) => (
                    <SelectItem key={phase.value} value={phase.value}>
                      {phase.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción (Opcional)</Label>
              <Textarea
                id="description"
                value={documentDescription}
                onChange={(e) => setDocumentDescription(e.target.value)}
                placeholder="Describe el contenido del documento..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={uploadDocuments} disabled={uploading}>
                {uploading ? "Subiendo..." : "Subir Documentos"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Documents by Phase */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          Documentos por Fase
        </h3>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {DESIGN_PHASES.map((phase) => {
              const phaseDocuments = groupedDocuments[phase.value] || [];
              
              return (
                <Card key={phase.value}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{phase.label}</CardTitle>
                      <Badge variant="outline">
                        {phaseDocuments.length} documento(s)
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {phaseDocuments.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">
                        No hay documentos en esta fase
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {phaseDocuments.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3 flex-1">
                              {getFileIcon(doc.file_type)}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium truncate">{doc.name}</h4>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span>{formatFileSize(doc.file_size)}</span>
                                  <span>Por: {doc.uploader_name}</span>
                                  <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                                </div>
                                {doc.description && (
                                  <p className="text-sm text-muted-foreground mt-1 truncate">
                                    {doc.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadDocument(doc)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteDocument(doc.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}