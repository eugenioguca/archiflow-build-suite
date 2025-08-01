import { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, BarChart3, Calendar, DollarSign, Target } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CashFlowProjection {
  id: string;
  project_id?: string;
  period_start: string;
  period_end: string;
  projected_income: number;
  projected_expenses: number;
  projected_net_flow: number;
  actual_income: number;
  actual_expenses: number;
  actual_net_flow: number;
  variance: number;
  notes?: string;
  created_at: string;
  project?: {
    name: string;
  } | null;
}

interface Project {
  id: string;
  name: string;
}

export function CashFlowProjections() {
  const [projections, setProjections] = useState<CashFlowProjection[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProjection, setEditingProjection] = useState<CashFlowProjection | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    project_id: '',
    period_start: '',
    period_end: '',
    projected_income: '',
    projected_expenses: '',
    actual_income: '',
    actual_expenses: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projectionsResult, projectsResult] = await Promise.all([
        supabase
          .from('cash_flow_projections')
          .select(`
            *,
            project:projects(name)
          `)
          .order('period_start', { ascending: false }),
          
        supabase
          .from('projects')
          .select('id, name')
          .order('name')
      ]);

      if (projectionsResult.error) throw projectionsResult.error;
      if (projectsResult.error) throw projectsResult.error;

      const processedProjections: CashFlowProjection[] = (projectionsResult.data || []).map(projection => ({
        ...projection,
        project: projection.project && typeof projection.project === 'object' && 'name' in projection.project 
          ? { name: String(projection.project.name) } 
          : null
      }));
      
      setProjections(processedProjections);
      setProjects(projectsResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      project_id: '',
      period_start: '',
      period_end: '',
      projected_income: '',
      projected_expenses: '',
      actual_income: '',
      actual_expenses: '',
      notes: ''
    });
    setEditingProjection(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const projectionData = {
        project_id: formData.project_id || null,
        period_start: formData.period_start,
        period_end: formData.period_end,
        projected_income: parseFloat(formData.projected_income) || 0,
        projected_expenses: parseFloat(formData.projected_expenses) || 0,
        actual_income: parseFloat(formData.actual_income) || 0,
        actual_expenses: parseFloat(formData.actual_expenses) || 0,
        notes: formData.notes || null
      };

      if (editingProjection) {
        const { error } = await supabase
          .from('cash_flow_projections')
          .update(projectionData)
          .eq('id', editingProjection.id);

        if (error) throw error;

        toast({
          title: "Éxito",
          description: "Proyección actualizada correctamente"
        });
      } else {
        const { error } = await supabase
          .from('cash_flow_projections')
          .insert({
            ...projectionData,
            created_by: (await supabase.auth.getUser()).data.user?.id
          });

        if (error) throw error;

        toast({
          title: "Éxito",
          description: "Proyección creada correctamente"
        });
      }

      setIsCreateDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving projection:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la proyección",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (projection: CashFlowProjection) => {
    setEditingProjection(projection);
    setFormData({
      project_id: projection.project_id || '',
      period_start: projection.period_start,
      period_end: projection.period_end,
      projected_income: projection.projected_income.toString(),
      projected_expenses: projection.projected_expenses.toString(),
      actual_income: projection.actual_income.toString(),
      actual_expenses: projection.actual_expenses.toString(),
      notes: projection.notes || ''
    });
    setIsCreateDialogOpen(true);
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

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-green-600';
    if (variance < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getVarianceBadge = (variance: number) => {
    if (variance > 0) return 'default';
    if (variance < 0) return 'destructive';
    return 'secondary';
  };

  const getAccuracyPercentage = (projected: number, actual: number) => {
    if (projected === 0) return actual === 0 ? 100 : 0;
    return Math.max(0, 100 - Math.abs((actual - projected) / projected) * 100);
  };

  const getTotalProjected = (type: 'income' | 'expenses') => {
    return projections.reduce((sum, p) => 
      sum + (type === 'income' ? p.projected_income : p.projected_expenses), 0
    );
  };

  const getTotalActual = (type: 'income' | 'expenses') => {
    return projections.reduce((sum, p) => 
      sum + (type === 'income' ? p.actual_income : p.actual_expenses), 0
    );
  };

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
          <h2 className="text-2xl font-bold">Proyecciones de Flujo de Efectivo</h2>
          <p className="text-muted-foreground">
            Planifica y compara los flujos de efectivo proyectados vs reales
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Proyección
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingProjection ? 'Editar Proyección' : 'Nueva Proyección de Flujo'}
              </DialogTitle>
              <DialogDescription>
                {editingProjection 
                  ? 'Modifica los datos de la proyección existente' 
                  : 'Crea una nueva proyección de flujo de efectivo'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="project_id">Proyecto (Opcional)</Label>
                  <Select value={formData.project_id} onValueChange={(value) => setFormData({ ...formData, project_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="General (todos los proyectos)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">General (todos los proyectos)</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="period_start">Fecha de Inicio</Label>
                  <Input
                    id="period_start"
                    type="date"
                    value={formData.period_start}
                    onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="period_end">Fecha de Fin</Label>
                  <Input
                    id="period_end"
                    type="date"
                    value={formData.period_end}
                    onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-lg">Proyecciones</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="projected_income">Ingresos Proyectados</Label>
                    <Input
                      id="projected_income"
                      type="number"
                      step="0.01"
                      value={formData.projected_income}
                      onChange={(e) => setFormData({ ...formData, projected_income: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="projected_expenses">Gastos Proyectados</Label>
                    <Input
                      id="projected_expenses"
                      type="number"
                      step="0.01"
                      value={formData.projected_expenses}
                      onChange={(e) => setFormData({ ...formData, projected_expenses: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-lg">Datos Reales</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="actual_income">Ingresos Reales</Label>
                    <Input
                      id="actual_income"
                      type="number"
                      step="0.01"
                      value={formData.actual_income}
                      onChange={(e) => setFormData({ ...formData, actual_income: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="actual_expenses">Gastos Reales</Label>
                    <Input
                      id="actual_expenses"
                      type="number"
                      step="0.01"
                      value={formData.actual_expenses}
                      onChange={(e) => setFormData({ ...formData, actual_expenses: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notas sobre esta proyección"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingProjection ? 'Actualizar' : 'Crear'} Proyección
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs de Proyecciones */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Proyectados</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(getTotalProjected('income'))}
            </div>
            <p className="text-xs text-muted-foreground">
              Real: {formatCurrency(getTotalActual('income'))}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Proyectados</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(getTotalProjected('expenses'))}
            </div>
            <p className="text-xs text-muted-foreground">
              Real: {formatCurrency(getTotalActual('expenses'))}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flujo Neto Proyectado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              (getTotalProjected('income') - getTotalProjected('expenses')) >= 0 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {formatCurrency(getTotalProjected('income') - getTotalProjected('expenses'))}
            </div>
            <p className="text-xs text-muted-foreground">
              Real: {formatCurrency(getTotalActual('income') - getTotalActual('expenses'))}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proyecciones</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projections.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Períodos planificados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Proyecciones */}
      <Card>
        <CardHeader>
          <CardTitle>Proyecciones de Flujo</CardTitle>
          <CardDescription>
            Comparación de flujos proyectados vs reales por período
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead>Proyecto</TableHead>
                <TableHead>Ingresos</TableHead>
                <TableHead>Gastos</TableHead>
                <TableHead>Flujo Neto</TableHead>
                <TableHead>Varianza</TableHead>
                <TableHead>Precisión</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projections.map((projection) => (
                <TableRow key={projection.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {formatDate(projection.period_start)} - {formatDate(projection.period_end)}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{projection.project?.name || 'General'}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm text-green-600">
                        P: {formatCurrency(projection.projected_income)}
                      </div>
                      <div className="text-sm font-semibold">
                        R: {formatCurrency(projection.actual_income)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm text-red-600">
                        P: {formatCurrency(projection.projected_expenses)}
                      </div>
                      <div className="text-sm font-semibold">
                        R: {formatCurrency(projection.actual_expenses)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className={`text-sm ${projection.projected_net_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        P: {formatCurrency(projection.projected_net_flow)}
                      </div>
                      <div className={`text-sm font-semibold ${projection.actual_net_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        R: {formatCurrency(projection.actual_net_flow)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getVarianceBadge(projection.variance)} className={getVarianceColor(projection.variance)}>
                      {projection.variance >= 0 ? '+' : ''}{formatCurrency(projection.variance)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Progress 
                        value={getAccuracyPercentage(projection.projected_net_flow, projection.actual_net_flow)} 
                        className="w-16 h-2"
                      />
                      <div className="text-xs text-muted-foreground">
                        {getAccuracyPercentage(projection.projected_net_flow, projection.actual_net_flow).toFixed(1)}%
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(projection)}
                    >
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}