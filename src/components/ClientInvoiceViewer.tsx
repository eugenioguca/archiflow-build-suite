import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface ElectronicInvoice {
  id: string;
  folio: string;
  serie: string;
  total: number;
  subtotal: number;
  iva: number;
  fecha_emision: string;
  status: string;
  uuid_fiscal: string;
  file_path: string;
  tipo_comprobante: string;
  rfc_receptor: string;
  metodo_pago: string;
  forma_pago: string;
  uso_cfdi: string;
}

interface ClientInvoiceViewerProps {
  clientId: string;
  projectId: string;
}

export const ClientInvoiceViewer = ({ clientId, projectId }: ClientInvoiceViewerProps) => {
  const [invoices, setInvoices] = useState<ElectronicInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchInvoices();
  }, [clientId, projectId]);

  const fetchInvoices = async () => {
    try {
      // Query invoices directly by client_id and project_id
      const { data, error } = await supabase
        .from('electronic_invoices')
        .select(`
          id,
          folio,
          serie,
          total,
          subtotal,
          total_impuestos_trasladados,
          fecha_emision,
          estatus,
          uuid_fiscal,
          pdf_path,
          tipo_comprobante,
          receptor_rfc,
          metodo_pago,
          forma_pago,
          receptor_uso_cfdi
        `)
        .eq('client_id', clientId)
        .eq('project_id', projectId)
        .order('fecha_emision', { ascending: false });

      if (error) {
        console.error('Error fetching invoices:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar las facturas",
          variant: "destructive",
        });
        return;
      }

      // Transform data to match interface
      const transformedInvoices = (data || []).map(invoice => ({
        ...invoice,
        iva: invoice.total_impuestos_trasladados || 0,
        status: invoice.estatus,
        file_path: invoice.pdf_path,
        rfc_receptor: invoice.receptor_rfc,
        uso_cfdi: invoice.receptor_uso_cfdi
      }));

      setInvoices(transformedInvoices);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = async (invoice: ElectronicInvoice) => {
    try {
      if (!invoice.file_path) {
        toast({
          title: "Error",
          description: "Archivo no disponible para descarga",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.storage
        .from('project-documents')
        .download(invoice.file_path);

      if (error) {
        throw error;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoice.serie || ''}-${invoice.folio || 'factura'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Descarga exitosa",
        description: "La factura se ha descargado correctamente",
      });
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast({
        title: "Error",
        description: "No se pudo descargar la factura",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Activa', variant: 'default' as const },
      paid: { label: 'Pagada', variant: 'default' as const },
      cancelled: { label: 'Cancelada', variant: 'destructive' as const },
      pending: { label: 'Pendiente', variant: 'secondary' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-3 bg-muted rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sin facturas</h3>
          <p className="text-muted-foreground">
            No hay facturas electrónicas disponibles para este proyecto.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Facturas Electrónicas</h3>
        <Badge variant="outline">
          {invoices.length} factura{invoices.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {invoices.map((invoice) => (
        <Card key={invoice.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">
                  {invoice.serie && invoice.folio ? `${invoice.serie}-${invoice.folio}` : 'Sin serie/folio'}
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(invoice.fecha_emision), 'dd/MM/yyyy', { locale: es })}
                </div>
              </div>
              <div className="text-right">
                {getStatusBadge(invoice.status)}
                <div className="text-lg font-semibold mt-1">
                  {formatCurrency(invoice.total)}
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <p className="text-muted-foreground">Subtotal</p>
                <p className="font-medium">{formatCurrency(invoice.subtotal)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">IVA</p>
                <p className="font-medium">{formatCurrency(invoice.iva)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tipo</p>
                <p className="font-medium">{invoice.tipo_comprobante}</p>
              </div>
              <div>
                <p className="text-muted-foreground">UUID</p>
                <p className="font-mono text-xs break-all">{invoice.uuid_fiscal.substring(0, 20)}...</p>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-xs text-muted-foreground">
                RFC: {invoice.rfc_receptor}
              </div>
              <Button
                onClick={() => downloadInvoice(invoice)}
                size="sm"
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Descargar PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};