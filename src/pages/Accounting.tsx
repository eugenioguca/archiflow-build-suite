import { useState, useEffect } from 'react';
import { Calculator, FileText, AlertTriangle, CheckCircle2, Clock, TrendingUp, PieChart, BookOpen, CreditCard, Receipt, Building, DollarSign, Calendar, Archive, Eye, Download, Upload, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DocumentViewer } from '@/components/DocumentViewer';
import { XMLUploader } from '@/components/XMLUploader';
import { PaymentComplementsDashboard } from '@/components/PaymentComplementsDashboard';
import { PPDComplianceManager } from '@/components/PPDComplianceManager';
import { GlobalFilters } from '@/components/GlobalFilters';
import { supabase } from '@/integrations/supabase/client';

interface ExpenseWithTax {
  id: string;
  description: string;
  amount: number;
  category: string;
  invoice_number: string | null;
  invoice_date: string | null;
  tax_amount: number | null;
  created_at: string;
  status_cfdi: string;
  uuid_fiscal?: string;
  rfc_emisor?: string;
  forma_pago?: string;
  requires_complement: boolean;
  complement_received: boolean;
  project?: {
    name: string;
  };
  client?: {
    full_name: string;
  };
  supplier?: {
    company_name: string;
    rfc?: string;
  };
  cfdi_document?: {
    id: string;
    uuid_fiscal: string;
    total: number;
    iva: number;
    file_path: string;
    tipo_comprobante: string;
    uso_cfdi?: string;
    forma_pago?: string;
    metodo_pago?: string;
    fecha_emision: string;
    status: string;
  };
}

interface IncomeWithTax {
  id: string;
  description: string;
  amount: number;
  category: string;
  invoice_number: string | null;
  invoice_date: string | null;
  tax_amount: number | null;
  payment_status: string;
  created_at: string;
  status_cfdi: string;
  uuid_fiscal?: string;
  rfc_receptor?: string;
  uso_cfdi?: string;
  forma_pago?: string;
  requires_complement: boolean;
  complement_sent: boolean;
  project?: {
    name: string;
  };
  client?: {
    full_name: string;
  };
  cfdi_document?: {
    id: string;
    uuid_fiscal: string;
    total: number;
    iva: number;
    file_path: string;
    tipo_comprobante: string;
    uso_cfdi?: string;
    forma_pago?: string;
    metodo_pago?: string;
    fecha_emision: string;
    status: string;
  };
}

interface PaymentComplement {
  id: string;
  complement_uuid: string;
  cfdi_document_id: string;
  monto_pago: number;
  fecha_pago: string;
  forma_pago: string;
  status: string;
  file_path: string;
  received_date?: string;
}

interface FiscalReport {
  id: string;
  report_type: string;
  period_start: string;
  period_end: string;
  status: string;
  file_path?: string;
  data: any;
  created_at: string;
}

const categoryLabels = {
  administration: 'Administración',
  sales: 'Ventas',
  financial: 'Financieros',
  construction: 'Construcción',
  construction_service: 'Servicio de Construcción',
  consultation: 'Consultoría',
  project_management: 'Gestión de Proyectos',
  maintenance: 'Mantenimiento',
  other: 'Otros'
};

const cfdiStatusLabels = {
  pending: 'Pendiente',
  valid: 'Válido',
  cancelled: 'Cancelado',
  error: 'Error'
};

const tipoComprobanteLabels = {
  'I': 'Ingreso',
  'E': 'Egreso',
  'T': 'Traslado',
  'N': 'Nómina',
  'P': 'Pago'
};

const usoCfdiLabels = {
  'G03': 'Gastos en general',
  'G02': 'Gastos médicos por incapacidad o discapacidad',
  'G01': 'Adquisición de mercancías',
  'P01': 'Por definir',
  'D01': 'Honorarios médicos, dentales y gastos hospitalarios',
  'D02': 'Gastos médicos por incapacidad o discapacidad',
  'D03': 'Gastos funerales',
  'D04': 'Donativos',
  'D05': 'Intereses reales efectivamente pagados por créditos hipotecarios',
  'D06': 'Aportaciones voluntarias al SAR',
  'D07': 'Primas por seguros de gastos médicos',
  'D08': 'Gastos de transportación escolar obligatoria',
  'D09': 'Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones',
  'D10': 'Pagos por servicios educativos (colegiaturas)'
};

