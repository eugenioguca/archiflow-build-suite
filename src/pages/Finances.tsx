import { useState, useEffect } from 'react';
import { Plus, Search, Upload, Eye, Edit, Trash2, ArrowUpCircle, ArrowDownCircle, Receipt, FileText, DollarSign, TrendingUp, Calendar, Building, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { XMLUploader } from '@/components/XMLUploader';
import { DocumentViewer } from '@/components/DocumentViewer';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CFDIDocument {
  id: string;
  uuid_fiscal: string;
  rfc_emisor: string;
  rfc_receptor: string;
  total: number;
  iva: number;
  fecha_emision: string;
  status: string;
  file_path: string;
  expense_id?: string;
  income_id?: string;
  tipo_comprobante: string;
  uso_cfdi?: string;
  forma_pago?: string;
  metodo_pago?: string;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: 'administration' | 'sales' | 'financial' | 'construction';
  invoice_number: string | null;
  invoice_date: string | null;
  tax_amount: number | null;
  created_at: string;
  project?: {
    id: string;
    project_name: string;
  };
  client?: {
    id: string;
    full_name: string;
  };
  supplier?: {
    id: string;
    company_name: string;
  };
  created_by: {
    id: string;
    full_name: string;
  };
  cfdi_document?: CFDIDocument;
  status_cfdi: string;
  requires_complement: boolean;
  complement_received: boolean;
  payment_method?: string;
  bank_account?: string;
  reference_number?: string;
}

interface Income {
  id: string;
  description: string;
  amount: number;
  category: 'construction_service' | 'consultation' | 'project_management' | 'maintenance' | 'other';
  invoice_number: string | null;
  invoice_date: string | null;
  tax_amount: number | null;
  payment_status: 'pending' | 'partial' | 'paid' | 'overdue';
  payment_date: string | null;
  created_at: string;
  project?: {
    id: string;
    project_name: string;
  };
  client?: {
    id: string;
    full_name: string;
  };
  created_by: {
    id: string;
    full_name: string;
  };
  cfdi_document?: CFDIDocument;
  status_cfdi: string;
  requires_complement: boolean;
  complement_sent: boolean;
}

interface Client {
  id: string;
  full_name: string;
}

interface Project {
  id: string;
  project_name: string;
  client: {
    full_name: string;
  };
}

interface Supplier {
  id: string;
  company_name: string;
  rfc?: string;
}

interface AccountsPayable {
  id: string;
  supplier_id: string;
  amount_due: number;
  amount_paid: number;
  due_date: string;
  payment_status: string;
  supplier?: {
    company_name: string;
  };
}

interface AccountsReceivable {
  id: string;
  client_id: string;
  amount_due: number;
  amount_paid: number;
  due_date: string;
  status: string;
  client?: {
    full_name: string;
  };
}

const expenseCategoryLabels = {
  administration: 'Administración',
  sales: 'Ventas',
  financial: 'Financieros',
  construction: 'Construcción'
};

const incomeCategoryLabels = {
  construction_service: 'Servicio de Construcción',
  consultation: 'Consultoría',
  project_management: 'Gestión de Proyectos',
  maintenance: 'Mantenimiento',
  other: 'Otros'
};

const paymentStatusLabels = {
  pending: 'Pendiente',
  partial: 'Parcial',
  paid: 'Pagado',
  overdue: 'Vencido'
};

const cfdiStatusLabels = {
  pending: 'Pendiente',
  valid: 'Válido',
  cancelled: 'Cancelado',
  error: 'Error'
};

export default function Finances() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [accountsPayable, setAccountsPayable] = useState<AccountsPayable[]>([]);
  const [accountsReceivable, setAccountsReceivable] = useState<AccountsReceivable[]>([]);
  const [cfdiDocuments, setCfdiDocuments] = useState<CFDIDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDocument, setSelectedDocument] = useState<CFDIDocument | null>(null);
  const [isDocumentViewerOpen, setIsDocumentViewerOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{type: 'expense' | 'income', id: string} | null>(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchExpenses(),
        fetchIncomes(),
        fetchClients(),
        fetchProjects(),
        fetchSuppliers(),
        fetchAccountsPayable(),
        fetchAccountsReceivable(),
        fetchCFDIDocuments()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          project:client_projects(id, project_name),
          client:clients(id, full_name),
          supplier:suppliers(id, company_name),
          created_by:profiles!expenses_created_by_fkey(id, full_name),
          cfdi_document:cfdi_documents(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const fetchIncomes = async () => {
    try {
      const { data, error } = await supabase
        .from('incomes')
        .select(`
          *,
          project:client_projects(id, project_name),
          client:clients(id, full_name),
          cfdi_document:cfdi_documents(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Add created_by data manually since the foreign key relation might not be properly configured
      const incomesWithCreatedBy = (data || []).map(income => ({
        ...income,
        created_by: { id: income.created_by, full_name: 'Usuario' }
      }));
      
      setIncomes(incomesWithCreatedBy);
    } catch (error) {
      console.error('Error fetching incomes:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name')
        .order('full_name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('client_projects')
        .select(`
          id, 
          project_name,
          client:clients(full_name)
        `)
        .order('project_name');

      if (error) throw error;
      setProjects((data || []).map(p => ({ ...p, name: p.project_name })));
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, company_name, rfc')
        .eq('status', 'active')
        .order('company_name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchAccountsPayable = async () => {
    try {
      // Use expenses as accounts payable since the table was deleted
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          id,
          description,
          amount,
          created_at,
          supplier:suppliers(company_name)
        `)
        .not('supplier_id', 'is', null)
        .order('created_at');

      if (error) throw error;
      
      // Transform expenses to match AccountsPayable interface
      const transformedData = (data || []).map(expense => ({
        id: expense.id,
        supplier_id: '',
        amount_due: expense.amount,
        amount_paid: 0,
        due_date: expense.created_at,
        payment_status: 'pending',
        supplier: expense.supplier
      }));
      
      setAccountsPayable(transformedData);
    } catch (error) {
      console.error('Error fetching accounts payable:', error);
    }
  };

  const fetchAccountsReceivable = async () => {
    try {
      // Use incomes as accounts receivable since the table was deleted
      const { data, error } = await supabase
        .from('incomes')
        .select(`
          id,
          description,
          amount,
          payment_date,
          payment_status,
          client:clients(full_name)
        `)
        .not('client_id', 'is', null)
        .order('payment_date');

      if (error) throw error;
      
      // Transform incomes to match AccountsReceivable interface
      const transformedData = (data || []).map(income => ({
        id: income.id,
        client_id: '',
        amount_due: income.amount,
        amount_paid: income.payment_status === 'paid' ? income.amount : 0,
        due_date: income.payment_date || new Date().toISOString(),
        status: income.payment_status || 'pending',
        client: income.client
      }));
      
      setAccountsReceivable(transformedData);
    } catch (error) {
      console.error('Error fetching accounts receivable:', error);
    }
  };

  const fetchCFDIDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('cfdi_documents')
        .select('*')
        .order('fecha_emision', { ascending: false });

      if (error) throw error;
      setCfdiDocuments(data || []);
    } catch (error) {
      console.error('Error fetching CFDI documents:', error);
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.user.id)
        .single();

      if (!profile) throw new Error('Perfil no encontrado');

      const expenseData = {
        description: formData.get('description') as string,
        amount: parseFloat(formData.get('amount') as string),
        category: formData.get('category') as 'administration' | 'sales' | 'financial' | 'construction',
        invoice_number: formData.get('invoice_number') as string || null,
        invoice_date: formData.get('invoice_date') as string || null,
        tax_amount: formData.get('tax_amount') ? parseFloat(formData.get('tax_amount') as string) : null,
        project_id: (formData.get('project_id') as string) === 'none' ? null : (formData.get('project_id') as string || null),
        client_id: (formData.get('client_id') as string) === 'none' ? null : (formData.get('client_id') as string || null),
        supplier_id: (formData.get('supplier_id') as string) === 'none' ? null : (formData.get('supplier_id') as string || null),
        payment_method: formData.get('payment_method') as string || null,
        bank_account: formData.get('bank_account') as string || null,
        reference_number: formData.get('reference_number') as string || null,
        created_by: profile.id,
      };

      if (editingExpense) {
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', editingExpense.id);
        
        if (error) throw error;
        
        toast({
          title: "Gasto actualizado",
          description: "El gasto se actualizó correctamente",
        });
      } else {
        const { error } = await supabase
          .from('expenses')
          .insert([expenseData]);
        
        if (error) throw error;
        
        toast({
          title: "Gasto registrado",
          description: "El nuevo gasto se registró correctamente",
        });
      }
      
      setIsExpenseDialogOpen(false);
      setEditingExpense(null);
      fetchExpenses();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar el gasto",
        variant: "destructive",
      });
    }
  };

  const handleIncomeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.user.id)
        .single();

      if (!profile) throw new Error('Perfil no encontrado');

      const incomeData = {
        description: formData.get('description') as string,
        amount: parseFloat(formData.get('amount') as string),
        category: formData.get('category') as 'construction_service' | 'consultation' | 'project_management' | 'maintenance' | 'other',
        invoice_number: formData.get('invoice_number') as string || null,
        invoice_date: formData.get('invoice_date') as string || null,
        tax_amount: formData.get('tax_amount') ? parseFloat(formData.get('tax_amount') as string) : null,
        payment_status: formData.get('payment_status') as 'pending' | 'partial' | 'paid' | 'overdue',
        payment_date: formData.get('payment_date') as string || null,
        project_id: (formData.get('project_id') as string) === 'none' ? null : (formData.get('project_id') as string || null),
        client_id: (formData.get('client_id') as string) === 'none' ? null : (formData.get('client_id') as string || null),
        created_by: profile.id,
      };

      if (editingIncome) {
        const { error } = await supabase
          .from('incomes')
          .update(incomeData)
          .eq('id', editingIncome.id);
        
        if (error) throw error;
        
        toast({
          title: "Ingreso actualizado",
          description: "El ingreso se actualizó correctamente",
        });
      } else {
        const { error } = await supabase
          .from('incomes')
          .insert([incomeData]);
        
        if (error) throw error;
        
        toast({
          title: "Ingreso registrado",
          description: "El nuevo ingreso se registró correctamente",
        });
      }
      
      setIsIncomeDialogOpen(false);
      setEditingIncome(null);
      fetchIncomes();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar el ingreso",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      const table = itemToDelete.type === 'expense' ? 'expenses' : 'incomes';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', itemToDelete.id);

      if (error) throw error;

      toast({
        title: `${itemToDelete.type === 'expense' ? 'Gasto' : 'Ingreso'} eliminado`,
        description: `El ${itemToDelete.type === 'expense' ? 'gasto' : 'ingreso'} se eliminó correctamente`,
      });
      
      if (itemToDelete.type === 'expense') {
        fetchExpenses();
      } else {
        fetchIncomes();
      }
      
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (error) {
      toast({
        title: "Error",
        description: `No se pudo eliminar el ${itemToDelete.type === 'expense' ? 'gasto' : 'ingreso'}`,
        variant: "destructive",
      });
    }
  };

  const openDeleteDialog = (type: 'expense' | 'income', id: string) => {
    setItemToDelete({ type, id });
    setDeleteDialogOpen(true);
  };

  const viewCFDIDocument = (document: CFDIDocument) => {
    setSelectedDocument(document);
    setIsDocumentViewerOpen(true);
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid':
      case 'valid':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'overdue':
      case 'cancelled':
        return 'destructive';
      case 'partial':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  // Cálculos financieros
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalIncomes = incomes.reduce((sum, income) => sum + income.amount, 0);
  const netProfit = totalIncomes - totalExpenses;
  const totalTaxes = expenses.reduce((sum, expense) => sum + (expense.tax_amount || 0), 0) + 
                    incomes.reduce((sum, income) => sum + (income.tax_amount || 0), 0);

  // Cuentas por pagar y cobrar
  const totalPayable = accountsPayable.reduce((sum, ap) => sum + (ap.amount_due - ap.amount_paid), 0);
  const totalReceivable = accountsReceivable.reduce((sum, ar) => sum + (ar.amount_due - ar.amount_paid), 0);

  // Documentos CFDI por estado
  const cfdiByStatus = cfdiDocuments.reduce((acc, doc) => {
    acc[doc.status] = (acc[doc.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filteredExpenses = expenses.filter(expense =>
    expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.supplier?.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredIncomes = incomes.filter(income =>
    income.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    income.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    income.client?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold">Gestión Financiera</h1>
          <p className="text-muted-foreground">Control completo de ingresos, gastos y documentos fiscales</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsExpenseDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Gasto
          </Button>
          <Button onClick={() => setIsIncomeDialogOpen(true)} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Ingreso
          </Button>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIncomes)}</div>
            <p className="text-xs text-muted-foreground">
              {incomes.length} registro(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              {expenses.length} registro(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilidad</CardTitle>
            <TrendingUp className={`h-4 w-4 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(netProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              Neta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por Cobrar</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalReceivable)}</div>
            <p className="text-xs text-muted-foreground">
              Cuentas pendientes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por Pagar</CardTitle>
            <Receipt className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalPayable)}</div>
            <p className="text-xs text-muted-foreground">
              Proveedores
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Buscador */}
      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por descripción, número de factura o proveedor/cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="expenses">Gastos</TabsTrigger>
          <TabsTrigger value="incomes">Ingresos</TabsTrigger>
          <TabsTrigger value="accounts">Cuentas</TabsTrigger>
          <TabsTrigger value="cfdi">CFDI</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Resumen Financiero</CardTitle>
                <CardDescription>Indicadores principales del período</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">Total Ingresos</span>
                  <span className="text-green-600 font-bold">{formatCurrency(totalIncomes)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">Total Gastos</span>
                  <span className="text-red-600 font-bold">{formatCurrency(totalExpenses)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">Cuentas por Cobrar</span>
                  <span className="text-blue-600">{formatCurrency(totalReceivable)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">Cuentas por Pagar</span>
                  <span className="text-orange-600">{formatCurrency(totalPayable)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center py-2">
                  <span className="font-bold text-lg">Utilidad Neta</span>
                  <span className={`font-bold text-lg ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(netProfit)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estado CFDI</CardTitle>
                <CardDescription>Documentos fiscales por estado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(cfdiByStatus).map(([status, count]) => (
                  <div key={status} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusBadgeVariant(status)}>
                        {cfdiStatusLabels[status as keyof typeof cfdiStatusLabels] || status}
                      </Badge>
                    </div>
                    <span className="font-medium">{count} documento(s)</span>
                  </div>
                ))}
                {cfdiDocuments.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    No hay documentos CFDI registrados
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle>Gastos</CardTitle>
              <CardDescription>
                Registro de gastos y documentos fiscales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Factura</TableHead>
                    <TableHead>CFDI</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">{expense.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {expenseCategoryLabels[expense.category]}
                        </Badge>
                      </TableCell>
                      <TableCell>{expense.supplier?.company_name || 'N/A'}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(expense.amount)}</TableCell>
                      <TableCell>
                        {expense.invoice_number ? (
                          <Badge variant="default">{expense.invoice_number}</Badge>
                        ) : (
                          <Badge variant="secondary">Sin factura</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {expense.cfdi_document ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewCFDIDocument(expense.cfdi_document!)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        ) : (
                          <XMLUploader
                            expenseId={expense.id}
                            supplierId={expense.supplier?.id}
                            onSuccess={fetchExpenses}
                            className="w-fit"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              •••
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => {
                              setEditingExpense(expense);
                              setIsExpenseDialogOpen(true);
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog('expense', expense.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredExpenses.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No se encontraron gastos
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incomes">
          <Card>
            <CardHeader>
              <CardTitle>Ingresos</CardTitle>
              <CardDescription>
                Registro de ingresos y facturación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Factura</TableHead>
                    <TableHead>CFDI</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIncomes.map((income) => (
                    <TableRow key={income.id}>
                      <TableCell className="font-medium">{income.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {incomeCategoryLabels[income.category]}
                        </Badge>
                      </TableCell>
                      <TableCell>{income.client?.full_name || 'N/A'}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(income.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(income.payment_status)}>
                          {paymentStatusLabels[income.payment_status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {income.invoice_number ? (
                          <Badge variant="default">{income.invoice_number}</Badge>
                        ) : (
                          <Badge variant="secondary">Sin factura</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {income.cfdi_document ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewCFDIDocument(income.cfdi_document!)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        ) : (
                          <XMLUploader
                            onSuccess={fetchIncomes}
                            className="w-fit"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              •••
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => {
                              setEditingIncome(income);
                              setIsIncomeDialogOpen(true);
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog('income', income.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredIncomes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No se encontraron ingresos
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Cuentas por Cobrar</CardTitle>
                <CardDescription>Pendientes de cobro a clientes</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accountsReceivable.map((ar) => (
                      <TableRow key={ar.id}>
                        <TableCell>{ar.client?.full_name}</TableCell>
                        <TableCell>{formatCurrency(ar.amount_due - ar.amount_paid)}</TableCell>
                        <TableCell>{formatDate(ar.due_date)}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(ar.status)}>
                            {ar.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cuentas por Pagar</CardTitle>
                <CardDescription>Pendientes de pago a proveedores</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accountsPayable.map((ap) => (
                      <TableRow key={ap.id}>
                        <TableCell>{ap.supplier?.company_name}</TableCell>
                        <TableCell>{formatCurrency(ap.amount_due - ap.amount_paid)}</TableCell>
                        <TableCell>{formatDate(ap.due_date)}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(ap.payment_status)}>
                            {ap.payment_status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cfdi">
          <Card>
            <CardHeader>
              <CardTitle>Documentos CFDI</CardTitle>
              <CardDescription>
                Comprobantes fiscales digitales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>UUID</TableHead>
                    <TableHead>RFC Emisor</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cfdiDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-mono text-xs">
                        {doc.uuid_fiscal.substring(0, 8)}...
                      </TableCell>
                      <TableCell>{doc.rfc_emisor}</TableCell>
                      <TableCell>{formatCurrency(doc.total)}</TableCell>
                      <TableCell>{formatDate(doc.fecha_emision)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{doc.tipo_comprobante}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(doc.status)}>
                          {cfdiStatusLabels[doc.status as keyof typeof cfdiStatusLabels] || doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewCFDIDocument(doc)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {cfdiDocuments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No hay documentos CFDI registrados
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para nuevo/editar gasto */}
      <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? 'Editar Gasto' : 'Nuevo Gasto'}
            </DialogTitle>
            <DialogDescription>
              Complete los datos del gasto. Los campos con * son obligatorios.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleExpenseSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="description">Descripción *</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editingExpense?.description}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="amount">Monto *</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  defaultValue={editingExpense?.amount}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="category">Categoría *</Label>
                <Select name="category" defaultValue={editingExpense?.category}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(expenseCategoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="supplier_id">Proveedor</Label>
                <Select name="supplier_id" defaultValue={editingExpense?.supplier?.id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin proveedor</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="project_id">Proyecto</Label>
                <Select name="project_id" defaultValue={editingExpense?.project?.id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin proyecto</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.project_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="invoice_number">Número de Factura</Label>
                <Input
                  id="invoice_number"
                  name="invoice_number"
                  defaultValue={editingExpense?.invoice_number || ''}
                />
              </div>
              
              <div>
                <Label htmlFor="invoice_date">Fecha de Factura</Label>
                <Input
                  id="invoice_date"
                  name="invoice_date"
                  type="date"
                  defaultValue={editingExpense?.invoice_date || ''}
                />
              </div>
              
              <div>
                <Label htmlFor="tax_amount">IVA</Label>
                <Input
                  id="tax_amount"
                  name="tax_amount"
                  type="number"
                  step="0.01"
                  defaultValue={editingExpense?.tax_amount || ''}
                />
              </div>
              
              <div>
                <Label htmlFor="payment_method">Método de Pago</Label>
                <Input
                  id="payment_method"
                  name="payment_method"
                  defaultValue={editingExpense?.payment_method || ''}
                />
              </div>
              
              <div>
                <Label htmlFor="bank_account">Cuenta Bancaria</Label>
                <Input
                  id="bank_account"
                  name="bank_account"
                  defaultValue={editingExpense?.bank_account || ''}
                />
              </div>
              
              <div>
                <Label htmlFor="reference_number">Número de Referencia</Label>
                <Input
                  id="reference_number"
                  name="reference_number"
                  defaultValue={editingExpense?.reference_number || ''}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsExpenseDialogOpen(false);
                  setEditingExpense(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {editingExpense ? 'Actualizar' : 'Guardar'} Gasto
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para nuevo/editar ingreso */}
      <Dialog open={isIncomeDialogOpen} onOpenChange={setIsIncomeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingIncome ? 'Editar Ingreso' : 'Nuevo Ingreso'}
            </DialogTitle>
            <DialogDescription>
              Complete los datos del ingreso. Los campos con * son obligatorios.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleIncomeSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="description">Descripción *</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editingIncome?.description}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="amount">Monto *</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  defaultValue={editingIncome?.amount}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="category">Categoría *</Label>
                <Select name="category" defaultValue={editingIncome?.category}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(incomeCategoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="client_id">Cliente</Label>
                <Select name="client_id" defaultValue={editingIncome?.client?.id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin cliente</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="project_id">Proyecto</Label>
                <Select name="project_id" defaultValue={editingIncome?.project?.id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin proyecto</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.project_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="payment_status">Estado de Pago *</Label>
                <Select name="payment_status" defaultValue={editingIncome?.payment_status}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(paymentStatusLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="invoice_number">Número de Factura</Label>
                <Input
                  id="invoice_number"
                  name="invoice_number"
                  defaultValue={editingIncome?.invoice_number || ''}
                />
              </div>
              
              <div>
                <Label htmlFor="invoice_date">Fecha de Factura</Label>
                <Input
                  id="invoice_date"
                  name="invoice_date"
                  type="date"
                  defaultValue={editingIncome?.invoice_date || ''}
                />
              </div>
              
              <div>
                <Label htmlFor="payment_date">Fecha de Pago</Label>
                <Input
                  id="payment_date"
                  name="payment_date"
                  type="date"
                  defaultValue={editingIncome?.payment_date || ''}
                />
              </div>
              
              <div>
                <Label htmlFor="tax_amount">IVA</Label>
                <Input
                  id="tax_amount"
                  name="tax_amount"
                  type="number"
                  step="0.01"
                  defaultValue={editingIncome?.tax_amount || ''}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsIncomeDialogOpen(false);
                  setEditingIncome(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {editingIncome ? 'Actualizar' : 'Guardar'} Ingreso
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Document Viewer */}
      {selectedDocument && (
        <DocumentViewer
          isOpen={isDocumentViewerOpen}
          onClose={() => {
            setIsDocumentViewerOpen(false);
            setSelectedDocument(null);
          }}
          documentUrl={`https://ycbflvptfgrjclzzlxci.supabase.co/storage/v1/object/public/cfdi-documents/${selectedDocument.file_path}`}
          documentName={`CFDI-${selectedDocument.uuid_fiscal}.xml`}
          fileType="text/xml"
        />
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar este {itemToDelete?.type === 'expense' ? 'gasto' : 'ingreso'}? 
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}