import { useState, useEffect } from 'react';
import { Plus, Search, DollarSign, MoreHorizontal, Edit, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
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

const categoryLabels = {
  administration: 'Administración',
  sales: 'Ventas',
  financial: 'Financieros',
  construction: 'Construcción'
};

const categoryColors = {
  administration: 'bg-blue-100 text-blue-800',
  sales: 'bg-green-100 text-green-800',
  financial: 'bg-purple-100 text-purple-800',
  construction: 'bg-orange-100 text-orange-800'
};

export default function Finances() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  useEffect(() => {
    fetchExpenses();
    fetchClients();
    fetchProjects();
  }, []);

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
      toast({
        title: "Error",
        description: "No se pudieron cargar los gastos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    
    try {
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuario no autenticado');

      // Get user profile
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
      
      setIsDialogOpen(false);
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

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsDialogOpen(true);
  };

  const handleDelete = async (expenseId: string) => {
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

  const resetForm = () => {
    setEditingExpense(null);
    setIsDialogOpen(false);
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

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

  // Calcular totales por categoría
  const categoryTotals = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

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
          <p className="text-muted-foreground">Administra gastos y control financiero</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
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
            
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Resumen de gastos por categoría */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Object.entries(categoryLabels).map(([key, label]) => (
          <Card key={key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(categoryTotals[key] || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {((categoryTotals[key] || 0) / totalExpenses * 100 || 0).toFixed(1)}% del total
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar gastos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            <SelectItem value="administration">Administración</SelectItem>
            <SelectItem value="sales">Ventas</SelectItem>
            <SelectItem value="financial">Financieros</SelectItem>
            <SelectItem value="construction">Construcción</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla de gastos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Registro de Gastos
          </CardTitle>
          <CardDescription>
            {filteredExpenses.length} gasto(s) encontrado(s) - Total: {formatCurrency(
              filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
            )}
          </CardDescription>
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
              {filteredExpenses.map((expense) => (
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
                    <Badge className={categoryColors[expense.category]}>
                      {categoryLabels[expense.category]}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(expense.amount)}
                    {expense.tax_amount && (
                      <div className="text-sm text-muted-foreground">
                        IVA: {formatCurrency(expense.tax_amount)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {expense.client && (
                        <div>Cliente: {expense.client.full_name}</div>
                      )}
                      {expense.project && (
                        <div>Proyecto: {expense.project.name}</div>
                      )}
                      {!expense.client && !expense.project && (
                        <span className="text-muted-foreground">General</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{new Date(expense.created_at).toLocaleDateString('es-MX')}</div>
                      <div className="text-muted-foreground">
                        por {expense.created_by.full_name}
                      </div>
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
                        <DropdownMenuItem onClick={() => handleEdit(expense)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(expense.id)}
                          className="text-destructive"
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
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No se encontraron gastos</p>
              <p className="text-sm">Registra tu primer gasto para comenzar</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}