import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Mail, Phone, Building, MapPin, Clock, Edit, Settings, UserCheck, UserX, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { EmployeeSetupDialog } from './EmployeeSetupDialog';
import { UserDeleteDialog } from './UserDeleteDialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile, BranchOffice, UserDetailsModalProps } from '@/types/user';

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

export function UserDetailsModal({ 
  user, 
  isOpen, 
  onOpenChange, 
  onUserUpdated,
  canManageUsers 
}: UserDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isEmployeeSetupOpen, setIsEmployeeSetupOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [branchOffices, setBranchOffices] = useState<BranchOffice[]>([]);
  
  // Form data
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    role: '',
    approval_status: '',
    department_enum: '',
    position_enum: ''
  });
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  
  const { toast } = useToast();

  // Initialize form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        phone: user.phone || '',
        email: user.email || '',
        role: user.role || '',
        approval_status: user.approval_status || '',
        department_enum: user.department_enum || '',
        position_enum: user.position_enum || ''
      });
      
      const userBranches = user.user_branch_assignments?.map(
        assignment => assignment.branch_office_id
      ) || [];
      setSelectedBranches(userBranches);
    }
  }, [user]);

  // Fetch branch offices
  useEffect(() => {
    const fetchBranchOffices = async () => {
      try {
        const { data, error } = await supabase
          .from('branch_offices')
          .select('id, name')
          .eq('active', true)
          .order('name');

        if (error) throw error;
        setBranchOffices(data || []);
      } catch (error) {
        console.error('Error fetching branch offices:', error);
      }
    };

    if (isOpen) {
      fetchBranchOffices();
    }
  }, [isOpen]);

  if (!user) return null;

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

  const handleSave = async () => {
    if (!canManageUsers) return;
    
    setIsSaving(true);
    try {
      // Update user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name || null,
          phone: formData.phone || null,
          email: formData.email || null,
          role: formData.role as any,
          approval_status: formData.approval_status,
          department_enum: formData.department_enum as any || null,
          position_enum: formData.position_enum as any || null
        })
        .eq('user_id', user.user_id);

      if (profileError) throw profileError;

      // Update branch assignments for employees
      if (formData.role === 'employee') {
        // Delete existing assignments
        await supabase
          .from('user_branch_assignments')
          .delete()
          .eq('user_id', user.user_id);

        // Insert new assignments
        if (selectedBranches.length > 0) {
          const assignments = selectedBranches.map(branchId => ({
            user_id: user.user_id,
            branch_office_id: branchId
          }));

          const { error: assignmentError } = await supabase
            .from('user_branch_assignments')
            .insert(assignments);

          if (assignmentError) throw assignmentError;
        }
      }

      toast({
        title: "Usuario actualizado",
        description: "Los cambios se han guardado exitosamente."
      });

      setIsEditing(false);
      onUserUpdated();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el usuario"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data
    setFormData({
      full_name: user.full_name || '',
      phone: user.phone || '',
      email: user.email || '',
      role: user.role || '',
      approval_status: user.approval_status || '',
      department_enum: user.department_enum || '',
      position_enum: user.position_enum || ''
    });
    
    const userBranches = user.user_branch_assignments?.map(
      assignment => assignment.branch_office_id
    ) || [];
    setSelectedBranches(userBranches);
    
    setIsEditing(false);
  };

  const handleApprovalChange = async (approved: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ approval_status: approved ? 'approved' : 'rejected' })
        .eq('user_id', user.user_id);

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: `Usuario ${approved ? 'aprobado' : 'rechazado'} exitosamente.`
      });
      
      onUserUpdated();
    } catch (error) {
      console.error('Error updating approval:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el estado de aprobación"
      });
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'employee':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'client':
        return 'bg-success/10 text-success border-success/20';
      default:
        return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-success/10 text-success border-success/20';
      case 'pending':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'rejected':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'employee':
        return 'Empleado';
      case 'client':
        return 'Cliente';
      default:
        return role;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Aprobado';
      case 'pending':
        return 'Pendiente';
      case 'rejected':
        return 'Rechazado';
      default:
        return status;
    }
  };

  const shouldShowBranches = formData.role === 'employee' && 
    ['construcción', 'ventas', 'diseño'].includes(formData.department_enum) &&
    ['director', 'gerente', 'jefatura'].includes(formData.position_enum);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              Detalles del Usuario
              {canManageUsers && (
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? 'Guardando...' : 'Guardar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isSaving}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  )}
                </div>
              )}
            </SheetTitle>
            <SheetDescription>
              {isEditing ? 'Editando información del usuario' : 'Información completa y acciones disponibles para este usuario.'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            {/* Header con avatar y info básica */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage 
                  src={user.avatar_url} 
                  alt={user.full_name || 'Usuario'} 
                />
                <AvatarFallback className="text-lg">
                  {(user.full_name || user.email || 'U')
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <h3 className="text-xl font-semibold">
                  {user.full_name || 'Sin nombre'}
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={getRoleColor(isEditing ? formData.role : user.role)}>
                    {getRoleLabel(isEditing ? formData.role : user.role)}
                  </Badge>
                  <Badge variant="outline" className={getStatusColor(isEditing ? formData.approval_status : user.approval_status)}>
                    {getStatusLabel(isEditing ? formData.approval_status : user.approval_status)}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="professional">Profesional</TabsTrigger>
                <TabsTrigger value="branches">Sucursales</TabsTrigger>
                <TabsTrigger value="system">Sistema</TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Información Personal</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Nombre Completo</Label>
                      {isEditing ? (
                        <Input
                          id="full_name"
                          value={formData.full_name}
                          onChange={(e) => handleInputChange('full_name', e.target.value)}
                        />
                      ) : (
                        <div className="flex items-center gap-3">
                          <span>{user.full_name || 'Sin nombre'}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      {isEditing ? (
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                        />
                      ) : (
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{user.email || 'Sin email'}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Teléfono</Label>
                      {isEditing ? (
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                        />
                      ) : (
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{user.phone || 'Sin teléfono'}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Registrado el {format(new Date(user.created_at), 'dd/MM/yyyy', { locale: es })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="professional" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Información Profesional</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="role">Rol</Label>
                      {isEditing ? (
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
                      ) : (
                        <div className="flex items-center gap-3">
                          <span>{getRoleLabel(user.role)}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="approval_status">Estado de Aprobación</Label>
                      {isEditing ? (
                        <Select value={formData.approval_status} onValueChange={(value) => handleInputChange('approval_status', value)}>
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
                      ) : (
                        <div className="flex items-center gap-3">
                          <span>{getStatusLabel(user.approval_status)}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="department">Departamento</Label>
                      {isEditing ? (
                        <Select value={formData.department_enum} onValueChange={(value) => handleInputChange('department_enum', value)}>
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
                      ) : (
                        <div className="flex items-center gap-3">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span>{user.department_enum || 'Sin departamento asignado'}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="position">Posición</Label>
                      {isEditing ? (
                        <Select value={formData.position_enum} onValueChange={(value) => handleInputChange('position_enum', value)}>
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
                      ) : (
                        <div className="flex items-center gap-3">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{user.position_enum || 'Sin posición asignada'}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="branches" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Sucursales Asignadas</CardTitle>
                    <CardDescription>
                      {shouldShowBranches ? 
                        'Este usuario puede ser asignado a sucursales específicas.' :
                        'Las asignaciones de sucursal solo aplican para empleados en ciertos roles.'
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {shouldShowBranches ? (
                      <div className="space-y-3">
                        {isEditing ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {branchOffices.map((branch) => (
                              <div key={branch.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`branch-${branch.id}`}
                                  checked={selectedBranches.includes(branch.id)}
                                  onCheckedChange={() => handleBranchToggle(branch.id)}
                                />
                                <Label htmlFor={`branch-${branch.id}`} className="text-sm">
                                  {branch.name}
                                </Label>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {user.user_branch_assignments && user.user_branch_assignments.length > 0 ? (
                              user.user_branch_assignments.map((assignment, index) => (
                                <Badge key={index} variant="secondary">
                                  {assignment.branch_offices?.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">Sin sucursales asignadas</span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Este usuario no requiere asignación de sucursales en su rol actual.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="system" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Información del Sistema</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>ID de usuario: {user.user_id}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>ID de perfil: {user.id}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Acciones */}
                {canManageUsers && !isEditing && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Acciones</CardTitle>
                      <CardDescription>
                        Gestiona la información y permisos de este usuario.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsEmployeeSetupOpen(true)}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Configurar Empleado
                        </Button>
                        {user.approval_status === 'pending' && (
                          <>
                            <Button
                              variant="outline"
                              onClick={() => handleApprovalChange(true)}
                              className="text-success border-success hover:bg-success/10"
                            >
                              <UserCheck className="h-4 w-4 mr-2" />
                              Aprobar
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleApprovalChange(false)}
                              className="text-destructive border-destructive hover:bg-destructive/10"
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Rechazar
                            </Button>
                          </>
                        )}
                      </div>
                      
                      <Separator />
                      
                      <div className="pt-2">
                        <Button
                          variant="destructive"
                          onClick={() => setIsDeleteDialogOpen(true)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar Usuario
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      <EmployeeSetupDialog
        isOpen={isEmployeeSetupOpen}
        onOpenChange={setIsEmployeeSetupOpen}
        user={user as any}
        onUserUpdated={onUserUpdated}
      />

      <UserDeleteDialog
        user={user as any}
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onUserDeleted={() => {
          onUserUpdated();
          onOpenChange(false);
        }}
      />
    </>
  );
}