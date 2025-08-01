import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Download, Eye, FileText, Upload, Users, Building, Paintbrush, Hammer, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { DragDropUploader } from '@/components/ui/drag-drop-uploader';
import { DocumentViewer } from '@/components/DocumentViewer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { uploadFileToStorage, getFileUrl, downloadFile, getFileType } from '@/lib/fileUtils';

interface ProjectDocument {
  id: string;
  name: string;
  file_path: string;
  department: string;
  uploaded_by: string;
  created_at: string;
  file_type: string;
  file_size: number;
  description: string;
  uploader_name?: string;
  inherited_from_client?: boolean;
  original_client_document_id?: string;
}

interface ProjectDocumentManagerProps {
  clientId: string;
  clientName: string;
  currentDepartment: 'clients' | 'sales' | 'design' | 'construction' | 'finances';
}

const DEPARTMENT_CONFIG = {
  clients: {
    label: 'Información del Cliente',
    icon: Users,
    color: 'bg-blue-500',
    description: 'Documentos de identificación y datos personales'
  },
  sales: {
    label: 'Ventas',
    icon: Building,
    color: 'bg-green-500',
    description: 'Contratos, propuestas y documentos comerciales'
  },
  design: {
    label: 'Diseño',
    icon: Paintbrush,
    color: 'bg-purple-500',
    description: 'Planos, renders y especificaciones técnicas'
  },
  construction: {
    label: 'Construcción',
    icon: Hammer,
    color: 'bg-orange-500',
    description: 'Permisos, avances de obra y modificaciones'
  },
  finances: {
    label: 'Finanzas',
    icon: Calculator,
    color: 'bg-red-500',
    description: 'Facturas, comprobantes de pago y estados de cuenta'
  }
};

