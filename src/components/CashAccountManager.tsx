import { useState, useEffect } from 'react';
import { Plus, Building, Edit, Trash2, Users, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CashAccount {
  id: string;
  name: string;
  account_type: string;
  project_id?: string;
  responsible_user_id: string;
  current_balance: number;
  max_limit?: number;
  description?: string;
  status: string;
  created_at: string;
  project?: {
    name: string;
  };
  responsible_user?: {
    full_name: string;
  };
}

interface Project {
  id: string;
  name: string;
}

interface User {
  id: string;
  full_name: string;
}

export function CashAccountManager() {
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<CashAccount | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    account_type: 'general',
    project_id: '',
    responsible_user_id: '',
    max_limit: '',
    description: '',
    status: 'active'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [accountsResult, projectsResult, usersResult] = await Promise.all([
        supabase
          .from('cash_accounts')
          .select(`
            *,
            project:projects(name),
            responsible_user:profiles!cash_accounts_responsible_user_id_fkey(full_name)
          `)
          .order('created_at', { ascending: false }),
          
        supabase
          .from('projects')
          .select('id, name')
          .order('name'),
          
        supabase
          .from('profiles')
          .select('id, full_name')
          .in('role', ['admin', 'employee'])
          .order('full_name')
      ]);

      if (accountsResult.error) throw accountsResult.error;
      if (projectsResult.error) throw projectsResult.error;
      if (usersResult.error) throw usersResult.error;

      setAccounts(accountsResult.data || []);
      setProjects(projectsResult.data || []);
      setUsers(usersResult.data || []);
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
      name: '',
      account_type: 'general',
      project_id: '',
      responsible_user_id: '',
      max_limit: '',
      description: '',
      status: 'active'
    });
    setEditingAccount(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const accountData = {
        name: formData.name,
        account_type: formData.account_type,
        project_id: formData.project_id || null,
        responsible_user_id: formData.responsible_user_id,
        max_limit: formData.max_limit ? parseFloat(formData.max_limit) : null,
        description: formData.description || null,
        status: formData.status
      };

      if (editingAccount) {
        const { error } = await supabase
          .from('cash_accounts')
          .update(accountData)
          .eq('id', editingAccount.id);

        if (error) throw error;

        toast({
          title: "Éxito",
          description: "Cuenta de efectivo actualizada correctamente"
        });
      } else {
        const { error } = await supabase
          .from('cash_accounts')
          .insert({
            ...accountData,
            created_by: (await supabase.auth.getUser()).data.user?.id
          });

        if (error) throw error;

        toast({
          title: "Éxito",
          description: "Cuenta de efectivo creada correctamente"
        });
      }

      setIsCreateDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving account:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la cuenta de efectivo",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (account: CashAccount) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      account_type: account.account_type,
      project_id: account.project_id || '',
      responsible_user_id: account.responsible_user_id,
      max_limit: account.max_limit?.toString() || '',
      description: account.description || '',
      status: account.status
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta cuenta?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('cash_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Cuenta de efectivo eliminada correctamente"
      });

      fetchData();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la cuenta de efectivo",
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

  const getAccountTypeLabel = (type: string) => {
    const labels = {
      general: 'General',
      petty_cash: 'Caja Chica',
      project_fund: 'Fondo de Proyecto'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getStatusBadge = (status: string): "default" | "destructive" | "secondary" | "outline" => {
    const variants: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
      active: 'default',
      inactive: 'secondary',
      closed: 'destructive'
    };
    return variants[status] || 'outline';
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
          <h2 className="text-2xl font-bold">Gestión de Cuentas de Efectivo</h2>
          <p className="text-muted-foreground">
            Administra las cuentas de efectivo y fondos de la empresa
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Cuenta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingAccount ? 'Editar Cuenta de Efectivo' : 'Nueva Cuenta de Efectivo'}
              </DialogTitle>
              <DialogDescription>
                {editingAccount 
                  ? 'Modifica los datos de la cuenta de efectivo' 
                  : 'Crea una nueva cuenta para gestionar efectivo'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre de la Cuenta</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Caja General, Fondo Proyecto A"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account_type">Tipo de Cuenta</Label>
                  <Select value={formData.account_type} onValueChange={(value) => setFormData({ ...formData, account_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="petty_cash">Caja Chica</SelectItem>
                      <SelectItem value="project_fund">Fondo de Proyecto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="project_id">Proyecto (Opcional)</Label>
                  <Select value={formData.project_id} onValueChange={(value) => setFormData({ ...formData, project_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar proyecto" />
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
                <div className="space-y-2">
                  <Label htmlFor="responsible_user_id">Responsable</Label>
                  <Select value={formData.responsible_user_id} onValueChange={(value) => setFormData({ ...formData, responsible_user_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar responsable" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_limit">Límite Máximo (Opcional)</Label>
                  <Input
                    id="max_limit"
                    type="number"
                    step="0.01"
                    value={formData.max_limit}
                    onChange={(e) => setFormData({ ...formData, max_limit: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activa</SelectItem>
                      <SelectItem value="inactive">Inactiva</SelectItem>
                      <SelectItem value="closed">Cerrada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción opcional de la cuenta"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingAccount ? 'Actualizar' : 'Crear'} Cuenta
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Resumen de Cuentas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total en Efectivo</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(accounts.reduce((sum, acc) => sum + acc.current_balance, 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              En {accounts.filter(acc => acc.status === 'active').length} cuentas activas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cuentas por Proyecto</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accounts.filter(acc => acc.project_id).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Fondos específicos de proyectos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Responsables</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(accounts.map(acc => acc.responsible_user_id)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Usuarios con cuentas asignadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Cuentas */}
      <Card>
        <CardHeader>
          <CardTitle>Cuentas de Efectivo</CardTitle>
          <CardDescription>
            Lista de todas las cuentas de efectivo registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Proyecto</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Saldo Actual</TableHead>
                <TableHead>Límite</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell>{getAccountTypeLabel(account.account_type)}</TableCell>
                  <TableCell>{account.project?.name || '-'}</TableCell>
                  <TableCell>{account.responsible_user?.full_name}</TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(account.current_balance)}
                  </TableCell>
                  <TableCell>
                    {account.max_limit ? formatCurrency(account.max_limit) : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadge(account.status)}>
                      {account.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(account)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(account.id)}
                        disabled={account.current_balance !== 0}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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