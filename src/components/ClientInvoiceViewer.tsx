import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, Eye, DollarSign, Calendar, Building } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Invoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  status: string;
  issue_date: string;
  due_date: string;
  currency: string;
  client_name?: string;
  project_name?: string;
}

interface ClientInvoiceViewerProps {
  clientId: string;
  projectId: string;
}

export const ClientInvoiceViewer = ({ clientId, projectId }: ClientInvoiceViewerProps) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        // Fetch real invoices from database
        const { data, error } = await supabase
          .from('cfdi_documents')
          .select(`
            id,
            uuid_fiscal,
            folio,
            serie,
            total,
            fecha_emision,
            rfc_receptor,
            status,
            conceptos
          `)
          .eq('client_id', clientId)
          .eq('tipo_comprobante', 'I');

        if (error) {
          console.error('Error fetching invoices:', error);
          setInvoices([]);
        } else {
          // Transform CFDI data to invoice format
          const transformedInvoices = (data || []).map(cfdi => ({
            id: cfdi.id,
            invoice_number: cfdi.serie ? `${cfdi.serie}-${cfdi.folio}` : cfdi.folio || cfdi.uuid_fiscal,
            total_amount: cfdi.total || 0,
            status: cfdi.status === 'active' ? 'issued' : 'cancelled',
            issue_date: cfdi.fecha_emision,
            due_date: cfdi.fecha_emision,
            currency: 'MXN',
            client_name: '',
            project_name: ''
          }));
          setInvoices(transformedInvoices);
        }
      } catch (error) {
        console.error('Error fetching invoices:', error);
        setInvoices([]);
        toast({
          title: "Error",
          description: "No se pudieron cargar las facturas",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [clientId, projectId, toast]);

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'paid': { label: 'Pagada', variant: 'default' as const },
      'pending': { label: 'Pendiente', variant: 'secondary' as const },
      'overdue': { label: 'Vencida', variant: 'destructive' as const },
      'cancelled': { label: 'Cancelada', variant: 'outline' as const }
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'outline' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const formatCurrency = (amount: number, currency: string = 'MXN') => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Facturas del Proyecto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Cargando facturas...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Facturas del Proyecto
        </CardTitle>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay facturas disponibles para este proyecto.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <Card key={invoice.id} className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="space-y-1">
                      <h4 className="font-semibold">Factura #{invoice.invoice_number}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building className="h-4 w-4" />
                        <span>{invoice.project_name}</span>
                      </div>
                    </div>
                    {getStatusBadge(invoice.status)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        <span>Total</span>
                      </div>
                      <p className="font-semibold text-lg">
                        {formatCurrency(invoice.total_amount, invoice.currency)}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Fecha de emisión</span>
                      </div>
                      <p className="font-medium">
                        {format(new Date(invoice.issue_date), 'dd/MM/yyyy', { locale: es })}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Vencimiento</span>
                      </div>
                      <p className="font-medium">
                        {format(new Date(invoice.due_date), 'dd/MM/yyyy', { locale: es })}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        toast({
                          title: "Funcionalidad en desarrollo",
                          description: "La visualización de facturas estará disponible pronto"
                        });
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver factura
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        toast({
                          title: "Funcionalidad en desarrollo", 
                          description: "La descarga de facturas estará disponible pronto"
                        });
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Descargar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};