export function ProjectDocumentManager({ clientId, clientName, currentDepartment }: ProjectDocumentManagerProps) {
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<{ url: string; name: string; type: string } | null>(null);

  useEffect(() => {
    fetchProjectAndDocuments();
  }, [clientId]);

  const fetchProjectAndDocuments = async () => {
    try {
      setLoading(true);
      
      // Buscar el proyecto del cliente
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('client_id', clientId)
        .single();

      if (projectError && projectError.code !== 'PGRST116') {
        console.error('Error fetching project:', projectError);
        return;
      }

      if (!project) {
        // Si no hay proyecto, no hay documentos que mostrar aún
        setDocuments([]);
        setProjectId(null);
        return;
      }

      setProjectId(project.id);

      // Obtener documentos acumulativos usando la función de base de datos
      const { data: projectDocuments, error: docsError } = await supabase
        .rpc('get_project_cumulative_documents', {
          project_id_param: project.id,
          user_department: currentDepartment
        });

      if (docsError) {
        console.error('Error fetching documents:', docsError);
        toast.error('Error al cargar documentos');
        return;
      }

      setDocuments(projectDocuments || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar información del proyecto');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: File[]) => {
    if (!projectId) {
      toast.error('Primero debe existir un proyecto para subir documentos');
      return;
    }

    setUploading(true);
    try {
      for (const file of files) {
        const filePath = `projects/${projectId}/${currentDepartment}/${Date.now()}-${file.name}`;
        
        // Subir archivo a storage
        const { filePath: uploadedPath } = await uploadFileToStorage(file, {
          bucket: 'project-documents',
          folder: `projects/${projectId}/${currentDepartment}`
        });

        // Obtener el ID del usuario actual
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .single();

        if (!profile) {
          throw new Error('No se pudo obtener el perfil del usuario');
        }

        // Guardar información en la base de datos
        const { error: dbError } = await supabase
          .from('documents')
          .insert({
            name: file.name,
            file_path: uploadedPath,
            file_type: getFileType(file.name).type,
            file_size: file.size,
            description: `Documento subido por ${currentDepartment}`,
            project_id: projectId,
            client_id: clientId,
            uploaded_by: profile.id,
            department: currentDepartment,
            department_permissions: ['all'] as string[], // Visible para todos los departamentos
          });

        if (dbError) {
          console.error('Error saving to database:', dbError);
          throw dbError;
        }
      }

      toast.success(`${files.length} documento(s) subido(s) exitosamente`);
      setUploadDialogOpen(false);
      await fetchProjectAndDocuments();
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Error al subir archivos');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadDocument = async (document: ProjectDocument) => {
    try {
      // Use correct bucket based on document origin
      const bucket = document.inherited_from_client ? 'client-documents' : 'project-documents';
      const { url } = await getFileUrl(document.file_path, bucket);
      await downloadFile(url, document.name);
      toast.success('Descarga iniciada');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Error al descargar documento');
    }
  };

  const handleViewDocument = async (document: ProjectDocument) => {
    try {
      // Use correct bucket based on document origin
      const bucket = document.inherited_from_client ? 'client-documents' : 'project-documents';
      const { url } = await getFileUrl(document.file_path, bucket);
      setSelectedDocument({
        url,
        name: document.name,
        type: document.file_type
      });
    } catch (error) {
      console.error('Error viewing document:', error);
      toast.error('Error al visualizar documento');
    }
  };

  const getDocumentsByDepartment = (department: string) => {
    return documents.filter(doc => doc.department === department && !doc.inherited_from_client);
  };

  const getInheritedDocuments = () => {
    return documents.filter(doc => doc.inherited_from_client);
  };

  const canUploadToDepartment = (department: string) => {
    return department === currentDepartment;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expediente del Proyecto - {clientName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Cargando expediente...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!projectId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expediente del Proyecto - {clientName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay proyecto activo</h3>
            <p className="text-muted-foreground">
              El expediente se creará automáticamente cuando el cliente pase a la fase "En Contacto"
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Expediente Acumulativo - {clientName}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Vista completa del expediente del proyecto por departamentos
          </p>
        </CardHeader>
        <CardContent>
          {/* Inherited Documents Section */}
          {getInheritedDocuments().length > 0 && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h3 className="font-medium text-amber-800 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documentos Heredados del Cliente
              </h3>
              <p className="text-sm text-amber-700 mb-3">
                Estos documentos fueron subidos durante la fase de lead y se heredaron automáticamente al proyecto.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {getInheritedDocuments().map((document) => (
                  <div key={document.id} className="flex items-center justify-between p-3 bg-white border border-amber-200 rounded">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-amber-600" />
                      <div>
                        <h4 className="font-medium text-sm">{document.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          Heredado • {new Date(document.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDocument(document)}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadDocument(document)}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Tabs defaultValue="clients" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              {Object.entries(DEPARTMENT_CONFIG).map(([key, config]) => {
                const Icon = config.icon;
                const documentsCount = getDocumentsByDepartment(key).length;
                
                return (
                  <TabsTrigger key={key} value={key} className="flex items-center gap-1">
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{config.label}</span>
                    {documentsCount > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {documentsCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {Object.entries(DEPARTMENT_CONFIG).map(([departmentKey, config]) => {
              const Icon = config.icon;
              const departmentDocs = getDocumentsByDepartment(departmentKey);
              const canUpload = canUploadToDepartment(departmentKey);

              return (
                <TabsContent key={departmentKey} value={departmentKey} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${config.color} text-white`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium">{config.label}</h3>
                        <p className="text-sm text-muted-foreground">{config.description}</p>
                      </div>
                    </div>
                    
                    {canUpload && (
                      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                        <DialogTrigger asChild>
                          <Button>
                            <Upload className="h-4 w-4 mr-2" />
                            Subir Documento
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Subir Documentos - {config.label}</DialogTitle>
                          </DialogHeader>
                          <DragDropUploader
                            onFilesSelected={handleFileUpload}
                            accept={{
                              'application/pdf': ['.pdf'],
                              'application/msword': ['.doc'],
                              'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                              'image/*': ['.jpg', '.jpeg', '.png'],
                              'application/vnd.ms-excel': ['.xls'],
                              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
                            }}
                            multiple={true}
                            maxSize={10 * 1024 * 1024} // 10MB
                            showPreview={true}
                          />
                          {uploading && (
                            <div className="text-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                              <p className="text-sm text-muted-foreground">Subiendo documentos...</p>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>

                  <div className="space-y-3">
                    {departmentDocs.length === 0 ? (
                      <div className="text-center p-8 border-2 border-dashed border-muted rounded-lg">
                        <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">
                          No hay documentos en esta sección
                        </p>
                      </div>
                    ) : (
                      departmentDocs.map((document) => (
                        <Card key={document.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <h4 className="font-medium">{document.name}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    Subido por {document.uploader_name} • {new Date(document.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewDocument(document)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownloadDocument(document)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      {selectedDocument && (
        <DocumentViewer
          isOpen={!!selectedDocument}
          onClose={() => setSelectedDocument(null)}
          documentUrl={selectedDocument.url}
          documentName={selectedDocument.name}
          fileType={selectedDocument.type}
        />
      )}
    </div>
  );
}