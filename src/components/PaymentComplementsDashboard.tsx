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

      // Fetch related expenses only (incomes no longer exist)
      const { data: expenses, error: expenseError } = await supabase
        .from('expenses')
        .select('id, cfdi_document_id, description, amount, complement_received')
        .in('cfdi_document_id', cfdiData?.map(doc => doc.id) || []);

      if (expenseError) console.error('Error fetching expenses:', expenseError);

      // Combine data
      const combinedData = cfdiData?.map(cfdi => ({
        ...cfdi,
        requires_complement: cfdi.forma_pago === 'PPD',
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
    if (!cfdi.requires_complement) {
      return <Badge variant="secondary">No requerido</Badge>;
    }

    const hasComplements = cfdi.payment_complements.length > 0;
    const hasActiveComplements = cfdi.payment_complements.some(comp => comp.status === 'active');

    if (hasActiveComplements) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Completado</Badge>;
    } else if (hasComplements) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">En proceso</Badge>;
    } else {
      return <Badge variant="destructive">Pendiente</Badge>;
    }
  };

  const calculateComplianceMetrics = () => {
    const requiredComplements = cfdiDocuments.filter(cfdi => cfdi.requires_complement);
    const completedComplements = requiredComplements.filter(cfdi => 
      cfdi.payment_complements.some(comp => comp.status === 'active')
    );
    const pendingComplements = requiredComplements.filter(cfdi => 
      !cfdi.payment_complements.some(comp => comp.status === 'active')
    );

    return {
      total: cfdiDocuments.length,
      required: requiredComplements.length,
      completed: completedComplements.length,
      pending: pendingComplements.length,
      complianceRate: requiredComplements.length > 0 ? 
        (completedComplements.length / requiredComplements.length) * 100 : 100
    };
  };

  const filteredDocuments = cfdiDocuments.filter(cfdi =>
    cfdi.uuid_fiscal.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cfdi.rfc_emisor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cfdi.rfc_receptor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const metrics = calculateComplianceMetrics();

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
      {/* Warning about removed functionality */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Note: Income-related payment complements are no longer tracked as the income management system has been removed.
          Only expense-related CFDIs are shown below.
        </AlertDescription>
      </Alert>

      {/* Métricas de Cumplimiento */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total CFDIs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requieren Complemento</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.required}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{metrics.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cumplimiento</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.complianceRate.toFixed(1)}%</div>
            <Progress value={metrics.complianceRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Búsqueda y Filtros */}
      <div className="flex gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar por UUID, RFC emisor o receptor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Dialog open={showUploader} onOpenChange={setShowUploader}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Subir Complemento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Subir Complemento de Pago</DialogTitle>
              <DialogDescription>
                Seleccione los archivos XML de complementos de pago para procesar.
              </DialogDescription>
            </DialogHeader>
            <PaymentComplementUploader />
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs para diferentes vistas */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Todos los CFDIs</TabsTrigger>
          <TabsTrigger value="pending">Pendientes</TabsTrigger>
          <TabsTrigger value="completed">Completados</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Documentos CFDI con Estado de Complementos</CardTitle>
              <CardDescription>
                Vista completa de todos los CFDIs y sus complementos de pago
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>UUID Fiscal</TableHead>
                    <TableHead>Fecha Emisión</TableHead>
                    <TableHead>RFC Emisor</TableHead>
                    <TableHead>RFC Receptor</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Forma Pago</TableHead>
                    <TableHead>Estado Complemento</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((cfdi) => (
                    <TableRow key={cfdi.id}>
                      <TableCell className="font-mono text-xs">{cfdi.uuid_fiscal}</TableCell>
                      <TableCell>{formatDate(cfdi.fecha_emision)}</TableCell>
                      <TableCell className="font-mono">{cfdi.rfc_emisor}</TableCell>
                      <TableCell className="font-mono">{cfdi.rfc_receptor}</TableCell>
                      <TableCell>{formatCurrency(cfdi.total)}</TableCell>
                      <TableCell>
                        <Badge variant={cfdi.forma_pago === 'PPD' ? 'destructive' : 'secondary'}>
                          {cfdi.forma_pago}
                        </Badge>
                      </TableCell>
                      <TableCell>{getComplementStatus(cfdi)}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedCFDI(cfdi)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>CFDIs Pendientes de Complemento</CardTitle>
              <CardDescription>
                Documentos que requieren complemento de pago pero aún no lo tienen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>UUID Fiscal</TableHead>
                    <TableHead>Fecha Emisión</TableHead>
                    <TableHead>RFC Emisor</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Días Pendiente</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments
                    .filter(cfdi => cfdi.requires_complement && !cfdi.payment_complements.some(comp => comp.status === 'active'))
                    .map((cfdi) => {
                      const daysPending = Math.floor((new Date().getTime() - new Date(cfdi.fecha_emision).getTime()) / (1000 * 60 * 60 * 24));
                      return (
                        <TableRow key={cfdi.id}>
                          <TableCell className="font-mono text-xs">{cfdi.uuid_fiscal}</TableCell>
                          <TableCell>{formatDate(cfdi.fecha_emision)}</TableCell>
                          <TableCell className="font-mono">{cfdi.rfc_emisor}</TableCell>
                          <TableCell>{formatCurrency(cfdi.total)}</TableCell>
                          <TableCell>
                            <Badge variant={daysPending > 30 ? 'destructive' : 'secondary'}>
                              {daysPending} días
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedCFDI(cfdi)}
                            >
                              <Eye className="h-4 w-4" />
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

        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle>CFDIs con Complementos Completados</CardTitle>
              <CardDescription>
                Documentos que ya tienen sus complementos de pago procesados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>UUID Fiscal</TableHead>
                    <TableHead>Fecha Emisión</TableHead>
                    <TableHead>RFC Emisor</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Complementos</TableHead>
                    <TableHead>Última Actualización</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments
                    .filter(cfdi => cfdi.payment_complements.some(comp => comp.status === 'active'))
                    .map((cfdi) => (
                      <TableRow key={cfdi.id}>
                        <TableCell className="font-mono text-xs">{cfdi.uuid_fiscal}</TableCell>
                        <TableCell>{formatDate(cfdi.fecha_emision)}</TableCell>
                        <TableCell className="font-mono">{cfdi.rfc_emisor}</TableCell>
                        <TableCell>{formatCurrency(cfdi.total)}</TableCell>
                        <TableCell>{cfdi.payment_complements.length}</TableCell>
                        <TableCell>
                          {cfdi.payment_complements.length > 0 ? 
                            formatDate(cfdi.payment_complements[0].received_date) : 
                            'N/A'
                          }
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedCFDI(cfdi)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para ver detalles del CFDI */}
      <Dialog open={!!selectedCFDI} onOpenChange={() => setSelectedCFDI(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalles del CFDI</DialogTitle>
            <DialogDescription>
              Información completa del documento y sus complementos de pago
            </DialogDescription>
          </DialogHeader>
          
          {selectedCFDI && (
            <div className="space-y-6">
              {/* Información del CFDI */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">UUID Fiscal</Label>
                  <p className="font-mono text-sm bg-gray-50 p-2 rounded">{selectedCFDI.uuid_fiscal}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Total</Label>
                  <p className="text-lg font-bold">{formatCurrency(selectedCFDI.total)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">RFC Emisor</Label>
                  <p className="font-mono">{selectedCFDI.rfc_emisor}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">RFC Receptor</Label>
                  <p className="font-mono">{selectedCFDI.rfc_receptor}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Fecha Emisión</Label>
                  <p>{formatDate(selectedCFDI.fecha_emision)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Forma de Pago</Label>
                  <Badge variant={selectedCFDI.forma_pago === 'PPD' ? 'destructive' : 'secondary'}>
                    {selectedCFDI.forma_pago}
                  </Badge>
                </div>
              </div>

              {/* Complementos de Pago */}
              <div>
                <h4 className="text-lg font-semibold mb-4">Complementos de Pago</h4>
                {selectedCFDI.payment_complements.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>UUID Complemento</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Fecha Pago</TableHead>
                        <TableHead>Forma Pago</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedCFDI.payment_complements.map((complement) => (
                        <TableRow key={complement.id}>
                          <TableCell className="font-mono text-xs">{complement.complement_uuid}</TableCell>
                          <TableCell>{formatCurrency(complement.monto_pago)}</TableCell>
                          <TableCell>{formatDate(complement.fecha_pago)}</TableCell>
                          <TableCell>{complement.forma_pago}</TableCell>
                          <TableCell>
                            <Badge variant={complement.status === 'active' ? 'secondary' : 'destructive'}>
                              {complement.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground">No hay complementos de pago registrados para este CFDI.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}