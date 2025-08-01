import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, DollarSign, FileText, Calendar, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ClientPaymentDialog } from "./ClientPaymentDialog";

interface PaymentData {
  id: string;
  client_id: string;
  invoice_id: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  reference_number: string;
  complement_issued: boolean;
  complement_due_date: string;
  notes: string;
  client_name: string;
  invoice_number: string;
  invoice_total: number;
  invoice_uuid: string;
}

interface InvoiceWithPayments {
  id: string;
  uuid_fiscal: string;
  client_name: string;
  invoice_number: string;
  total: number;
  total_paid: number;
  remaining_balance: number;
  payments: PaymentData[];
  requires_complement: boolean;
}

export function PPDComplianceManager() {
  const [invoicesWithPayments, setInvoicesWithPayments] = useState<InvoiceWithPayments[]>([]);
  const [pendingComplements, setPendingComplements] = useState<PaymentData[]>([]);
  const [overdueComplements, setOverdueComplements] = useState<PaymentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPPDData();
  }, []);

  const fetchPPDData = async () => {
    setIsLoading(true);
    try {
      // Fetch PPD invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('incomes')
        .select('id, uuid_fiscal, invoice_number, amount, forma_pago, client_id')
        .eq('forma_pago', 'PPD');

      if (invoicesError) throw invoicesError;

      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, full_name');

      if (clientsError) throw clientsError;

      // Fetch all payments for these invoices
      const invoiceIds = invoicesData?.map(inv => inv.id) || [];
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('client_payments')
        .select('*')
        .in('invoice_id', invoiceIds);

      if (paymentsError) throw paymentsError;

      // Create lookup maps
      const clientsMap = new Map(clientsData?.map(c => [c.id, c.full_name]) || []);
      const invoicesMap = new Map(invoicesData?.map(inv => [inv.id, inv]) || []);

      // Process and combine data
      const processedInvoices = invoicesData?.map(invoice => {
        const payments = paymentsData?.filter(p => p.invoice_id === invoice.id) || [];
        const totalPaid = payments.reduce((sum, p) => sum + p.amount_paid, 0);
        const remainingBalance = invoice.amount - totalPaid;
        const clientName = clientsMap.get(invoice.client_id) || 'Cliente desconocido';

        return {
          id: invoice.id,
          uuid_fiscal: invoice.uuid_fiscal || '',
          client_name: clientName,
          invoice_number: invoice.invoice_number || '',
          total: invoice.amount,
          total_paid: totalPaid,
          remaining_balance: remainingBalance,
          payments: payments.map(p => ({
            ...p,
            client_name: clientName,
            invoice_number: invoice.invoice_number || '',
            invoice_total: invoice.amount,
            invoice_uuid: invoice.uuid_fiscal || ''
          })),
          requires_complement: payments.some(p => !p.complement_issued)
        };
      }) || [];

      setInvoicesWithPayments(processedInvoices);

      // Extract pending and overdue complements
      const allPayments = paymentsData?.map(p => {
        const invoice = invoicesMap.get(p.invoice_id);
        const clientName = clientsMap.get(p.client_id) || 'Cliente desconocido';
        
        return {
          ...p,
          client_name: clientName,
          invoice_number: invoice?.invoice_number || '',
          invoice_total: invoice?.amount || 0,
          invoice_uuid: invoice?.uuid_fiscal || ''
        };
      }) || [];

      const pending = allPayments.filter(p => !p.complement_issued);
      const overdue = pending.filter(p => new Date(p.complement_due_date) < new Date());

      setPendingComplements(pending);
      setOverdueComplements(overdue);

    } catch (error) {
      console.error('Error fetching PPD data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de complementos PPD",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const markComplementIssued = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from('client_payments')
        .update({ complement_issued: true })
        .eq('id', paymentId);

      if (error) throw error;

      toast({
        title: "Complemento marcado",
        description: "Se ha marcado el complemento como emitido"
      });

      fetchPPDData();
    } catch (error) {
      console.error('Error marking complement as issued:', error);
      toast({
        title: "Error",
        description: "No se pudo marcar el complemento como emitido",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX');
  };

  const getComplementStatus = (payment: PaymentData) => {
    if (payment.complement_issued) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Emitido</Badge>;
    }
    
    const isOverdue = new Date(payment.complement_due_date) < new Date();
    return (
      <Badge variant={isOverdue ? "destructive" : "secondary"} className={isOverdue ? "" : "bg-orange-100 text-orange-800"}>
        {isOverdue ? "Vencido" : "Pendiente"}
      </Badge>
    );
  };

  const filteredInvoices = invoicesWithPayments.filter(invoice =>
    invoice.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.uuid_fiscal.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPendingComplements = pendingComplements.filter(payment =>
    payment.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.invoice_uuid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Métricas Resumen */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturas PPD Activas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoicesWithPayments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Complementos Pendientes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingComplements.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Complementos Vencidos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueComplements.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cumplimiento</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {pendingComplements.length > 0 ? 
                Math.round(((pendingComplements.length - overdueComplements.length) / pendingComplements.length) * 100) : 100}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {overdueComplements.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Complementos Vencidos - Acción Requerida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">
              Tienes {overdueComplements.length} complementos de pago vencidos que deben emitirse inmediatamente 
              para cumplir con las obligaciones fiscales del SAT.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Búsqueda */}
      <div className="flex gap-4 items-center">
        <Input
          placeholder="Buscar por cliente, factura o UUID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={fetchPPDData}>Actualizar</Button>
      </div>

      {/* Tabs para diferentes vistas */}
      <Tabs defaultValue="complements" className="space-y-4">
        <TabsList>
          <TabsTrigger value="complements">Complementos por Emitir</TabsTrigger>
          <TabsTrigger value="invoices">Facturas PPD</TabsTrigger>
          <TabsTrigger value="overdue">Vencidos</TabsTrigger>
        </TabsList>

        <TabsContent value="complements">
          <Card>
            <CardHeader>
              <CardTitle>Complementos Pendientes de Emisión</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Factura</TableHead>
                    <TableHead>Fecha Pago</TableHead>
                    <TableHead>Monto Pagado</TableHead>
                    <TableHead>Fecha Límite</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPendingComplements.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.client_name}</TableCell>
                      <TableCell>{payment.invoice_number}</TableCell>
                      <TableCell>{formatDate(payment.payment_date)}</TableCell>
                      <TableCell>{formatCurrency(payment.amount_paid)}</TableCell>
                      <TableCell>{formatDate(payment.complement_due_date)}</TableCell>
                      <TableCell>{getComplementStatus(payment)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => markComplementIssued(payment.id)}
                          disabled={payment.complement_issued}
                        >
                          Marcar Emitido
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Facturas PPD con Pagos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Factura</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Pagado</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Pagos</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.client_name}</TableCell>
                      <TableCell>{invoice.invoice_number}</TableCell>
                      <TableCell>{formatCurrency(invoice.total)}</TableCell>
                      <TableCell>{formatCurrency(invoice.total_paid)}</TableCell>
                      <TableCell>
                        <span className={invoice.remaining_balance > 100 ? "text-orange-600" : "text-green-600"}>
                          {formatCurrency(invoice.remaining_balance)}
                        </span>
                      </TableCell>
                      <TableCell>{invoice.payments.length}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setShowPaymentDialog(true);
                          }}
                        >
                          Registrar Pago
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overdue">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-800">Complementos Vencidos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Factura</TableHead>
                    <TableHead>Fecha Pago</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Vencido Desde</TableHead>
                    <TableHead>Días Vencido</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueComplements.map((payment) => {
                    const daysOverdue = Math.floor((new Date().getTime() - new Date(payment.complement_due_date).getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <TableRow key={payment.id} className="bg-red-50">
                        <TableCell className="font-medium">{payment.client_name}</TableCell>
                        <TableCell>{payment.invoice_number}</TableCell>
                        <TableCell>{formatDate(payment.payment_date)}</TableCell>
                        <TableCell>{formatCurrency(payment.amount_paid)}</TableCell>
                        <TableCell>{formatDate(payment.complement_due_date)}</TableCell>
                        <TableCell className="text-red-600 font-semibold">{daysOverdue} días</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => markComplementIssued(payment.id)}
                          >
                            Emitir Ahora
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para registrar pagos */}
      <ClientPaymentDialog
        isOpen={showPaymentDialog}
        onClose={() => {
          setShowPaymentDialog(false);
          setSelectedInvoice(null);
        }}
        onSuccess={fetchPPDData}
        invoiceId={selectedInvoice?.id}
        clientId={selectedInvoice?.client_id}
        invoiceTotal={selectedInvoice?.total}
      />
    </div>
  );
}