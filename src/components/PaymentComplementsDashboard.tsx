import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PaymentComplementUploader } from './PaymentComplementUploader';
import { 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Upload, 
  Search, 
  Calendar,
  FileText,
  Eye,
  DollarSign
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CFDIWithComplements {
  id: string;
  uuid_fiscal: string;
  total: number;
  fecha_emision: string;
  rfc_emisor: string;
  rfc_receptor: string;
  forma_pago: string;
  tipo_comprobante: string;
  requires_complement: boolean;
  income?: {
    id: string;
    description: string;
    amount: number;
    complement_sent: boolean;
    payment_status: string;
  };
  expense?: {
    id: string;
    description: string;
    amount: number;
    complement_received: boolean;
  };
  payment_complements: Array<{
    id: string;
    complement_uuid: string;
    monto_pago: number;
    fecha_pago: string;
    forma_pago: string;
    status: string;
    received_date: string;
  }>;
}

interface PaymentComplementsDashboardProps {
  selectedClientId?: string;
  selectedProjectId?: string;
}

export function PaymentComplementsDashboard({ selectedClientId, selectedProjectId }: PaymentComplementsDashboardProps) {
  const [cfdiDocuments, setCfdiDocuments] = useState<CFDIWithComplements[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCFDI, setSelectedCFDI] = useState<CFDIWithComplements | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploader, setShowUploader] = useState(false);

  useEffect(() => {
    fetchCFDIWithComplements();
  }, []);

  const fetchCFDIWithComplements = async () => {
    try {
      // Fetch CFDI documents with PPD payment method (require complements)
      let cfdiQuery = supabase
        .from('cfdi_documents')
        .select(`
          id,
          uuid_fiscal,
          total,
          fecha_emision,
          rfc_emisor,
          rfc_receptor,
          forma_pago,
          tipo_comprobante,
          client_id,
          payment_complements(
            id,
            complement_uuid,
            monto_pago,
            fecha_pago,
            forma_pago,
            status,
            received_date
          )
        `)
        .eq('forma_pago', 'PPD')
        .order('fecha_emision', { ascending: false });

      // Apply client filter if provided
      if (selectedClientId) {
        cfdiQuery = cfdiQuery.eq('client_id', selectedClientId);
      }

      const { data: cfdiData, error: cfdiError } = await cfdiQuery;

      if (cfdiError) throw cfdiError;

      // Fetch related incomes
      const { data: incomes, error: incomeError } = await supabase
        .from('incomes')
        .select('id, cfdi_document_id, description, amount, complement_sent, payment_status')
        .in('cfdi_document_id', cfdiData?.map(doc => doc.id) || []);

      if (incomeError) console.error('Error fetching incomes:', incomeError);

      // Fetch related expenses
      const { data: expenses, error: expenseError } = await supabase
        .from('expenses')
        .select('id, cfdi_document_id, description, amount, complement_received')
        .in('cfdi_document_id', cfdiData?.map(doc => doc.id) || []);

      if (expenseError) console.error('Error fetching expenses:', expenseError);

      // Combine data
      const combinedData = cfdiData?.map(cfdi => ({
        ...cfdi,
        requires_complement: cfdi.forma_pago === 'PPD',
        income: incomes?.find(inc => inc.cfdi_document_id === cfdi.id),
        expense: expenses?.find(exp => exp.cfdi_document_id === cfdi.id),
      })) || [];

      setCfdiDocuments(combinedData);
    } catch (error) {
      console.error('Error fetching CFDI data:', error);
    } finally {
      setIsLoading(false);
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

  const getComplementStatus = (cfdi: CFDIWithComplements) => {
    const hasComplements = cfdi.payment_complements.length > 0;
    const totalPaid = cfdi.payment_complements.reduce((sum, comp) => sum + comp.monto_pago, 0);
    const isPaidInFull = totalPaid >= cfdi.total;

    if (isPaidInFull) return { status: 'paid', label: 'Pagado Completo', color: 'success' };
    if (hasComplements) return { status: 'partial', label: 'Pago Parcial', color: 'warning' };
    return { status: 'pending', label: 'Pendiente Complemento', color: 'destructive' };
  };

  const filteredDocuments = cfdiDocuments.filter(cfdi => 
    cfdi.uuid_fiscal.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cfdi.rfc_emisor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cfdi.rfc_receptor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingComplements = filteredDocuments.filter(cfdi => 
    getComplementStatus(cfdi).status === 'pending'
  );

  const partialPayments = filteredDocuments.filter(cfdi => 
    getComplementStatus(cfdi).status === 'partial'
  );

  const completedPayments = filteredDocuments.filter(cfdi => 
    getComplementStatus(cfdi).status === 'paid'
  );

  const complianceRate = filteredDocuments.length > 0 
    ? (completedPayments.length / filteredDocuments.length) * 100 
    : 0;

  const handleComplementUploaded = () => {
    fetchCFDIWithComplements();
    setShowUploader(false);
    setSelectedCFDI(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-muted rounded w-24 animate-pulse" />
                <div className="h-4 w-4 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16 animate-pulse mb-2" />
                <div className="h-3 bg-muted rounded w-32 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total CFDIs PPD</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredDocuments.length}</div>
            <p className="text-xs text-muted-foreground">
              Facturas que requieren complemento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingComplements.length}</div>
            <p className="text-xs text-muted-foreground">
              Sin complemento recibido
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos Parciales</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{partialPayments.length}</div>
            <p className="text-xs text-muted-foreground">
              Con complemento parcial
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cumplimiento</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{complianceRate.toFixed(1)}%</div>
            <Progress value={complianceRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {pendingComplements.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Tienes {pendingComplements.length} CFDI(s) pendientes de recibir complemento de pago.
          </AlertDescription>
        </Alert>
      )}

      {/* Search and Upload */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por UUID, RFC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <Dialog open={showUploader} onOpenChange={setShowUploader}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Cargar Complemento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Cargar Complemento de Pago</DialogTitle>
              <DialogDescription>
                Sube el XML del complemento de pago para registrar el pago recibido
              </DialogDescription>
            </DialogHeader>
            <PaymentComplementUploader
              cfdiDocumentId={selectedCFDI?.id}
              onSuccess={handleComplementUploaded}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pendientes ({pendingComplements.length})
          </TabsTrigger>
          <TabsTrigger value="partial">
            Parciales ({partialPayments.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completados ({completedPayments.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            Todos ({filteredDocuments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <CFDITable documents={pendingComplements} onSelectCFDI={(cfdi) => {
            setSelectedCFDI(cfdi);
            setShowUploader(true);
          }} />
        </TabsContent>

        <TabsContent value="partial" className="space-y-4">
          <CFDITable documents={partialPayments} onSelectCFDI={(cfdi) => {
            setSelectedCFDI(cfdi);
            setShowUploader(true);
          }} />
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <CFDITable documents={completedPayments} onSelectCFDI={(cfdi) => {
            setSelectedCFDI(cfdi);
            setShowUploader(true);
          }} />
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <CFDITable documents={filteredDocuments} onSelectCFDI={(cfdi) => {
            setSelectedCFDI(cfdi);
            setShowUploader(true);
          }} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CFDITable({ 
  documents, 
  onSelectCFDI 
}: { 
  documents: CFDIWithComplements[], 
  onSelectCFDI: (cfdi: CFDIWithComplements) => void 
}) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX');
  };

  const getComplementStatus = (cfdi: CFDIWithComplements) => {
    const hasComplements = cfdi.payment_complements.length > 0;
    const totalPaid = cfdi.payment_complements.reduce((sum, comp) => sum + comp.monto_pago, 0);
    const isPaidInFull = totalPaid >= cfdi.total;

    if (isPaidInFull) return { status: 'paid', label: 'Pagado Completo', color: 'default' };
    if (hasComplements) return { status: 'partial', label: 'Pago Parcial', color: 'secondary' };
    return { status: 'pending', label: 'Pendiente Complemento', color: 'destructive' };
  };

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No hay documentos</h3>
            <p className="text-muted-foreground">No se encontraron CFDIs en esta categoría</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>UUID / RFC</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Pagado</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Complementos</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((cfdi) => {
              const status = getComplementStatus(cfdi);
              const totalPaid = cfdi.payment_complements.reduce((sum, comp) => sum + comp.monto_pago, 0);
              
              return (
                <TableRow key={cfdi.id}>
                  <TableCell>
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">
                        {cfdi.uuid_fiscal.substring(0, 8)}...
                      </p>
                      <p className="text-sm font-medium">{cfdi.rfc_emisor}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatDate(cfdi.fecha_emision)}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(cfdi.total)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{formatCurrency(totalPaid)}</p>
                      {totalPaid > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {((totalPaid / cfdi.total) * 100).toFixed(1)}%
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.color as any}>
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{cfdi.payment_complements.length}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectCFDI(cfdi)}
                    >
                      <Upload className="mr-1 h-3 w-3" />
                      Cargar
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}