import { useState, useEffect } from 'react';
import { Plus, Clock, CheckCircle2, AlertTriangle, User, DollarSign, Calendar } from 'lucide-react';
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

interface EmployeeAdvance {
  id: string;
  employee_name: string;
  employee_position?: string;
  advance_amount: number;
  advance_date: string;
  purpose: string;
  due_date: string;
  amount_justified: number;
  amount_pending: number;
  status: string;
  notes?: string;
  created_at: string;
  project?: {
    name: string;
  };
}

interface AdvanceJustification {
  id: string;
  advance_id: string;
  amount: number;
  receipt_date: string;
  description: string;
  supplier_name?: string;
  fiscal_receipt: boolean;
  approved: boolean;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
}

export function EmployeeAdvanceManager() {
  const [advances, setAdvances] = useState<EmployeeAdvance[]>([]);
  const [justifications, setJustifications] = useState<AdvanceJustification[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isJustificationDialogOpen, setIsJustificationDialogOpen] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState<EmployeeAdvance | null>(null);
  const { toast } = useToast();

  const [advanceFormData, setAdvanceFormData] = useState({
    employee_name: '',
    employee_position: '',
    project_id: '',
    advance_amount: '',
    advance_date: new Date().toISOString().split('T')[0],
    purpose: '',
    due_date: '',
    notes: ''
  });

  const [justificationFormData, setJustificationFormData] = useState({
    amount: '',
    receipt_date: new Date().toISOString().split('T')[0],
    description: '',
    supplier_name: '',
    fiscal_receipt: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [advancesResult, justificationsResult, projectsResult] = await Promise.all([
        supabase
          .from('employee_advances')
          .select(`
            *,
            project:projects(name)
          `)
          .order('created_at', { ascending: false }),
          
        supabase
          .from('advance_justifications')
          .select('*')
          .order('created_at', { ascending: false }),
          
        supabase
          .from('projects')
          .select('id, name')
          .order('name')
      ]);

      if (advancesResult.error) throw advancesResult.error;
      if (justificationsResult.error) throw justificationsResult.error;
      if (projectsResult.error) throw projectsResult.error;

      setAdvances(advancesResult.data || []);
      setJustifications(justificationsResult.data || []);
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

  const resetAdvanceForm = () => {
    setAdvanceFormData({
      employee_name: '',
      employee_position: '',
      project_id: '',
      advance_amount: '',
      advance_date: new Date().toISOString().split('T')[0],
      purpose: '',
      due_date: '',
      notes: ''
    });
  };

  const resetJustificationForm = () => {
    setJustificationFormData({
      amount: '',
      receipt_date: new Date().toISOString().split('T')[0],
      description: '',
      supplier_name: '',
      fiscal_receipt: false
    });
  };

  const handleAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const amount = parseFloat(advanceFormData.advance_amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('El monto debe ser un número válido mayor a 0');
      }

      const advanceData = {
        employee_name: advanceFormData.employee_name,
        employee_position: advanceFormData.employee_position || null,
        project_id: advanceFormData.project_id || null,
        advance_amount: amount,
        advance_date: advanceFormData.advance_date,
        purpose: advanceFormData.purpose,
        due_date: advanceFormData.due_date,
        notes: advanceFormData.notes || null,
        status: 'pending',
        created_by: (await supabase.auth.getUser()).data.user?.id
      };

      const { error } = await supabase
        .from('employee_advances')
        .insert(advanceData);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Anticipo registrado correctamente"
      });

      setIsCreateDialogOpen(false);
      resetAdvanceForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving advance:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar el anticipo",
        variant: "destructive"
      });
    }
  };

  const handleJustificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAdvance) return;

    try {
      const amount = parseFloat(justificationFormData.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('El monto debe ser un número válido mayor a 0');
      }

      if (amount > selectedAdvance.amount_pending) {
        throw new Error('El monto no puede ser mayor al saldo pendiente');
      }

      const justificationData = {
        advance_id: selectedAdvance.id,
        amount: amount,
        receipt_date: justificationFormData.receipt_date,
        description: justificationFormData.description,
        supplier_name: justificationFormData.supplier_name || null,
        fiscal_receipt: justificationFormData.fiscal_receipt,
        approved: false,
        created_by: (await supabase.auth.getUser()).data.user?.id
      };

      const { error } = await supabase
        .from('advance_justifications')
        .insert(justificationData);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Justificación registrada correctamente"
      });

      setIsJustificationDialogOpen(false);
      resetJustificationForm();
      setSelectedAdvance(null);
      fetchData();
    } catch (error: any) {
      console.error('Error saving justification:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar la justificación",
        variant: "destructive"
      });
    }
  };

  const approveJustification = async (justificationId: string) => {
    try {
      const { error } = await supabase
        .from('advance_justifications')
        .update({ 
          approved: true,
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', justificationId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Justificación aprobada correctamente"
      });

      fetchData();
    } catch (error) {
      console.error('Error approving justification:', error);
      toast({
        title: "Error",
        description: "No se pudo aprobar la justificación",
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

  const getStatusBadge = (status: string): "default" | "destructive" | "secondary" | "outline" => {
    const variants: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
      pending: 'secondary',
      justified: 'default',
      overdue: 'destructive',
      written_off: 'outline'
    };
    return variants[status] || 'outline';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'justified':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getJustificationProgress = (advance: EmployeeAdvance) => {
    return (advance.amount_justified / advance.advance_amount) * 100;
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
          <h2 className="text-2xl font-bold">Gestión de Anticipos a Empleados</h2>
          <p className="text-muted-foreground">
            Control de anticipos entregados y su justificación
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetAdvanceForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Anticipo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nuevo Anticipo a Empleado</DialogTitle>
              <DialogDescription>
                Registra un nuevo anticipo entregado a un empleado
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAdvanceSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employee_name">Nombre del Empleado</Label>
                  <Input
                    id="employee_name"
                    value={advanceFormData.employee_name}
                    onChange={(e) => setAdvanceFormData({ ...advanceFormData, employee_name: e.target.value })}
                    placeholder="Nombre completo"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employee_position">Puesto (Opcional)</Label>
                  <Input
                    id="employee_position"
                    value={advanceFormData.employee_position}
                    onChange={(e) => setAdvanceFormData({ ...advanceFormData, employee_position: e.target.value })}
                    placeholder="Puesto o cargo"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="advance_amount">Monto del Anticipo</Label>
                  <Input
                    id="advance_amount"
                    type="number"
                    step="0.01"
                    value={advanceFormData.advance_amount}
                    onChange={(e) => setAdvanceFormData({ ...advanceFormData, advance_amount: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project_id">Proyecto (Opcional)</Label>
                  <Select value={advanceFormData.project_id} onValueChange={(value) => setAdvanceFormData({ ...advanceFormData, project_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sin proyecto específico" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin proyecto específico</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="advance_date">Fecha del Anticipo</Label>
                  <Input
                    id="advance_date"
                    type="date"
                    value={advanceFormData.advance_date}
                    onChange={(e) => setAdvanceFormData({ ...advanceFormData, advance_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Fecha de Vencimiento</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={advanceFormData.due_date}
                    onChange={(e) => setAdvanceFormData({ ...advanceFormData, due_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">Propósito del Anticipo</Label>
                <Textarea
                  id="purpose"
                  value={advanceFormData.purpose}
                  onChange={(e) => setAdvanceFormData({ ...advanceFormData, purpose: e.target.value })}
                  placeholder="Describe para qué se entrega el anticipo"
                  required
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas Adicionales</Label>
                <Textarea
                  id="notes"
                  value={advanceFormData.notes}
                  onChange={(e) => setAdvanceFormData({ ...advanceFormData, notes: e.target.value })}
                  placeholder="Información adicional"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Registrar Anticipo
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Resumen de Anticipos */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Anticipos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(advances.reduce((sum, adv) => sum + adv.advance_amount, 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              {advances.length} anticipos registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {advances.filter(adv => adv.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(advances.filter(adv => adv.status === 'pending').reduce((sum, adv) => sum + adv.amount_pending, 0))} por justificar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {advances.filter(adv => adv.status === 'overdue').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Requieren atención inmediata
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(advances.map(adv => adv.employee_name)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Con anticipos activos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Anticipos */}
      <Card>
        <CardHeader>
          <CardTitle>Anticipos Registrados</CardTitle>
          <CardDescription>
            Lista de todos los anticipos entregados a empleados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Proyecto</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Justificado</TableHead>
                <TableHead>Pendiente</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {advances.map((advance) => (
                <TableRow key={advance.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{advance.employee_name}</div>
                      {advance.employee_position && (
                        <div className="text-sm text-muted-foreground">{advance.employee_position}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{advance.project?.name || '-'}</TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(advance.advance_amount)}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{formatCurrency(advance.amount_justified)}</div>
                      <Progress value={getJustificationProgress(advance)} className="w-20 h-2" />
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-red-600">
                    {formatCurrency(advance.amount_pending)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {formatDate(advance.due_date)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadge(advance.status)} className="flex items-center gap-1 w-fit">
                      {getStatusIcon(advance.status)}
                      {advance.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedAdvance(advance);
                        setIsJustificationDialogOpen(true);
                      }}
                      disabled={advance.amount_pending <= 0}
                    >
                      Justificar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de Justificación */}
      <Dialog open={isJustificationDialogOpen} onOpenChange={setIsJustificationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Justificar Anticipo</DialogTitle>
            <DialogDescription>
              {selectedAdvance && `Empleado: ${selectedAdvance.employee_name} - Pendiente: ${formatCurrency(selectedAdvance.amount_pending)}`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleJustificationSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="justification_amount">Monto</Label>
                <Input
                  id="justification_amount"
                  type="number"
                  step="0.01"
                  value={justificationFormData.amount}
                  onChange={(e) => setJustificationFormData({ ...justificationFormData, amount: e.target.value })}
                  placeholder="0.00"
                  max={selectedAdvance?.amount_pending || 0}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receipt_date">Fecha del Comprobante</Label>
                <Input
                  id="receipt_date"
                  type="date"
                  value={justificationFormData.receipt_date}
                  onChange={(e) => setJustificationFormData({ ...justificationFormData, receipt_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="justification_description">Descripción</Label>
              <Textarea
                id="justification_description"
                value={justificationFormData.description}
                onChange={(e) => setJustificationFormData({ ...justificationFormData, description: e.target.value })}
                placeholder="Describe el gasto realizado"
                required
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier_name">Proveedor (Opcional)</Label>
              <Input
                id="supplier_name"
                value={justificationFormData.supplier_name}
                onChange={(e) => setJustificationFormData({ ...justificationFormData, supplier_name: e.target.value })}
                placeholder="Nombre del proveedor"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="fiscal_receipt"
                checked={justificationFormData.fiscal_receipt}
                onChange={(e) => setJustificationFormData({ ...justificationFormData, fiscal_receipt: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="fiscal_receipt">¿Es un comprobante fiscal válido?</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsJustificationDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Registrar Justificación
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}