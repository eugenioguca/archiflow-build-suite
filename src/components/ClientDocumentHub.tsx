import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClientDocumentUploader } from './ClientDocumentUploader';

import { ClientInvoiceViewer } from './ClientInvoiceViewer';
import { DocumentViewer } from './DocumentViewer';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Upload, CreditCard, Receipt, Folder, Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ClientDocument {
  id: string;
  document_name: string;
  document_type: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
  source?: string;
}

interface ClientDocumentHubProps {
  clientId: string;
  projectId: string;
  compact?: boolean;
  previewDocuments?: any[];
}

export const ClientDocumentHub = ({ clientId, projectId, compact = false, previewDocuments }: ClientDocumentHubProps) => {
  
  
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<ClientDocument | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        // If we have preview documents, use them directly
        if (previewDocuments) {
          const transformedDocs = previewDocuments.map(doc => ({
            id: doc.id,
            document_name: doc.name,
            document_type: doc.category || 'general',
            file_path: doc.file_path,
            file_type: doc.file_type || 'application/pdf',
            file_size: doc.file_size || 0,
            created_at: doc.created_at,
            source: doc.category === 'contract' || doc.category === 'fiscal' ? 'project_field' : 'project'
          }));
          setDocuments(transformedDocs);
          setLoading(false);
          return;
        }

        // Use the unified documents function for complete document view
        const { data: unifiedDocuments, error: docsError } = await supabase
          .rpc('get_unified_project_documents', {
            project_id_param: projectId
          });

        if (docsError) {
          console.error('Error fetching unified documents:', docsError);
        }

        // Transform unified documents to the expected format
        const allDocuments: ClientDocument[] = (unifiedDocuments || []).map(doc => ({
          id: doc.id,
          document_name: doc.file_name,
          document_type: doc.department || 'general',
          file_path: doc.file_path,
          file_type: doc.file_type || 'application/pdf',
          file_size: doc.file_size || 0,
          created_at: doc.created_at,
          source: 'project'
        }));

        // Also get project field documents (contract, fiscal documents)
        const { data: projectData } = await supabase
          .from('client_projects')
          .select('contract_url, constancia_situacion_fiscal_url, created_at')
          .eq('id', projectId)
          .single();

        if (projectData) {
          if (projectData.contract_url) {
            allDocuments.push({
              id: `contract-${projectId}`,
              document_name: 'Contrato Firmado',
              document_type: 'contract',
              file_path: projectData.contract_url,
              file_type: 'application/pdf',
              file_size: 0,
              created_at: projectData.created_at,
              source: 'project_field'
            });
          }
          
          if (projectData.constancia_situacion_fiscal_url) {
            allDocuments.push({
              id: `fiscal-${projectId}`,
              document_name: 'Constancia de Situación Fiscal',
              document_type: 'fiscal',
              file_path: projectData.constancia_situacion_fiscal_url,
              file_type: 'application/pdf',
              file_size: 0,
              created_at: projectData.created_at,
              source: 'project_field'
            });
          }
        }

        setDocuments(allDocuments);
      } catch (error) {
        console.error('Error fetching documents:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los documentos",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();

    // Only set up real-time subscriptions if not in preview mode
    if (!previewDocuments) {
      const channel = supabase
        .channel('client-documents-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'client_documents',
            filter: `client_id=eq.${clientId}`
          },
          () => {
            fetchDocuments();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [clientId, projectId, toast, previewDocuments]);

  const getDocumentTypeIcon = (type: string) => {
    switch (type) {
      case 'contract':
        return <FileText className="h-4 w-4" />;
      case 'identification':
        return <Receipt className="h-4 w-4" />;
      case 'fiscal':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <Folder className="h-4 w-4" />;
    }
  };

  const getDocumentTypeName = (type: string) => {
    const typeMap = {
      'contract': 'Contrato',
      'identification': 'Identificación',
      'fiscal': 'Documento Fiscal',
      'payment_proof': 'Comprobante de Pago',
      'other': 'Otro'
    };
    return typeMap[type as keyof typeof typeMap] || type;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleView = async (document: ClientDocument) => {
    try {
      // Import the document utilities
      const { openDocumentInNewTab } = await import('@/lib/documentUtils');
      
      // Try to open document in new tab first
      const result = await openDocumentInNewTab(document.file_path, document.source);
      
      if (result.success) {
        // Success: document opened in new tab, show toast but DON'T open modal
        toast({
          title: "Documento abierto",
          description: "El documento se ha abierto en una nueva pestaña",
        });
        return; // Exit early, don't open modal
      }
      
      // Only if opening in new tab fails, use modal as fallback
      console.warn('Failed to open in new tab, falling back to modal:', result.error);
      
      const { getCachedDocumentUrl } = await import('@/lib/documentUtils');
      const urlResult = await getCachedDocumentUrl(document.file_path, document.source);
      
      if (urlResult.url) {
        setSelectedDocument({
          ...document,
          file_path: urlResult.url
        });
        setViewerOpen(true);
        
        toast({
          title: "Documento abierto en modal",
          description: "Se abrió en modal como alternativa",
        });
      } else {
        throw new Error(result.error || 'No se pudo abrir el documento');
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      toast({
        title: "Error",
        description: "No se pudo abrir el documento para visualización",
        variant: "destructive"
      });
    }
  };

  const handleDownload = async (document: ClientDocument) => {
    try {
      // Import the document utilities
      const { downloadDocument } = await import('@/lib/documentUtils');
      
      // Download using the smart document downloader
      const result = await downloadDocument(
        document.file_path, 
        document.document_name,
        document.source
      );

      if (result.success) {
        toast({
          title: "Descarga exitosa",
          description: `Se ha descargado ${document.document_name}`
        });
      } else {
        throw new Error(result.error || 'Error desconocido al descargar');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Error",
        description: "No se pudo descargar el documento",
        variant: "destructive"
      });
    }
  };

  const handleRefreshDocuments = async () => {
    setLoading(true);
    try {
      // Usar la función SQL unificada para obtener todos los documentos
      const { data: allDocuments, error } = await supabase
        .rpc('get_unified_project_documents', {
          project_id_param: projectId
        });

      if (error) {
        console.error('Error fetching documents:', error);
        throw error;
      }

      // Transform to expected format
      const transformedDocs = (allDocuments || []).map(doc => ({
        id: doc.id,
        document_name: doc.file_name,
        document_type: doc.department || 'general',
        file_path: doc.file_path,
        file_type: doc.file_type || 'application/pdf',
        file_size: doc.file_size || 0,
        created_at: doc.created_at,
        source: 'project'
      }));

      setDocuments(transformedDocs);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "No se pudieron actualizar los documentos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className={compact ? '' : ''}>
        <CardHeader className={compact ? 'pb-3' : ''}>
          <CardTitle className="flex items-center gap-2">
            <Folder className={compact ? "h-4 w-4" : "h-5 w-5"} />
            <span className={compact ? "text-sm" : ""}>Centro de Documentos</span>
            {compact && documents.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {documents.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className={compact ? 'pt-0' : ''}>
          <Tabs defaultValue="documents" className="w-full">
            <TabsList className={`grid w-full ${compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
              <TabsTrigger value="documents" className="flex items-center gap-1 text-xs md:text-sm">
                <FileText className="h-3 w-3 md:h-4 md:w-4" />
                <span className={compact ? 'text-xs' : 'hidden sm:inline'}>Documentos</span>
                <span className={compact ? 'hidden' : 'sm:hidden'}>Docs</span>
              </TabsTrigger>
              {!compact && (
                <>
                  <TabsTrigger value="upload" className="flex items-center gap-1 text-xs md:text-sm">
                    <Upload className="h-3 w-3 md:h-4 md:w-4" />
                    Subir
                  </TabsTrigger>
                  <TabsTrigger value="invoices" className="flex items-center gap-1 text-xs md:text-sm">
                    <Receipt className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="hidden sm:inline">Facturas</span>
                    <span className="sm:hidden">Fact</span>
                  </TabsTrigger>
                </>
              )}
              {compact && (
                <TabsTrigger value="upload" className="flex items-center gap-1 text-xs">
                  <Upload className="h-3 w-3" />
                  <span className="text-xs">Subir</span>
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="documents" className={compact ? "mt-4" : "mt-6"}>
              {loading ? (
                <div className={`text-center ${compact ? 'py-4' : 'py-8'}`}>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Cargando documentos...</p>
                </div>
              ) : documents.length === 0 ? (
                <div className={`text-center ${compact ? 'py-4' : 'py-8'}`}>
                  <Folder className={`${compact ? 'h-8 w-8' : 'h-12 w-12'} text-muted-foreground mx-auto mb-4`} />
                  <p className={`text-muted-foreground ${compact ? 'text-sm' : ''}`}>No hay documentos disponibles.</p>
                  {!compact && <p className="text-sm text-muted-foreground">Usa la pestaña "Subir" para agregar documentos.</p>}
                </div>
              ) : (
                <ScrollArea className={compact ? "h-[300px]" : "h-[400px]"}>
                  <div className="space-y-2 pr-4">
                    {documents.slice(0, compact ? 6 : documents.length).map((doc) => (
                      <Card key={doc.id} className={`border-l-4 border-l-primary ${compact ? 'shadow-sm' : ''}`}>
                        <CardContent className={compact ? "p-3" : "p-3 md:p-4"}>
                          <div className="flex flex-col gap-3">
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {getDocumentTypeIcon(doc.document_type)}
                                <h4 className={`font-semibold ${compact ? 'text-sm' : 'text-sm md:text-base'} truncate flex-1 min-w-0`}>
                                  {doc.document_name}
                                </h4>
                                <Badge variant="outline" className="text-xs flex-shrink-0">
                                  {getDocumentTypeName(doc.document_type)}
                                </Badge>
                                {doc.source && (
                                  <Badge variant="secondary" className="text-xs">
                                    {doc.source === 'sales' ? 'Ventas' : 'Proyecto'}
                                  </Badge>
                                )}
                              </div>
                              
                              <div className={`${compact ? 'text-xs' : 'text-xs md:text-sm'} text-muted-foreground flex flex-wrap gap-x-3 gap-y-1`}>
                                <span>Tamaño: {formatFileSize(doc.file_size)}</span>
                                <span>Fecha: {format(new Date(doc.created_at), 'dd/MM/yyyy', { locale: es })}</span>
                                {doc.file_type && !compact && (
                                  <span>Tipo: {doc.file_type}</span>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleView(doc)}
                                className="flex-1 flex items-center gap-1"
                              >
                                <Eye className="h-3 w-3" />
                                <span className={compact ? 'text-xs' : 'text-sm'}>Abrir</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(doc)}
                                className="flex-1 flex items-center gap-1"
                              >
                                <Download className="h-3 w-3" />
                                <span className={compact ? 'text-xs' : 'text-sm'}>Descargar</span>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {compact && documents.length > 6 && (
                      <div className="text-center text-xs text-muted-foreground pt-2">
                        +{documents.length - 6} documentos más
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            {!compact && (
              <>
                <TabsContent value="upload" className="mt-6">
                  <ClientDocumentUploader 
                    clientId={clientId} 
                    projectId={projectId}
                    onUploadComplete={handleRefreshDocuments}
                  />
                </TabsContent>


                <TabsContent value="invoices" className="mt-6">
                  <ClientInvoiceViewer 
                    clientId={clientId} 
                    projectId={projectId}
                  />
                </TabsContent>
              </>
            )}

            {compact && (
              <TabsContent value="upload" className="mt-4">
                <ClientDocumentUploader 
                  clientId={clientId} 
                  projectId={projectId}
                  onUploadComplete={handleRefreshDocuments}
                />
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Document Viewer Modal */}
      {selectedDocument && (
        <DocumentViewer
          isOpen={viewerOpen}
          onClose={() => {
            setViewerOpen(false);
            setSelectedDocument(null);
          }}
          documentUrl={selectedDocument.file_path}
          documentName={selectedDocument.document_name}
          fileType={selectedDocument.file_type || ''}
        />
      )}
    </>
  );
};