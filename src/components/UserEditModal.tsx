import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User, Building, Shield, MapPin, Phone, Mail, FileText } from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: 'admin' | 'employee' | 'client';
  approval_status: string;
  department_enum?: string;
  position_enum?: string;
  created_at: string;
  user_branch_assignments?: Array<{
    branch_office_id: string;
    branch_offices: { name: string };
  }>;
}

interface BranchOffice {
  id: string;
  name: string;
}

interface UserEditModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile | null;
  onUserUpdated: () => void;
}

const departmentOptions = [
  { value: 'ventas', label: 'Ventas' },
  { value: 'diseño', label: 'Diseño' },
  { value: 'construcción', label: 'Construcción' },
  { value: 'finanzas', label: 'Finanzas' },
  { value: 'contabilidad', label: 'Contabilidad' }
];

const positionOptions = [
  { value: 'director', label: 'Director' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'jefatura', label: 'Jefatura' },
  { value: 'analista', label: 'Analista' },
  { value: 'auxiliar', label: 'Auxiliar' }
];

const roleOptions = [
  { value: 'admin', label: 'Administrador' },
  { value: 'employee', label: 'Empleado' },
  { value: 'client', label: 'Cliente' }
];

const approvalStatusOptions = [
  { value: 'approved', label: 'Aprobado' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'rejected', label: 'Rechazado' }
];

export function UserEditModal({ isOpen, onOpenChange, user, onUserUpdated }: UserEditModalProps) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'employee' as 'admin' | 'employee' | 'client',
    approval_status: 'pending',
    department_enum: '' as string,
    position_enum: '' as string
  });
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [branchOffices, setBranchOffices] = useState<BranchOffice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role,
        approval_status: user.approval_status,
        department_enum: user.department_enum || '',
        position_enum: user.position_enum || ''
      });
      
      setSelectedBranches(
        user.user_branch_assignments?.map(assignment => assignment.branch_office_id) || []
      );
      
      fetchBranchOffices();
    }
  }, [user, isOpen]);

  const fetchBranchOffices = async () => {
    const { data, error } = await supabase
      .from('branch_offices')
      .select('id, name')
      .eq('active', true)
      .order('name');

    if (error) {
      console.error('Error fetching branch offices:', error);
      return;
    }

    setBranchOffices(data || []);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBranchToggle = (branchId: string) => {
    setSelectedBranches(prev => 
      prev.includes(branchId) 
        ? prev.filter(id => id !== branchId)
        : [...prev, branchId]
    );
  };

  const handleSubmit = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Update basic profile fields
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          department_enum: formData.department_enum ? formData.department_enum as any : null,
          position_enum: formData.position_enum ? formData.position_enum as any : null
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Use secure functions for role and approval status updates (admin only)
      if (formData.role !== user.role) {
        const { error: roleError } = await supabase.rpc('update_user_role_secure', {
          _user_id: user.user_id,
          _new_role: formData.role
        });
        if (roleError) throw roleError;
      }

      if (formData.approval_status !== user.approval_status) {
        const { error: approvalError } = await supabase.rpc('update_user_approval_secure', {
          _user_id: user.user_id,
          _approval_status: formData.approval_status
        });
        if (approvalError) throw approvalError;
      }

      // Update branch assignments only for employees
      if (formData.role === 'employee') {
        // Delete existing assignments
        const { error: deleteError } = await supabase
          .from('user_branch_assignments')
          .delete()
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;

        // Insert new assignments
        if (selectedBranches.length > 0) {
          const assignments = selectedBranches.map(branchId => ({
            user_id: user.id,
            branch_office_id: branchId
          }));

          const { error: insertError } = await supabase
            .from('user_branch_assignments')
            .insert(assignments);

          if (insertError) throw insertError;
        }
      }

      toast({
        title: "Usuario actualizado",
        description: "Los datos del usuario se han actualizado correctamente.",
      });

      onUserUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el usuario. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const shouldShowBranches = formData.role === 'employee' && 
    formData.department_enum && 
    formData.position_enum &&
    !['director', 'gerente'].includes(formData.position_enum);

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Editar Usuario
          </DialogTitle>
          <DialogDescription>
            Modifica la información y configuración del usuario
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="role">Rol & Estado</TabsTrigger>
            <TabsTrigger value="work">Trabajo</TabsTrigger>
            <TabsTrigger value="branches">Sucursales</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Información Personal
                </CardTitle>
                <CardDescription>
                  Datos básicos del usuario
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nombre Completo</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => handleInputChange('full_name', e.target.value)}
                      placeholder="Nombre completo del usuario"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      disabled
                      className="bg-muted"
                      placeholder="correo@ejemplo.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="Número de teléfono"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="role" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Rol y Estado
                </CardTitle>
                <CardDescription>
                  Configuración de acceso y estado del usuario
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Rol del Usuario</Label>
                    <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar rol" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="approval_status">Estado de Aprobación</Label>
                    <Select 
                      value={formData.approval_status} 
                      onValueChange={(value) => handleInputChange('approval_status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {approvalStatusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="work" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Información Laboral
                </CardTitle>
                <CardDescription>
                  Departamento y posición del empleado
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.role === 'employee' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="department">Departamento</Label>
                      <Select 
                        value={formData.department_enum} 
                        onValueChange={(value) => handleInputChange('department_enum', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar departamento" />
                        </SelectTrigger>
                        <SelectContent>
                          {departmentOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="position">Posición</Label>
                      <Select 
                        value={formData.position_enum} 
                        onValueChange={(value) => handleInputChange('position_enum', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar posición" />
                        </SelectTrigger>
                        <SelectContent>
                          {positionOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>La información laboral solo aplica para empleados</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branches" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Asignación de Sucursales
                </CardTitle>
                <CardDescription>
                  Sucursales a las que tiene acceso el usuario
                </CardDescription>
              </CardHeader>
              <CardContent>
                {shouldShowBranches ? (
                  <div className="space-y-3">
                    {branchOffices.map((branch) => (
                      <div key={branch.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={branch.id}
                          checked={selectedBranches.includes(branch.id)}
                          onCheckedChange={() => handleBranchToggle(branch.id)}
                        />
                        <Label 
                          htmlFor={branch.id}
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          {branch.name}
                        </Label>
                      </div>
                    ))}
                    {selectedBranches.length > 0 && (
                      <div className="mt-4">
                        <Separator />
                        <div className="mt-3">
                          <p className="text-sm text-muted-foreground mb-2">
                            Sucursales seleccionadas:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {selectedBranches.map((branchId) => {
                              const branch = branchOffices.find(b => b.id === branchId);
                              return branch ? (
                                <Badge key={branchId} variant="secondary">
                                  {branch.name}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>
                      {formData.role !== 'employee' 
                        ? 'Las sucursales solo aplican para empleados' 
                        : 'Completa el departamento y posición para asignar sucursales'
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}