export default function Accounting() {
  const [expenses, setExpenses] = useState<ExpenseWithTax[]>([]);
  const [incomes, setIncomes] = useState<IncomeWithTax[]>([]);
  const [paymentComplements, setPaymentComplements] = useState<PaymentComplement[]>([]);
  const [fiscalReports, setFiscalReports] = useState<FiscalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [isDocumentViewerOpen, setIsDocumentViewerOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2024');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>();
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();

  useEffect(() => {
    fetchData();
  }, [selectedPeriod, selectedMonth, selectedClientId, selectedProjectId]);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchExpenses(),
        fetchIncomes(),
        fetchPaymentComplements(),
        fetchFiscalReports()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async () => {
    try {
      let query = supabase
        .from('expenses')
        .select(`
          *,
          project:client_projects(project_name),
          client:clients(full_name),
          supplier:suppliers(company_name, rfc),
          cfdi_document:cfdi_documents!expenses_cfdi_document_id_fkey(*)
        `)
        .order('created_at', { ascending: false });

      // Apply period filter
      if (selectedPeriod !== 'all') {
        const startDate = `${selectedPeriod}-01-01`;
        const endDate = `${selectedPeriod}-12-31`;
        query = query.gte('created_at', startDate).lte('created_at', endDate);
      }

      // Apply month filter
      if (selectedMonth !== 'all') {
        const monthStart = `${selectedPeriod}-${selectedMonth.padStart(2, '0')}-01`;
        const monthEnd = `${selectedPeriod}-${selectedMonth.padStart(2, '0')}-31`;
        query = query.gte('created_at', monthStart).lte('created_at', monthEnd);
      }

      // Apply client-project filters
      if (selectedClientId) {
        query = query.eq('client_id', selectedClientId);
      }
      if (selectedProjectId) {
        query = query.eq('project_id', selectedProjectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      // Transform project_name to name for compatibility
      const transformedData = (data || []).map(expense => ({
        ...expense,
        project: expense.project ? { name: expense.project.project_name } : undefined
      }));
      setExpenses(transformedData);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const fetchIncomes = async () => {
    try {
      // Incomes table no longer exists - set empty array
      setIncomes([]);
    } catch (error) {
      console.error('Error: Income tracking has been removed from the system:', error);
    }
  };

  const fetchPaymentComplements = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_complements')
        .select('*')
        .order('fecha_pago', { ascending: false });

      if (error) throw error;
      setPaymentComplements(data || []);
    } catch (error) {
      console.error('Error fetching payment complements:', error);
    }
  };

  const fetchFiscalReports = async () => {
    try {
      const { data, error } = await supabase
        .from('fiscal_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiscalReports(data || []);
    } catch (error) {
      console.error('Error fetching fiscal reports:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No especificado';
    return new Date(dateString).toLocaleDateString('es-MX');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
      case 'paid':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'cancelled':
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'valid':
      case 'paid':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'cancelled':
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const viewDocument = (document: any) => {
    setSelectedDocument(document);
    setIsDocumentViewerOpen(true);
  };

  // Cálculos contables principales
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalIncomes = incomes.reduce((sum, income) => sum + income.amount, 0);
  const totalExpenseTaxes = expenses.reduce((sum, expense) => sum + (expense.tax_amount || 0), 0);
  const totalIncomeTaxes = incomes.reduce((sum, income) => sum + (income.tax_amount || 0), 0);
  
  // IVA por pagar/cobrar (diferencia entre IVA cobrado e IVA pagado)
  const ivaBalance = totalIncomeTaxes - totalExpenseTaxes;
  
  // Utilidad bruta
  const grossProfit = totalIncomes - totalExpenses;

  // Análisis de cumplimiento fiscal
  const expensesWithCFDI = expenses.filter(e => e.cfdi_document);
  const incomesWithCFDI = incomes.filter(i => i.cfdi_document);
  const expenseComplianceRate = expenses.length > 0 ? (expensesWithCFDI.length / expenses.length) * 100 : 0;
  const incomeComplianceRate = incomes.length > 0 ? (incomesWithCFDI.length / incomes.length) * 100 : 0;

  // Análisis PUE vs PPD
  const pueExpenses = expenses.filter(e => e.cfdi_document?.forma_pago === 'PUE');
  const ppdExpenses = expenses.filter(e => e.cfdi_document?.forma_pago === 'PPD');
  const pueIncomes = incomes.filter(i => i.cfdi_document?.forma_pago === 'PUE');
  const ppdIncomes = incomes.filter(i => i.cfdi_document?.forma_pago === 'PPD');

  // Gastos que requieren complemento de pago
  const expensesRequiringComplement = expenses.filter(e => e.requires_complement && !e.complement_received);
  const incomesRequiringComplement = incomes.filter(i => i.requires_complement && !i.complement_sent);

  // Documentos por estado
  const cfdiDocuments = [...expensesWithCFDI, ...incomesWithCFDI].map(item => item.cfdi_document!);
  const validCFDI = cfdiDocuments.filter(doc => doc.status === 'valid').length;
  const pendingCFDI = cfdiDocuments.filter(doc => doc.status === 'pending').length;
  const cancelledCFDI = cfdiDocuments.filter(doc => doc.status === 'cancelled').length;

  // IVA por categoría
  const VAT_RATE = 0.16;
  const expenseCategoryTaxBreakdown = expenses.reduce((acc, expense) => {
    const category = expense.category;
    const subtotal = expense.amount;
    const iva = expense.tax_amount || (subtotal * VAT_RATE);
    
    if (!acc[category]) {
      acc[category] = { subtotal: 0, iva: 0, total: 0, count: 0 };
    }
    
    acc[category].subtotal += subtotal;
    acc[category].iva += iva;
    acc[category].total += subtotal + iva;
    acc[category].count += 1;
    
    return acc;
  }, {} as Record<string, { subtotal: number; iva: number; total: number; count: number }>);

  const incomeCategoryTaxBreakdown = incomes.reduce((acc, income) => {
    const category = income.category;
    const subtotal = income.amount;
    const iva = income.tax_amount || (subtotal * VAT_RATE);
    
    if (!acc[category]) {
      acc[category] = { subtotal: 0, iva: 0, total: 0, count: 0 };
    }
    
    acc[category].subtotal += subtotal;
    acc[category].iva += iva;
    acc[category].total += subtotal + iva;
    acc[category].count += 1;
    
    return acc;
  }, {} as Record<string, { subtotal: number; iva: number; total: number; count: number }>);

  // Análisis mensual
  const monthlyAnalysis = [...expenses, ...incomes].reduce((acc, item) => {
    const month = new Date(item.created_at).toLocaleDateString('es-MX', { 
      year: 'numeric', 
      month: 'long' 
    });
    
    if (!acc[month]) {
      acc[month] = { 
        income: 0, 
        expense: 0, 
        incomeTax: 0, 
        expenseTax: 0, 
        netProfit: 0,
        cfdiCount: 0,
        complementsRequired: 0
      };
    }
    
    if ('payment_status' in item) {
      // Es un ingreso
      acc[month].income += item.amount;
      acc[month].incomeTax += item.tax_amount || 0;
      if (item.cfdi_document) acc[month].cfdiCount += 1;
      if (item.requires_complement) acc[month].complementsRequired += 1;
    } else {
      // Es un gasto
      acc[month].expense += item.amount;
      acc[month].expenseTax += item.tax_amount || 0;
      if (item.cfdi_document) acc[month].cfdiCount += 1;
      if (item.requires_complement) acc[month].complementsRequired += 1;
    }
    
    acc[month].netProfit = acc[month].income - acc[month].expense;
    
    return acc;
  }, {} as Record<string, { 
    income: number; 
    expense: number; 
    incomeTax: number; 
    expenseTax: number; 
    netProfit: number;
    cfdiCount: number;
    complementsRequired: number;
  }>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contabilidad Fiscal</h1>
          <p className="text-muted-foreground">Control contable y fiscal conforme a la legislación mexicana SAT</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
              <SelectItem value="2022">2022</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los meses</SelectItem>
              <SelectItem value="1">Enero</SelectItem>
              <SelectItem value="2">Febrero</SelectItem>
              <SelectItem value="3">Marzo</SelectItem>
              <SelectItem value="4">Abril</SelectItem>
              <SelectItem value="5">Mayo</SelectItem>
              <SelectItem value="6">Junio</SelectItem>
              <SelectItem value="7">Julio</SelectItem>
              <SelectItem value="8">Agosto</SelectItem>
              <SelectItem value="9">Septiembre</SelectItem>
              <SelectItem value="10">Octubre</SelectItem>
              <SelectItem value="11">Noviembre</SelectItem>
              <SelectItem value="12">Diciembre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>


      {/* Alertas de cumplimiento */}
      <div className="space-y-3">
        {expensesRequiringComplement.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>{expensesRequiringComplement.length}</strong> gastos requieren complemento de pago para cumplir con SAT
            </AlertDescription>
          </Alert>
        )}
        
        {incomesRequiringComplement.length > 0 && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <strong>{incomesRequiringComplement.length}</strong> ingresos necesitan envío de complemento de pago
            </AlertDescription>
          </Alert>
        )}

        {expenseComplianceRate < 80 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Solo el <strong>{expenseComplianceRate.toFixed(1)}%</strong> de gastos tiene CFDI. Se recomienda tener al menos 80% para cumplimiento fiscal.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIncomes)}</div>
            <p className="text-xs text-muted-foreground">
              Subtotal sin IVA
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos</CardTitle>
            <Calculator className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              Subtotal sin IVA
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilidad</CardTitle>
            <BookOpen className={`h-4 w-4 ${grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(grossProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              Antes de impuestos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IVA {ivaBalance >= 0 ? 'por Pagar' : 'a Favor'}</CardTitle>
            <CreditCard className={`h-4 w-4 ${ivaBalance >= 0 ? 'text-red-600' : 'text-green-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${ivaBalance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(Math.abs(ivaBalance))}
            </div>
            <p className="text-xs text-muted-foreground">
              Saldo IVA
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CFDI Válidos</CardTitle>
            <Receipt className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{validCFDI}</div>
            <p className="text-xs text-muted-foreground">
              {cfdiDocuments.length} total
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Resumen Fiscal</TabsTrigger>
          <TabsTrigger value="income-breakdown">Ingresos</TabsTrigger>
          <TabsTrigger value="expense-breakdown">Gastos</TabsTrigger>
          <TabsTrigger value="compliance">Cumplimiento</TabsTrigger>
          <TabsTrigger value="complements">Complementos</TabsTrigger>
          <TabsTrigger value="complement-management">Gestión PPD</TabsTrigger>
          <TabsTrigger value="monthly">Análisis Mensual</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Estado de Resultados SAT</CardTitle>
                <CardDescription>Resumen fiscal del período seleccionado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">Ingresos Totales</span>
                  <span className="text-green-600 font-bold">{formatCurrency(totalIncomes)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">IVA Cobrado (16%)</span>
                  <span className="text-green-600">{formatCurrency(totalIncomeTaxes)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">Gastos Deducibles</span>
                  <span className="text-red-600 font-bold">{formatCurrency(totalExpenses)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">IVA Pagado (16%)</span>
                  <span className="text-red-600">{formatCurrency(totalExpenseTaxes)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-t-2 border-primary">
                  <span className="font-bold">Utilidad Fiscal</span>
                  <span className={`font-bold text-lg ${grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(grossProfit)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="font-bold">Saldo IVA</span>
                  <span className={`font-bold ${ivaBalance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {ivaBalance >= 0 ? 'Por Pagar: ' : 'A Favor: '}{formatCurrency(Math.abs(ivaBalance))}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cumplimiento SAT</CardTitle>
                <CardDescription>Indicadores de cumplimiento fiscal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Gastos con CFDI</span>
                    <span className="text-sm font-bold">{expenseComplianceRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={expenseComplianceRate} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {expensesWithCFDI.length} de {expenses.length} gastos
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Ingresos con CFDI</span>
                    <span className="text-sm font-bold">{incomeComplianceRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={incomeComplianceRate} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {incomesWithCFDI.length} de {incomes.length} ingresos
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">{validCFDI}</div>
                    <div className="text-xs text-muted-foreground">Válidos</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">{pendingCFDI}</div>
                    <div className="text-xs text-muted-foreground">Pendientes</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">{cancelledCFDI}</div>
                    <div className="text-xs text-muted-foreground">Cancelados</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="income-breakdown">
          <Card>
            <CardHeader>
              <CardTitle>Desglose Fiscal de Ingresos</CardTitle>
              <CardDescription>
                Análisis de ingresos e IVA por categoría
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(incomeCategoryTaxBreakdown).map(([category, data]) => (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{categoryLabels[category as keyof typeof categoryLabels]}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {data.count} registro(s)
                        </Badge>
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          {formatCurrency(data.total)}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Subtotal:</span>
                        <div className="font-medium text-green-600">{formatCurrency(data.subtotal)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">IVA (16%):</span>
                        <div className="font-medium text-green-600">{formatCurrency(data.iva)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total con IVA:</span>
                        <div className="font-medium text-green-600">{formatCurrency(data.total)}</div>
                      </div>
                    </div>
                    
                    <Progress 
                      value={(data.total / (totalIncomes + totalIncomeTaxes)) * 100} 
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expense-breakdown">
          <Card>
            <CardHeader>
              <CardTitle>Desglose Fiscal de Gastos</CardTitle>
              <CardDescription>
                Análisis de gastos deducibles e IVA por categoría
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(expenseCategoryTaxBreakdown).map(([category, data]) => (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{categoryLabels[category as keyof typeof categoryLabels]}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {data.count} registro(s)
                        </Badge>
                        <Badge variant="outline" className="text-red-600 border-red-600">
                          {formatCurrency(data.total)}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Subtotal:</span>
                        <div className="font-medium text-red-600">{formatCurrency(data.subtotal)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">IVA Acreditable (16%):</span>
                        <div className="font-medium text-red-600">{formatCurrency(data.iva)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total con IVA:</span>
                        <div className="font-medium text-red-600">{formatCurrency(data.total)}</div>
                      </div>
                    </div>
                    
                    <Progress 
                      value={(data.total / (totalExpenses + totalExpenseTaxes)) * 100} 
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Análisis PUE vs PPD</CardTitle>
                <CardDescription>Forma de pago en CFDI</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>PUE (Pago en una Exhibición)</span>
                    <span className="font-bold">{pueExpenses.length + pueIncomes.length}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Gastos: {pueExpenses.length}</span>
                    <span>Ingresos: {pueIncomes.length}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>PPD (Pago en Parcialidades)</span>
                    <span className="font-bold">{ppdExpenses.length + ppdIncomes.length}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Gastos: {ppdExpenses.length}</span>
                    <span>Ingresos: {ppdIncomes.length}</span>
                  </div>
                </div>

                <Separator />
                
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Recordatorio:</strong> Los CFDI con forma de pago PPD requieren complemento de pago.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Documentos Sin CFDI</CardTitle>
                <CardDescription>Transacciones que requieren atención</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.filter(e => !e.cfdi_document).slice(0, 5).map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>
                          <Badge variant="destructive">Gasto</Badge>
                        </TableCell>
                        <TableCell className="max-w-48 truncate">{expense.description}</TableCell>
                        <TableCell>{formatCurrency(expense.amount)}</TableCell>
                        <TableCell>
                          <XMLUploader
                            expenseId={expense.id}
                            onSuccess={fetchExpenses}
                            className="w-fit"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {incomes.filter(i => !i.cfdi_document).slice(0, 5).map((income) => (
                      <TableRow key={income.id}>
                        <TableCell>
                          <Badge variant="secondary">Ingreso</Badge>
                        </TableCell>
                        <TableCell className="max-w-48 truncate">{income.description}</TableCell>
                        <TableCell>{formatCurrency(income.amount)}</TableCell>
                        <TableCell>
                          <XMLUploader
                            onSuccess={fetchIncomes}
                            className="w-fit"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="complements">
          <Card>
            <CardHeader>
              <CardTitle>Complementos de Pago</CardTitle>
              <CardDescription>
                Control de complementos de pago CFDI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>UUID Complemento</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Fecha Pago</TableHead>
                    <TableHead>Forma Pago</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentComplements.map((complement) => (
                    <TableRow key={complement.id}>
                      <TableCell className="font-mono text-xs">
                        {complement.complement_uuid.substring(0, 8)}...
                      </TableCell>
                      <TableCell>{formatCurrency(complement.monto_pago)}</TableCell>
                      <TableCell>{formatDate(complement.fecha_pago)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{complement.forma_pago}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getBadgeVariant(complement.status)}>
                          {complement.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewDocument(complement)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {paymentComplements.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No hay complementos de pago registrados
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="complement-management">
          <PPDComplianceManager />
        </TabsContent>

        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle>Análisis Mensual</CardTitle>
              <CardDescription>
                Resumen fiscal por mes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(monthlyAnalysis)
                  .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                  .slice(0, 12)
                  .map(([month, data]) => (
                  <div key={month} className="p-4 border rounded-lg space-y-3">
                    <h4 className="font-semibold text-lg">{month}</h4>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Ingresos</div>
                        <div className="font-bold text-green-600">{formatCurrency(data.income)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Gastos</div>
                        <div className="font-bold text-red-600">{formatCurrency(data.expense)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Utilidad</div>
                        <div className={`font-bold ${data.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(data.netProfit)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Saldo IVA</div>
                        <div className={`font-bold ${(data.incomeTax - data.expenseTax) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(Math.abs(data.incomeTax - data.expenseTax))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>CFDI procesados: {data.cfdiCount}</span>
                      <span>Complementos requeridos: {data.complementsRequired}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Document Viewer */}
      {selectedDocument && (
        <DocumentViewer
          isOpen={isDocumentViewerOpen}
          onClose={() => {
            setIsDocumentViewerOpen(false);
            setSelectedDocument(null);
          }}
          documentUrl={`https://ycbflvptfgrjclzzlxci.supabase.co/storage/v1/object/public/cfdi-documents/${selectedDocument.file_path}`}
          documentName={`CFDI-${selectedDocument.uuid_fiscal || selectedDocument.complement_uuid}.xml`}
          fileType="text/xml"
        />
      )}
    </div>
  );
}