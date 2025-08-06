import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ClientDocumentUploader } from './ClientDocumentUploader';
import { ClientPaymentProofUploader } from './ClientPaymentProofUploader';
import { ClientInvoiceViewer } from './ClientInvoiceViewer';
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
}

export const ClientDocumentHub = ({ clientId, projectId }: ClientDocumentHubProps) => {
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        // Fetch from multiple document sources
        const promises = [
          // Client documents from sales module
          supabase
            .from('client_documents')
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false }),
          
          // Project documents from design/construction modules
          supabase
            .from('documents')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false }),
          
          // Project fields with document URLs
          supabase
            .from('client_projects')
            .select('contract_url, constancia_situacion_fiscal_url, created_at')
            .eq('id', projectId)
            .single()
        ];

        const [clientDocsResult, projectDocsResult, projectFieldsResult] = await Promise.all(promises);

        // Start with empty array
        const allDocuments: ClientDocument[] = [];

        // Add client documents
        if (clientDocsResult.data && Array.isArray(clientDocsResult.data)) {
          allDocuments.push(...clientDocsResult.data.map(doc => ({
            id: doc.id,
            document_name: doc.document_name,
            document_type: doc.document_type,
            file_path: doc.file_path,
            file_type: doc.file_type || 'application/pdf',
            file_size: doc.file_size || 0,
            created_at: doc.created_at,
            source: 'sales'
          })));
        }

        // Add project documents
        if (projectDocsResult.data && Array.isArray(projectDocsResult.data)) {
          allDocuments.push(...projectDocsResult.data.map(doc => ({
            id: doc.id,
            document_name: doc.name,
            document_type: doc.department || 'project',
            file_path: doc.file_path,
            file_type: doc.file_type || 'application/pdf',
            file_size: doc.file_size || 0,
            created_at: doc.created_at,
            source: 'project'
          })));
        }

        // Add project field documents if they exist
        if (projectFieldsResult.data) {
          const projectData = projectFieldsResult.data as any;
          
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

    // Real-time subscription for document updates
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
  }, [clientId, projectId, toast]);

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

  const handleDownload = async (document: ClientDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('client-documents')
        .download(document.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.document_name;
      window.document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      window.document.body.removeChild(a);

      toast({
        title: "Descarga exitosa",
        description: `Se ha descargado ${document.document_name}`
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Error",
        description: "No se pudo descargar el documento",
        variant: "destructive"
      });
    }
  };

  const handleRefreshDocuments = () => {
    setLoading(true);
    const fetchDocuments = async () => {
      try {
        const { data, error } = await supabase
          .from('client_documents')
          .select('*')
          .eq('client_id', clientId)
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setDocuments(data || []);
      } catch (error) {
        console.error('Error fetching documents:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDocuments();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Folder className="h-5 w-5" />
          Centro de Documentos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="documents" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="documents" className="flex items-center gap-1 text-xs md:text-sm">
              <FileText className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Documentos</span>
              <span className="sm:hidden">Docs</span>
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-1 text-xs md:text-sm">
              <Upload className="h-3 w-3 md:h-4 md:w-4" />
              Subir
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-1 text-xs md:text-sm">
              <CreditCard className="h-3 w-3 md:h-4 md:w-4" />
              Pagos
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex items-center gap-1 text-xs md:text-sm">
              <Receipt className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Facturas</span>
              <span className="sm:hidden">Fact</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="mt-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Cargando documentos...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8">
                <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No hay documentos disponibles.</p>
                <p className="text-sm text-muted-foreground">Usa la pestaña "Subir" para agregar documentos.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <Card key={doc.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-3 md:p-4">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {getDocumentTypeIcon(doc.document_type)}
                            <h4 className="font-semibold text-sm md:text-base truncate flex-1 min-w-0">
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
                          
                          <div className="text-xs md:text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                            <span>Tamaño: {formatFileSize(doc.file_size)}</span>
                            <span>Fecha: {format(new Date(doc.created_at), 'dd/MM/yyyy', { locale: es })}</span>
                            {doc.file_type && (
                              <span>Tipo: {doc.file_type}</span>
                            )}
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(doc)}
                          className="w-full md:w-auto flex-shrink-0"
                        >
                          <Download className="h-4 w-4 mr-2 md:mr-0" />
                          <span className="md:hidden">Descargar</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="mt-6">
            <ClientDocumentUploader 
              clientId={clientId} 
              projectId={projectId}
            />
          </TabsContent>

          <TabsContent value="payments" className="mt-6">
            <ClientPaymentProofUploader 
              clientId={clientId} 
              projectId={projectId}
            />
          </TabsContent>

          <TabsContent value="invoices" className="mt-6">
            <ClientInvoiceViewer 
              clientId={clientId} 
              projectId={projectId}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};