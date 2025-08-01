import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, FileText, Download, Eye, X, Stamp, AlertTriangle } from 'lucide-react';

interface Invoice {
  id: string;
  serie: string;
  folio: string;
  uuid_fiscal?: string;
  fecha_emision: string;
  fecha_timbrado?: string;
  receptor_razon_social: string;
  receptor_rfc: string;
  subtotal: number;
  total: number;
  estatus: 'borrador' | 'timbrada' | 'cancelada' | 'error';
  metodo_pago: string;
  forma_pago: string;
  observaciones?: string;
}

interface InvoiceViewerProps {
  onStatsUpdate: () => void;
}

export function InvoiceViewer({ onStatsUpdate }: InvoiceViewerProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredInvoices(invoices);
    } else {
      const filtered = invoices.filter(invoice =>
        invoice.serie.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.folio.includes(searchTerm) ||
        invoice.receptor_razon_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.receptor_rfc.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.uuid_fiscal?.includes(searchTerm)
      );
      setFilteredInvoices(filtered);
    }
  }, [searchTerm, invoices]);

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('electronic_invoices')
        .select('*')
        .order('fecha_emision', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las facturas',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDetails(true);
  };

  const handleStampInvoice = async (invoiceId: string) => {
    try {
      // Here you would integrate with your PAC service
      // For now, we'll just update the status to simulate stamping
      const { error } = await supabase
        .from('electronic_invoices')
        .update({
          estatus: 'timbrada',
          fecha_timbrado: new Date().toISOString(),
          uuid_fiscal: `A1B2C3D4-E5F6-7890-ABCD-${Date.now()}`
        })
        .eq('id', invoiceId);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Factura timbrada correctamente'
      });

      fetchInvoices();
      onStatsUpdate();
    } catch (error) {
      console.error('Error stamping invoice:', error);
      toast({
        title: 'Error',
        description: 'Error al timbrar la factura',
        variant: 'destructive'
      });
    }
  };

  const handleCancelInvoice = async (invoiceId: string) => {
    if (!confirm('¿Estás seguro de que quieres cancelar esta factura?')) return;

    try {
      const { error } = await supabase
        .from('electronic_invoices')
        .update({
          estatus: 'cancelada',
          fecha_cancelacion: new Date().toISOString(),
          motivo_cancelacion: '02' // Comprobante emitido con errores con relación
        })
        .eq('id', invoiceId);

      if (error) throw error;

      // Register cancellation
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('invoice_cancellations')
          .insert([{
            invoice_id: invoiceId,
            motivo_cancelacion: '02',
            created_by: user.id
          }]);
      }

      toast({
        title: 'Éxito',
        description: 'Factura cancelada correctamente'
      });

      fetchInvoices();
      onStatsUpdate();
    } catch (error) {
      console.error('Error cancelling invoice:', error);
      toast({
        title: 'Error',
        description: 'Error al cancelar la factura',
        variant: 'destructive'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'timbrada':
        return 'default';
      case 'borrador':
        return 'secondary';
      case 'cancelada':
        return 'destructive';
      case 'error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'timbrada':
        return 'Timbrada';
      case 'borrador':
        return 'Borrador';
      case 'cancelada':
        return 'Cancelada';
      case 'error':
        return 'Error';
      default:
        return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Facturas Electrónicas</h3>
          <p className="text-muted-foreground">
            Visualiza y gestiona todas las facturas del sistema
          </p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por serie, folio, cliente, RFC o UUID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Facturas ({filteredInvoices.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serie-Folio</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>UUID</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    {invoice.serie}-{invoice.folio}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{invoice.receptor_razon_social}</p>
                      <p className="text-sm text-muted-foreground">{invoice.receptor_rfc}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{formatDate(invoice.fecha_emision)}</p>
                      {invoice.fecha_timbrado && (
                        <p className="text-xs text-muted-foreground">
                          Timbrada: {formatDate(invoice.fecha_timbrado)}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(invoice.total)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(invoice.estatus)}>
                      {getStatusLabel(invoice.estatus)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {invoice.uuid_fiscal ? (
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {invoice.uuid_fiscal.substring(0, 8)}...
                      </code>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(invoice)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {invoice.estatus === 'borrador' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStampInvoice(invoice.id)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <Stamp className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {invoice.estatus === 'timbrada' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelInvoice(invoice.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invoice Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Factura {selectedInvoice?.serie}-{selectedInvoice?.folio}
            </DialogTitle>
            <DialogDescription>
              Detalles completos de la factura electrónica
            </DialogDescription>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Información General</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Serie-Folio:</strong> {selectedInvoice.serie}-{selectedInvoice.folio}</p>
                    <p><strong>UUID:</strong> {selectedInvoice.uuid_fiscal || 'N/A'}</p>
                    <p><strong>Fecha Emisión:</strong> {formatDate(selectedInvoice.fecha_emision)}</p>
                    {selectedInvoice.fecha_timbrado && (
                      <p><strong>Fecha Timbrado:</strong> {formatDate(selectedInvoice.fecha_timbrado)}</p>
                    )}
                    <p><strong>Estado:</strong> 
                      <Badge variant={getStatusColor(selectedInvoice.estatus)} className="ml-2">
                        {getStatusLabel(selectedInvoice.estatus)}
                      </Badge>
                    </p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Cliente</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Razón Social:</strong> {selectedInvoice.receptor_razon_social}</p>
                    <p><strong>RFC:</strong> {selectedInvoice.receptor_rfc}</p>
                  </div>
                </div>
              </div>

              {/* Amounts */}
              <div>
                <h4 className="font-semibold mb-2">Importes</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p><strong>Subtotal:</strong> {formatCurrency(selectedInvoice.subtotal)}</p>
                    <p><strong>Total:</strong> {formatCurrency(selectedInvoice.total)}</p>
                  </div>
                  <div className="space-y-1">
                    <p><strong>Método de Pago:</strong> {selectedInvoice.metodo_pago}</p>
                    <p><strong>Forma de Pago:</strong> {selectedInvoice.forma_pago}</p>
                  </div>
                </div>
              </div>

              {/* Observations */}
              {selectedInvoice.observaciones && (
                <div>
                  <h4 className="font-semibold mb-2">Observaciones</h4>
                  <p className="text-sm bg-muted p-3 rounded">
                    {selectedInvoice.observaciones}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                {selectedInvoice.estatus === 'timbrada' && (
                  <>
                    <Button variant="outline" className="gap-2">
                      <Download className="h-4 w-4" />
                      Descargar PDF
                    </Button>
                    <Button variant="outline" className="gap-2">
                      <Download className="h-4 w-4" />
                      Descargar XML
                    </Button>
                  </>
                )}
                {selectedInvoice.estatus === 'borrador' && (
                  <Button className="gap-2" onClick={() => handleStampInvoice(selectedInvoice.id)}>
                    <Stamp className="h-4 w-4" />
                    Timbrar Factura
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowDetails(false)}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}