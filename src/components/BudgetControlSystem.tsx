import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Target, 
  Plus, 
  Edit, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  DollarSign,
  Users,
  Building2
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { es } from 'date-fns/locale';

interface Budget {
  id: string;
  name: string;
  period_type: 'monthly' | 'quarterly' | 'yearly';
  period_start: string;
  period_end: string;
  category: string;
  project_id?: string;
  department?: string;
  budgeted_amount: number;
  actual_amount: number;
  variance: number;
  variance_percentage: number;
  status: 'under_budget' | 'on_budget' | 'over_budget';
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface BudgetFormData {
  name: string;
  period_type: 'monthly' | 'quarterly' | 'yearly';
  period_start: string;
  period_end: string;
  category: string;
  project_id?: string;
  department?: string;
  budgeted_amount: number;
}

interface Project {
  id: string;
  name: string;
}

const BudgetControlSystem: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [formData, setFormData] = useState<BudgetFormData>({
    name: '',
    period_type: 'monthly',
    period_start: '',
    period_end: '',
    category: 'general',
    budgeted_amount: 0
  });
  const [filterPeriod, setFilterPeriod] = useState<string>('current');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'operations', label: 'Operaciones' },
    { value: 'materials', label: 'Materiales' },
    { value: 'labor', label: 'Mano de Obra' },
    { value: 'equipment', label: 'Equipos' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'administration', label: 'Administración' },
    { value: 'maintenance', label: 'Mantenimiento' }
  ];

  const departments = [
    { value: 'construction', label: 'Construcción' },
    { value: 'administration', label: 'Administración' },
    { value: 'sales', label: 'Ventas' },
    { value: 'finance', label: 'Finanzas' },
    { value: 'operations', label: 'Operaciones' }
  ];

  useEffect(() => {
    fetchData();
  }, [filterPeriod, filterCategory]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [projectsResult] = await Promise.all([
        supabase.from('projects').select('id, name').order('name')
      ]);

      setProjects(projectsResult.data || []);
      
      // Simulate budget data since we don't have budget tables yet
      await fetchBudgets();
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos de presupuestos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBudgets = async () => {
    // For demo purposes, we'll create sample budget data
    // In a real implementation, this would fetch from a budgets table
    const currentDate = new Date();
    const currentMonthStart = startOfMonth(currentDate);
    const currentMonthEnd = endOfMonth(currentDate);

    // Get actual expenses for comparison
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, category, project_id')
      .gte('created_at', currentMonthStart.toISOString())
      .lte('created_at', currentMonthEnd.toISOString());

    // Calculate actual amounts by category
    const actualByCategory = (expenses || []).reduce((acc, expense) => {
      const category = expense.category || 'general';
      acc[category] = (acc[category] || 0) + (expense.amount || 0);
      return acc;
    }, {} as Record<string, number>);

    // Create sample budgets
    const sampleBudgets: Budget[] = categories.map((cat, index) => {
      const budgetedAmount = 50000 + (index * 10000); // Sample budgeted amounts
      const actualAmount = actualByCategory[cat.value] || 0;
      const variance = actualAmount - budgetedAmount;
      const variancePercentage = budgetedAmount > 0 ? (variance / budgetedAmount) * 100 : 0;
      
      let status: Budget['status'] = 'on_budget';
      if (variancePercentage > 10) status = 'over_budget';
      else if (variancePercentage < -10) status = 'under_budget';

      return {
        id: `budget-${index}`,
        name: `Presupuesto ${cat.label} - ${format(currentDate, 'MMMM yyyy', { locale: es })}`,
        period_type: 'monthly' as const,
        period_start: currentMonthStart.toISOString(),
        period_end: currentMonthEnd.toISOString(),
        category: cat.value,
        budgeted_amount: budgetedAmount,
        actual_amount: actualAmount,
        variance,
        variance_percentage: variancePercentage,
        status,
        created_by: 'current-user',
        created_at: currentDate.toISOString(),
        updated_at: currentDate.toISOString()
      };
    });

    setBudgets(sampleBudgets);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      period_type: 'monthly',
      period_start: '',
      period_end: '',
      category: 'general',
      budgeted_amount: 0
    });
    setEditingBudget(null);
  };

  const handleSubmit = async () => {
    try {
      // In a real implementation, this would save to a budgets table
      toast({
        title: 'Presupuesto guardado',
        description: 'El presupuesto ha sido creado exitosamente',
      });

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving budget:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar el presupuesto',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: Budget['status']) => {
    const variants = {
      under_budget: { variant: 'default' as const, label: 'Bajo Presupuesto', color: 'text-blue-600' },
      on_budget: { variant: 'default' as const, label: 'En Presupuesto', color: 'text-green-600' },
      over_budget: { variant: 'destructive' as const, label: 'Sobre Presupuesto', color: 'text-red-600' }
    };

    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getVarianceIcon = (variance: number) => {
    if (variance > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (variance < 0) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <CheckCircle className="h-4 w-4 text-blue-500" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getBudgetProgress = (actual: number, budgeted: number) => {
    if (budgeted === 0) return 0;
    return Math.min((actual / budgeted) * 100, 100);
  };

  const getSummaryStats = () => {
    const totalBudgeted = budgets.reduce((sum, b) => sum + b.budgeted_amount, 0);
    const totalActual = budgets.reduce((sum, b) => sum + b.actual_amount, 0);
    const totalVariance = totalActual - totalBudgeted;
    const overBudgetCount = budgets.filter(b => b.status === 'over_budget').length;
    const underBudgetCount = budgets.filter(b => b.status === 'under_budget').length;

    return {
      totalBudgeted,
      totalActual,
      totalVariance,
      overBudgetCount,
      underBudgetCount,
      budgetUtilization: totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0
    };
  };

  const filteredBudgets = budgets.filter(budget => {
    if (filterCategory !== 'all' && budget.category !== filterCategory) return false;
    // Add more filters as needed
    return true;
  });

  const stats = getSummaryStats();

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
          <h1 className="text-3xl font-bold tracking-tight">Control Presupuestario</h1>
          <p className="text-muted-foreground">
            Gestión y monitoreo de presupuestos por categoría y proyecto
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Presupuesto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingBudget ? 'Editar Presupuesto' : 'Crear Nuevo Presupuesto'}
              </DialogTitle>
              <DialogDescription>
                Configure los parámetros del presupuesto para control y seguimiento
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div>
                <label className="text-sm font-medium">Nombre del Presupuesto</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Presupuesto Materiales Q1 2024"
                />
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Tipo de Período</label>
                  <Select
                    value={formData.period_type}
                    onValueChange={(value: 'monthly' | 'quarterly' | 'yearly') =>
                      setFormData(prev => ({ ...prev, period_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensual</SelectItem>
                      <SelectItem value="quarterly">Trimestral</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Categoría</label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Fecha Inicio</label>
                  <Input
                    type="date"
                    value={formData.period_start}
                    onChange={(e) => setFormData(prev => ({ ...prev, period_start: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Fecha Fin</label>
                  <Input
                    type="date"
                    value={formData.period_end}
                    onChange={(e) => setFormData(prev => ({ ...prev, period_end: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Proyecto (Opcional)</label>
                  <Select
                    value={formData.project_id || 'none'}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, project_id: value === 'none' ? undefined : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar proyecto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin proyecto específico</SelectItem>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Departamento (Opcional)</label>
                  <Select
                    value={formData.department || ''}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, department: value || undefined }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin departamento específico</SelectItem>
                      {departments.map(dept => (
                        <SelectItem key={dept.value} value={dept.value}>
                          {dept.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Monto Presupuestado</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.budgeted_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, budgeted_amount: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSubmit} className="flex-1">
                  {editingBudget ? 'Actualizar Presupuesto' : 'Crear Presupuesto'}
                </Button>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Presupuestado</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalBudgeted)}</div>
            <p className="text-xs text-muted-foreground">
              Meta establecida
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ejecutado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalActual)}</div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(stats.budgetUtilization)} de utilización
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Variación Total</CardTitle>
            {getVarianceIcon(stats.totalVariance)}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.totalVariance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(stats.totalVariance)}
            </div>
            <p className="text-xs text-muted-foreground">
              vs presupuesto
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sobre Presupuesto</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overBudgetCount}</div>
            <p className="text-xs text-muted-foreground">
              Requieren atención
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bajo Presupuesto</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.underBudgetCount}</div>
            <p className="text-xs text-muted-foreground">
              Dentro del plan
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
            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Período Actual</SelectItem>
                <SelectItem value="previous">Período Anterior</SelectItem>
                <SelectItem value="all">Todos los Períodos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Categorías</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Budgets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Presupuestos</CardTitle>
          <CardDescription>
            Monitoreo detallado de presupuestos y variaciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Presupuesto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Presupuestado</TableHead>
                  <TableHead className="text-right">Ejecutado</TableHead>
                  <TableHead className="text-right">Variación</TableHead>
                  <TableHead>Progreso</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBudgets.map((budget) => {
                  const progress = getBudgetProgress(budget.actual_amount, budget.budgeted_amount);
                  
                  return (
                    <TableRow key={budget.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{budget.name}</div>
                          {budget.department && (
                            <div className="text-sm text-muted-foreground">
                              {departments.find(d => d.value === budget.department)?.label}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {categories.find(c => c.value === budget.category)?.label}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(budget.period_start), 'MMM', { locale: es })} - {format(new Date(budget.period_end), 'MMM yyyy', { locale: es })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(budget.budgeted_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(budget.actual_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={`flex items-center justify-end gap-1 ${
                          budget.variance >= 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {getVarianceIcon(budget.variance)}
                          <span className="font-medium">
                            {formatCurrency(Math.abs(budget.variance))}
                          </span>
                          <span className="text-xs">
                            ({formatPercentage(budget.variance_percentage)})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Progress value={progress} className="w-20" />
                          <div className="text-xs text-muted-foreground">
                            {progress.toFixed(0)}%
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(budget.status)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredBudgets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No se encontraron presupuestos con los filtros aplicados
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

export default BudgetControlSystem;