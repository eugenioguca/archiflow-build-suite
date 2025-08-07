import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DragDropUploader } from '@/components/ui/drag-drop-uploader';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  Upload, 
  Download, 
  Eye, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface FiscalDocument {
  id: string;
  document_name: string;
  document_type: string;
  file_path: string;
  file_type?: string | null;
  file_size?: number | null;
  uploaded_by: string;
  created_at: string;
  status?: string;
}

interface ClientFiscalDocumentsProps {
  projectId: string;
  clientId: string;
  isClientView?: boolean;
}

const requiredDocuments = [
  {
    type: 'constancia_situacion_fiscal',
    name: 'Constancia de Situación Fiscal',
    description: 'Documento emitido por el SAT'
  },
  {
    type: 'identificacion_oficial',
    name: 'Identificación Oficial',
    description: 'INE, Pasaporte o Cédula Profesional'
  },
  {
    type: 'comprobante_domicilio',
    name: 'Comprobante de Domicilio',
    description: 'No mayor a 3 meses'
  },
  {
    type: 'acta_constitutiva',
    name: 'Acta Constitutiva (Si aplica)',
    description: 'Para personas morales'
  }
];

export const ClientFiscalDocuments: React.FC<ClientFiscalDocumentsProps> = ({
  projectId,
  clientId,
  isClientView = false
}) => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<FiscalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [projectId, clientId]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          id,
          name,
          category,
          file_path,
          file_type,
          file_size,
          uploaded_by,
          created_at
        `)
        .eq('client_id', clientId)
        .eq('project_id', projectId)
        .eq('document_status', 'active')
        .eq('department', 'fiscal')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to match interface
      const transformedDocs = (data || []).map(doc => ({
        id: doc.id,
        document_name: doc.name,
        document_type: doc.category,
        file_path: doc.file_path,
        file_type: doc.file_type,
        file_size: doc.file_size,
        uploaded_by: doc.uploaded_by,
        created_at: doc.created_at
      }));
      
      setDocuments(transformedDocs);
    } catch (error: any) {
      console.error('Error fetching fiscal documents:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los documentos fiscales"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList, documentType: string) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setUploading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Perfil no encontrado');

      // Upload file to storage - using unified bucket
      const fileExt = file.name.split('.').pop();
      const fileName = `${clientId}/${projectId}/fiscal/${documentType}_${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Save document record in unified table
      const { error: insertError } = await supabase
        .from('documents')
        .insert([{
          client_id: clientId,
          project_id: projectId,
          name: file.name,
          category: documentType,
          file_path: uploadData.path,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: profile.id,
          department: 'fiscal',
          department_permissions: ['all'],
          document_status: 'active'
        }]);

      if (insertError) throw insertError;

      toast({
        title: "Documento subido",
        description: "El documento fiscal ha sido cargado correctamente"
      });

      fetchDocuments();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo subir el documento"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-documents')
        .download(filePath);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo descargar el documento"
      });
    }
  };

  const handleView = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-documents')
        .createSignedUrl(filePath, 300); // 5 minutes

      if (error) throw error;

      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo abrir el documento"
      });
    }
  };

  const handleDelete = async (documentId: string, filePath: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este documento?')) return;

    try {
      // Delete from storage
      await supabase.storage
        .from('project-documents')
        .remove([filePath]);

      // Delete from database (soft delete)
      const { error } = await supabase
        .from('documents')
        .update({ document_status: 'deleted' })
        .eq('id', documentId);

      if (error) throw error;

      toast({
        title: "Documento eliminado",
        description: "El documento ha sido eliminado correctamente"
      });

      fetchDocuments();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el documento"
      });
    }
  };

  const getDocumentStatus = (docType: string) => {
    const hasDoc = documents.some(doc => doc.document_type === docType);
    return hasDoc ? 'uploaded' : 'pending';
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documentos Fiscales Requeridos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requiredDocuments.map((reqDoc) => {
              const status = getDocumentStatus(reqDoc.type);
              const uploadedDoc = documents.find(doc => doc.document_type === reqDoc.type);
              
              return (
                <div key={reqDoc.type} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium">{reqDoc.name}</h4>
                      <p className="text-sm text-muted-foreground">{reqDoc.description}</p>
                    </div>
                    <Badge variant={status === 'uploaded' ? 'default' : 'secondary'}>
                      {status === 'uploaded' ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Subido
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3 mr-1" />
                          Pendiente
                        </>
                      )}
                    </Badge>
                  </div>

                  {uploadedDoc && (
                    <div className="mt-3 p-3 bg-muted/50 rounded-md">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{uploadedDoc.document_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(uploadedDoc.file_size)} • {format(new Date(uploadedDoc.created_at), 'dd MMM yyyy', { locale: es })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleView(uploadedDoc.file_path)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownload(uploadedDoc.file_path, uploadedDoc.document_name)}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          {isClientView && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(uploadedDoc.id, uploadedDoc.file_path)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {status === 'pending' && (
                    <div className="mt-3">
                      <DragDropUploader
                        onFilesSelected={(files) => handleFileUpload(files as any, reqDoc.type)}
                        accept={{
                          'application/pdf': ['.pdf'],
                          'image/jpeg': ['.jpg', '.jpeg'],
                          'image/png': ['.png']
                        }}
                        maxSize={10 * 1024 * 1024}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Additional Documents */}
      {documents.filter(doc => !requiredDocuments.some(req => req.type === doc.document_type)).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentos Adicionales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documents
                .filter(doc => !requiredDocuments.some(req => req.type === doc.document_type))
                .map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{doc.document_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(doc.file_size)} • {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: es })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleView(doc.file_path)}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownload(doc.file_path, doc.document_name)}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      {isClientView && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(doc.id, doc.file_path)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Additional Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Subir Documento Adicional
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DragDropUploader
            onFilesSelected={(files) => handleFileUpload(files as any, 'additional')}
            accept={{
              'application/pdf': ['.pdf'],
              'image/jpeg': ['.jpg', '.jpeg'],
              'image/png': ['.png']
            }}
            maxSize={10 * 1024 * 1024}
          />
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Estos documentos serán compartidos con el equipo de ventas y finanzas. 
              Formatos aceptados: PDF, JPG, PNG. Tamaño máximo: 10MB.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};