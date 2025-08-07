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
      // PPD compliance is no longer needed as income tracking was removed
      setInvoicesWithPayments([]);
      setPendingComplements([]);
      setOverdueComplements([]);
      
      toast({
        title: "Información",
        description: "PPD compliance tracking is no longer active as income management has been removed from the system.",
        variant: "default"
      });
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
    toast({
      title: "Funcionalidad no disponible",
      description: "PPD compliance tracking has been removed from the system",
      variant: "default"
    });
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
    return <Badge variant="secondary" className="bg-gray-100 text-gray-800">No disponible</Badge>;
  };

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
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Complementos Pendientes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">0</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Complementos Vencidos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">0</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">N/A</div>
          </CardContent>
        </Card>
      </div>

      {/* Information Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Funcionalidad Deshabilitada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-blue-700">
            El seguimiento de complementos PPD ha sido deshabilitado debido a la eliminación del sistema de gestión de ingresos. 
            Esta funcionalidad ya no está disponible en el sistema.
          </p>
        </CardContent>
      </Card>

      {/* Búsqueda */}
      <div className="flex gap-4 items-center">
        <Input
          placeholder="Funcionalidad no disponible..."
          value=""
          disabled
          className="max-w-sm"
        />
        <Button onClick={fetchPPDData} disabled>Actualizar</Button>
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
              <p className="text-center text-muted-foreground py-8">
                PPD compliance tracking is no longer active as income management has been removed from the system.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Facturas PPD con Pagos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">
                No hay facturas PPD disponibles. Esta funcionalidad ha sido deshabilitada.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overdue">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-800">Complementos Vencidos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">
                No hay complementos vencidos. Esta funcionalidad ha sido deshabilitada.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}