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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documentos
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Subir
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Pagos
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Facturas
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
              <div className="space-y-4">
                {documents.map((doc) => (
                  <Card key={doc.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            {getDocumentTypeIcon(doc.document_type)}
                            <h4 className="font-semibold">{doc.document_name}</h4>
                            <Badge variant="outline">
                              {getDocumentTypeName(doc.document_type)}
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>Tamaño: {formatFileSize(doc.file_size)}</p>
                            <p>Fecha: {format(new Date(doc.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                            <p>Tipo: {doc.file_type}</p>
                          </div>
                        </div>

                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(doc)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
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