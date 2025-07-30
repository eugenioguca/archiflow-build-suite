import { useState, useEffect } from 'react';
import { Plus, Search, DollarSign, MoreHorizontal, Edit, Trash2, TrendingUp, TrendingDown, Receipt, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
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
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
    name: string;
  };
  client?: {
    id: string;
    full_name: string;
  };
  created_by: {
    id: string;
    full_name: string;
  };
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
    name: string;
  };
  client?: {
    id: string;
    full_name: string;
  };
  created_by: {
    id: string;
    full_name: string;
  };
}

interface Client {
  id: string;
  full_name: string;
}

interface Project {
  id: string;
  name: string;
  client: {
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

const paymentStatusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  partial: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800'
};

export default function Finances() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchExpenses(),
        fetchIncomes(),
        fetchClients(),
        fetchProjects()
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
          project:projects(id, name),
          client:clients(id, full_name),
          created_by:profiles!expenses_created_by_fkey(id, full_name)
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
          project:projects(id, name),
          client:clients(id, full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Add mock created_by for now since relation doesn't exist yet
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
        .from('projects')
        .select(`
          id, 
          name,
          client:clients(full_name)
        `)
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
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
        project_id: formData.get('project_id') as string || null,
        client_id: formData.get('client_id') as string || null,
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
        project_id: formData.get('project_id') as string || null,
        client_id: formData.get('client_id') as string || null,
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

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este gasto?')) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;

      toast({
        title: "Gasto eliminado",
        description: "El gasto se eliminó correctamente",
      });
      
      fetchExpenses();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el gasto",
        variant: "destructive",
      });
    }
  };

  const handleDeleteIncome = async (incomeId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este ingreso?')) return;

    try {
      const { error } = await supabase
        .from('incomes')
        .delete()
        .eq('id', incomeId);

      if (error) throw error;

      toast({
        title: "Ingreso eliminado",
        description: "El ingreso se eliminó correctamente",
      });
      
      fetchIncomes();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el ingreso",
        variant: "destructive",
      });
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

  // Cálculos financieros
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalIncomes = incomes.reduce((sum, income) => sum + income.amount, 0);
  const netProfit = totalIncomes - totalExpenses;
  const taxableIncomes = incomes.reduce((sum, income) => sum + (income.tax_amount || 0), 0);
  const taxableExpenses = expenses.reduce((sum, expense) => sum + (expense.tax_amount || 0), 0);

  // Ingresos por estado de pago
  const incomesByStatus = incomes.reduce((acc, income) => {
    acc[income.payment_status] = (acc[income.payment_status] || 0) + income.amount;
    return acc;
  }, {} as Record<string, number>);

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
          <p className="text-muted-foreground">Control completo de ingresos y gastos</p>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIncomes)}</div>
            <p className="text-xs text-muted-foreground">
              {incomes.length} ingreso(s) registrado(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Totales</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              {expenses.length} gasto(s) registrado(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilidad Neta</CardTitle>
            <TrendingUp className={`h-4 w-4 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(netProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              {netProfit >= 0 ? 'Ganancia' : 'Pérdida'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IVA por Cobrar</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(taxableIncomes - taxableExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              Diferencia de IVA
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="incomes">Ingresos</TabsTrigger>
          <TabsTrigger value="expenses">Gastos</TabsTrigger>
          <TabsTrigger value="cashflow">Flujo de Efectivo</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Estado de Pagos */}
            <Card>
              <CardHeader>
                <CardTitle>Estado de Pagos por Cobrar</CardTitle>
                <CardDescription>Distribución de ingresos por estado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(incomesByStatus).map(([status, amount]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={paymentStatusColors[status as keyof typeof paymentStatusColors]}>
                        {paymentStatusLabels[status as keyof typeof paymentStatusLabels]}
                      </Badge>
                    </div>
                    <div className="font-medium">{formatCurrency(amount)}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Gastos por Categoría */}
            <Card>
              <CardHeader>
                <CardTitle>Gastos por Categoría</CardTitle>
                <CardDescription>Distribución de gastos operativos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(expenseCategoryLabels).map(([key, label]) => {
                  const amount = expenses.filter(e => e.category === key).reduce((sum, e) => sum + e.amount, 0);
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <div className="text-sm font-medium">{label}</div>
                      <div className="font-medium">{formatCurrency(amount)}</div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="incomes">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowUpCircle className="h-5 w-5 text-green-600" />
                    Gestión de Ingresos
                  </CardTitle>
                  <CardDescription>
                    Administra facturas, cobros y servicios prestados
                  </CardDescription>
                </div>
                <Dialog open={isIncomeDialogOpen} onOpenChange={setIsIncomeDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setEditingIncome(null)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Registrar Ingreso
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingIncome ? 'Editar Ingreso' : 'Registrar Nuevo Ingreso'}
                      </DialogTitle>
                      <DialogDescription>
                        {editingIncome ? 'Modifica los datos del ingreso' : 'Agrega un nuevo ingreso al sistema'}
                      </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleIncomeSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="description">Descripción *</Label>
                        <Input
                          id="description"
                          name="description"
                          defaultValue={editingIncome?.description || ''}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="amount">Monto *</Label>
                          <Input
                            id="amount"
                            name="amount"
                            type="number"
                            step="0.01"
                            defaultValue={editingIncome?.amount || ''}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="category">Categoría *</Label>
                          <Select name="category" defaultValue={editingIncome?.category || 'construction_service'} required>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="construction_service">Servicio de Construcción</SelectItem>
                              <SelectItem value="consultation">Consultoría</SelectItem>
                              <SelectItem value="project_management">Gestión de Proyectos</SelectItem>
                              <SelectItem value="maintenance">Mantenimiento</SelectItem>
                              <SelectItem value="other">Otros</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="payment_status">Estado de Pago *</Label>
                          <Select name="payment_status" defaultValue={editingIncome?.payment_status || 'pending'} required>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pendiente</SelectItem>
                              <SelectItem value="partial">Parcial</SelectItem>
                              <SelectItem value="paid">Pagado</SelectItem>
                              <SelectItem value="overdue">Vencido</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="tax_amount">IVA (16%)</Label>
                          <Input
                            id="tax_amount"
                            name="tax_amount"
                            type="number"
                            step="0.01"
                            defaultValue={editingIncome?.tax_amount || ''}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="invoice_number">No. Factura</Label>
                          <Input
                            id="invoice_number"
                            name="invoice_number"
                            defaultValue={editingIncome?.invoice_number || ''}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="invoice_date">Fecha Factura</Label>
                          <Input
                            id="invoice_date"
                            name="invoice_date"
                            type="date"
                            defaultValue={editingIncome?.invoice_date || ''}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="payment_date">Fecha de Pago</Label>
                        <Input
                          id="payment_date"
                          name="payment_date"
                          type="date"
                          defaultValue={editingIncome?.payment_date || ''}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="client_id">Cliente (Opcional)</Label>
                        <Select name="client_id" defaultValue={editingIncome?.client?.id || ''}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar cliente" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="project_id">Proyecto (Opcional)</Label>
                        <Select name="project_id" defaultValue={editingIncome?.project?.id || ''}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar proyecto" />
                          </SelectTrigger>
                          <SelectContent>
                            {projects.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name} - {project.client.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button type="submit" className="flex-1">
                          {editingIncome ? 'Actualizar' : 'Registrar'} Ingreso
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setIsIncomeDialogOpen(false)}>
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Cliente/Proyecto</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomes.map((income) => (
                    <TableRow key={income.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{income.description}</div>
                          {income.invoice_number && (
                            <div className="text-sm text-muted-foreground">
                              Factura: {income.invoice_number}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {incomeCategoryLabels[income.category]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-green-600">{formatCurrency(income.amount)}</div>
                        {income.tax_amount && (
                          <div className="text-sm text-muted-foreground">
                            IVA: {formatCurrency(income.tax_amount)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={paymentStatusColors[income.payment_status]}>
                          {paymentStatusLabels[income.payment_status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {income.client && <div>{income.client.full_name}</div>}
                          {income.project && <div className="text-muted-foreground">{income.project.name}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{formatDate(income.created_at)}</div>
                          {income.payment_date && (
                            <div className="text-muted-foreground">
                              Pagado: {formatDate(income.payment_date)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingIncome(income);
                                setIsIncomeDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteIncome(income.id)}
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowDownCircle className="h-5 w-5 text-red-600" />
                    Gestión de Gastos
                  </CardTitle>
                  <CardDescription>
                    Control de gastos operativos y administrativos
                  </CardDescription>
                </div>
                <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setEditingExpense(null)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Registrar Gasto
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingExpense ? 'Editar Gasto' : 'Registrar Nuevo Gasto'}
                      </DialogTitle>
                      <DialogDescription>
                        {editingExpense ? 'Modifica los datos del gasto' : 'Agrega un nuevo gasto al sistema'}
                      </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleExpenseSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="description">Descripción *</Label>
                        <Input
                          id="description"
                          name="description"
                          defaultValue={editingExpense?.description || ''}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="amount">Monto *</Label>
                          <Input
                            id="amount"
                            name="amount"
                            type="number"
                            step="0.01"
                            defaultValue={editingExpense?.amount || ''}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="category">Categoría *</Label>
                          <Select name="category" defaultValue={editingExpense?.category || 'administration'} required>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="administration">Administración</SelectItem>
                              <SelectItem value="sales">Ventas</SelectItem>
                              <SelectItem value="financial">Financieros</SelectItem>
                              <SelectItem value="construction">Construcción</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="invoice_number">No. Factura</Label>
                          <Input
                            id="invoice_number"
                            name="invoice_number"
                            defaultValue={editingExpense?.invoice_number || ''}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="invoice_date">Fecha Factura</Label>
                          <Input
                            id="invoice_date"
                            name="invoice_date"
                            type="date"
                            defaultValue={editingExpense?.invoice_date || ''}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tax_amount">Impuestos</Label>
                        <Input
                          id="tax_amount"
                          name="tax_amount"
                          type="number"
                          step="0.01"
                          defaultValue={editingExpense?.tax_amount || ''}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="client_id">Cliente (Opcional)</Label>
                        <Select name="client_id" defaultValue={editingExpense?.client?.id || ''}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar cliente" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="project_id">Proyecto (Opcional)</Label>
                        <Select name="project_id" defaultValue={editingExpense?.project?.id || ''}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar proyecto" />
                          </SelectTrigger>
                          <SelectContent>
                            {projects.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name} - {project.client.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button type="submit" className="flex-1">
                          {editingExpense ? 'Actualizar' : 'Registrar'} Gasto
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setIsExpenseDialogOpen(false)}>
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Cliente/Proyecto</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{expense.description}</div>
                          {expense.invoice_number && (
                            <div className="text-sm text-muted-foreground">
                              Factura: {expense.invoice_number}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {expenseCategoryLabels[expense.category]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-red-600">{formatCurrency(expense.amount)}</div>
                        {expense.tax_amount && (
                          <div className="text-sm text-muted-foreground">
                            IVA: {formatCurrency(expense.tax_amount)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {expense.client && <div>{expense.client.full_name}</div>}
                          {expense.project && <div className="text-muted-foreground">{expense.project.name}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(expense.created_at)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingExpense(expense);
                                setIsExpenseDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteExpense(expense.id)}
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cashflow">
          <Card>
            <CardHeader>
              <CardTitle>Flujo de Efectivo</CardTitle>
              <CardDescription>Análisis de entradas y salidas de efectivo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Resumen del flujo de efectivo */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Ingresos del Mes</div>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(
                        incomes
                          .filter(i => new Date(i.created_at).getMonth() === new Date().getMonth())
                          .reduce((sum, i) => sum + i.amount, 0)
                      )}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Gastos del Mes</div>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(
                        expenses
                          .filter(e => new Date(e.created_at).getMonth() === new Date().getMonth())
                          .reduce((sum, e) => sum + e.amount, 0)
                      )}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Flujo Neto del Mes</div>
                    <div className={`text-2xl font-bold ${
                      (incomes.filter(i => new Date(i.created_at).getMonth() === new Date().getMonth()).reduce((sum, i) => sum + i.amount, 0) -
                       expenses.filter(e => new Date(e.created_at).getMonth() === new Date().getMonth()).reduce((sum, e) => sum + e.amount, 0)) >= 0 
                      ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(
                        incomes.filter(i => new Date(i.created_at).getMonth() === new Date().getMonth()).reduce((sum, i) => sum + i.amount, 0) -
                        expenses.filter(e => new Date(e.created_at).getMonth() === new Date().getMonth()).reduce((sum, e) => sum + e.amount, 0)
                      )}
                    </div>
                  </div>
                </div>

                {/* Pendientes por cobrar */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Cuentas por Cobrar</h3>
                  <div className="space-y-2">
                    {incomes.filter(i => i.payment_status === 'pending' || i.payment_status === 'partial').map((income) => (
                      <div key={income.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{income.description}</div>
                          <div className="text-sm text-muted-foreground">
                            {income.client?.full_name} - {formatDate(income.created_at)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(income.amount)}</div>
                          <Badge className={paymentStatusColors[income.payment_status]}>
                            {paymentStatusLabels[income.payment_status]}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}