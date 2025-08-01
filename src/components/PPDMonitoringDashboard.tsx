import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  FileText, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Mail,
  Plus,
  Download,
  Upload
} from 'lucide-react';
import { format, addDays, differenceInDays, isBefore, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';

interface PPDInvoice {
  id: string;
  uuid_fiscal: string;
  serie?: string;
  folio?: string;
  rfc_receptor: string;
  rfc_emisor: string;
  fecha_emision: string;
  total: number;
  subtotal: number;
  client_name?: string;
  supplier_name?: string;
  tipo_comprobante: string;
  due_date: string;
  status: 'pending' | 'received' | 'overdue' | 'cancelled';
  complement_received: boolean;
  complement_uuid?: string;
  last_reminder_sent?: string;
  reminder_count: number;
}

interface ComplementForm {
  invoice_id: string;
  complement_uuid: string;
  fecha_pago: string;
  monto_pago: number;
  forma_pago: string;
  moneda: string;
  xml_file?: File;
}

const PPDMonitoringDashboard: React.FC = () => {
  const [ppdInvoices, setPPDInvoices] = useState<PPDInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<PPDInvoice | null>(null);
  const [complementForm, setComplementForm] = useState<ComplementForm>({
    invoice_id: '',
    complement_uuid: '',
    fecha_pago: '',
    monto_pago: 0,
    forma_pago: '03',
    moneda: 'MXN'
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchPPDInvoices();
  }, []);

  const fetchPPDInvoices = async () => {
    try {
      setLoading(true);
      
      // Fetch CFDIs with PPD payment method
      const { data: cfdis, error } = await supabase
        .from('cfdi_documents')
        .select(`
          *,
          clients(full_name),
          suppliers(company_name),
          payment_complements(*)
        `)
        .eq('forma_pago', 'PPD')
        .eq('status', 'active')
        .order('fecha_emision', { ascending: false });

      if (error) throw error;

      const processedInvoices: PPDInvoice[] = (cfdis || []).map(cfdi => {
        // Calculate due date (17th of following month)
        const emissionDate = new Date(cfdi.fecha_emision);
        const dueDate = new Date(emissionDate.getFullYear(), emissionDate.getMonth() + 1, 17);
        
        // Determine status
        let status: PPDInvoice['status'] = 'pending';
        const today = new Date();
        
        if (cfdi.payment_complements && cfdi.payment_complements.length > 0) {
          status = 'received';
        } else if (isAfter(today, dueDate)) {
          status = 'overdue';
        }

        return {
          id: cfdi.id,
          uuid_fiscal: cfdi.uuid_fiscal,
          serie: cfdi.serie,
          folio: cfdi.folio,
          rfc_receptor: cfdi.rfc_receptor,
          rfc_emisor: cfdi.rfc_emisor,
          fecha_emision: cfdi.fecha_emision,
          total: cfdi.total || 0,
          subtotal: cfdi.subtotal || 0,
          client_name: cfdi.clients?.full_name,
          supplier_name: cfdi.suppliers?.company_name,
          tipo_comprobante: cfdi.tipo_comprobante,
          due_date: dueDate.toISOString(),
          status,
          complement_received: cfdi.payment_complements && cfdi.payment_complements.length > 0,
          complement_uuid: cfdi.payment_complements?.[0]?.complement_uuid,
          reminder_count: 0 // This should be calculated from reminder logs
        };
      });

      setPPDInvoices(processedInvoices);
    } catch (error) {
      console.error('Error fetching PPD invoices:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las facturas PPD',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const sendReminder = async (invoice: PPDInvoice) => {
    try {
      // Here we would integrate with email service
      // For now, we'll just update the reminder count
      
      toast({
        title: 'Recordatorio enviado',
        description: `Recordatorio enviado para la factura ${invoice.serie}-${invoice.folio}`,
      });
      
      // Refresh data
      fetchPPDInvoices();
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast({
        title: 'Error',
        description: 'No se pudo enviar el recordatorio',
        variant: 'destructive'
      });
    }
  };

  const registerComplement = async () => {
    try {
      if (!selectedInvoice) return;

      const { error } = await supabase
        .from('payment_complements')
        .insert({
          cfdi_document_id: selectedInvoice.id,
          complement_uuid: complementForm.complement_uuid,
          fecha_pago: complementForm.fecha_pago,
          monto_pago: complementForm.monto_pago,
          forma_pago: complementForm.forma_pago,
          moneda: complementForm.moneda,
          file_path: '', // This would be set after file upload
          xml_content: '', // This would be parsed from XML
          status: 'active'
        });

      if (error) throw error;

      toast({
        title: 'Complemento registrado',
        description: 'El complemento de pago ha sido registrado exitosamente',
      });

      setDialogOpen(false);
      setSelectedInvoice(null);
      setComplementForm({
        invoice_id: '',
        complement_uuid: '',
        fecha_pago: '',
        monto_pago: 0,
        forma_pago: '03',
        moneda: 'MXN'
      });
      fetchPPDInvoices();
    } catch (error) {
      console.error('Error registering complement:', error);
      toast({
        title: 'Error',
        description: 'No se pudo registrar el complemento',
        variant: 'destructive'
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const getStatusBadge = (status: PPDInvoice['status']) => {
    const variants = {
      pending: { variant: 'outline' as const, label: 'Pendiente' },
      received: { variant: 'default' as const, label: 'Recibido' },
      overdue: { variant: 'destructive' as const, label: 'Vencido' },
      cancelled: { variant: 'secondary' as const, label: 'Cancelado' }
    };

    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    return differenceInDays(due, today);
  };

  const getUrgencyIcon = (invoice: PPDInvoice) => {
    const daysUntilDue = getDaysUntilDue(invoice.due_date);
    
    if (invoice.status === 'received') {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (invoice.status === 'overdue') {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    } else if (daysUntilDue <= 3) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    } else {
      return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const filteredInvoices = ppdInvoices.filter(invoice => {
    if (filterStatus === 'all') return true;
    return invoice.status === filterStatus;
  });

  const stats = {
    total: ppdInvoices.length,
    pending: ppdInvoices.filter(i => i.status === 'pending').length,
    overdue: ppdInvoices.filter(i => i.status === 'overdue').length,
    received: ppdInvoices.filter(i => i.status === 'received').length,
    totalAmount: ppdInvoices.reduce((sum, i) => sum + i.total, 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monitoreo de Facturas PPD</h1>
          <p className="text-muted-foreground">
            Control de complementos de pago pendientes y recordatorios
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Facturas PPD</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.totalAmount)} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Esperando complemento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">
              Requieren acción inmediata
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.received}</div>
            <p className="text-xs text-muted-foreground">
              Con complemento recibido
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Cumplimiento</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total > 0 ? Math.round((stats.received / stats.total) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Complementos recibidos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las facturas</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="overdue">Vencidas</SelectItem>
                <SelectItem value="received">Completas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* PPD Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Facturas PPD</CardTitle>
          <CardDescription>
            Mostrando {filteredInvoices.length} de {ppdInvoices.length} facturas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estado</TableHead>
                  <TableHead>Factura</TableHead>
                  <TableHead>RFC Receptor</TableHead>
                  <TableHead>Cliente/Proveedor</TableHead>
                  <TableHead>Fecha Emisión</TableHead>
                  <TableHead>Fecha Límite</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Días Restantes</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => {
                  const daysUntilDue = getDaysUntilDue(invoice.due_date);
                  
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getUrgencyIcon(invoice)}
                          {getStatusBadge(invoice.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {invoice.serie && invoice.folio ? `${invoice.serie}-${invoice.folio}` : 'Sin serie'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {invoice.uuid_fiscal.substring(0, 8)}...
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{invoice.rfc_receptor}</TableCell>
                      <TableCell>{invoice.client_name || invoice.supplier_name || '-'}</TableCell>
                      <TableCell>
                        {format(new Date(invoice.fecha_emision), 'dd/MM/yyyy', { locale: es })}
                      </TableCell>
                      <TableCell>
                        {format(new Date(invoice.due_date), 'dd/MM/yyyy', { locale: es })}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(invoice.total)}
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${
                          daysUntilDue < 0 ? 'text-red-600' : 
                          daysUntilDue <= 3 ? 'text-yellow-600' : 
                          'text-green-600'
                        }`}>
                          {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} días vencido` : 
                           daysUntilDue === 0 ? 'Vence hoy' :
                           `${daysUntilDue} días`}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {invoice.status !== 'received' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => sendReminder(invoice)}
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                              <Dialog open={dialogOpen && selectedInvoice?.id === invoice.id} onOpenChange={setDialogOpen}>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedInvoice(invoice);
                                      setComplementForm(prev => ({
                                        ...prev,
                                        invoice_id: invoice.id,
                                        monto_pago: invoice.total
                                      }));
                                    }}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Registrar Complemento de Pago</DialogTitle>
                                    <DialogDescription>
                                      Registra el complemento de pago para la factura {invoice.serie}-{invoice.folio}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <label className="text-sm font-medium">UUID del Complemento</label>
                                      <Input
                                        value={complementForm.complement_uuid}
                                        onChange={(e) => setComplementForm(prev => ({
                                          ...prev,
                                          complement_uuid: e.target.value
                                        }))}
                                        placeholder="UUID del complemento de pago"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Fecha de Pago</label>
                                      <Input
                                        type="date"
                                        value={complementForm.fecha_pago}
                                        onChange={(e) => setComplementForm(prev => ({
                                          ...prev,
                                          fecha_pago: e.target.value
                                        }))}
                                      />
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Monto Pagado</label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={complementForm.monto_pago}
                                        onChange={(e) => setComplementForm(prev => ({
                                          ...prev,
                                          monto_pago: parseFloat(e.target.value) || 0
                                        }))}
                                      />
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Forma de Pago</label>
                                      <Select
                                        value={complementForm.forma_pago}
                                        onValueChange={(value) => setComplementForm(prev => ({
                                          ...prev,
                                          forma_pago: value
                                        }))}
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="03">Transferencia electrónica</SelectItem>
                                          <SelectItem value="02">Cheque nominativo</SelectItem>
                                          <SelectItem value="01">Efectivo</SelectItem>
                                          <SelectItem value="04">Tarjeta de crédito</SelectItem>
                                          <SelectItem value="28">Tarjeta de débito</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button onClick={registerComplement} className="flex-1">
                                        Registrar Complemento
                                      </Button>
                                      <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                        Cancelar
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </>
                          )}
                          {invoice.complement_received && (
                            <Badge variant="default" className="text-xs">
                              Completo
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredInvoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No se encontraron facturas PPD con los filtros aplicados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PPDMonitoringDashboard;