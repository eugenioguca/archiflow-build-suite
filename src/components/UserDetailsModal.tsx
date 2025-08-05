import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Mail, Phone, Building, MapPin, Clock, Edit, Settings, UserCheck, UserX, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserEditModal } from './UserEditModal';
import { EmployeeSetupDialog } from './EmployeeSetupDialog';
import { UserDeleteDialog } from './UserDeleteDialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: 'admin' | 'employee' | 'client';
  approval_status: string;
  created_at: string;
  department_enum?: string;
  position_enum?: string;
  user_branch_assignments?: Array<{
    branch_office_id: string;
    branch_offices: { name: string };
  }>;
  [key: string]: any;
}

interface UserDetailsModalProps {
  user: UserProfile | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
  canManageUsers: boolean;
}

export function UserDetailsModal({ 
  user, 
  isOpen, 
  onOpenChange, 
  onUserUpdated,
  canManageUsers 
}: UserDetailsModalProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEmployeeSetupOpen, setIsEmployeeSetupOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  if (!user) return null;

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
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'employee':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'client':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Usuario</DialogTitle>
            <DialogDescription>
              Información completa y acciones disponibles para este usuario.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
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
                  <Badge variant="outline" className={getRoleColor(user.role)}>
                    {getRoleLabel(user.role)}
                  </Badge>
                  <Badge variant="outline" className={getStatusColor(user.approval_status)}>
                    {getStatusLabel(user.approval_status)}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Información de contacto */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información de Contacto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{user.email || 'Sin email'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{user.phone || 'Sin teléfono'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Registrado el {format(new Date(user.created_at), 'dd/MM/yyyy', { locale: es })}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Información profesional */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información Profesional</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span>{user.department_enum || 'Sin departamento asignado'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{user.position_enum || 'Sin posición asignada'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Sucursales asignadas */}
            {user.user_branch_assignments && user.user_branch_assignments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sucursales Asignadas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {user.user_branch_assignments.map((assignment, index) => (
                      <Badge key={index} variant="secondary">
                        {assignment.branch_offices?.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Metadatos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información del Sistema</CardTitle>
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
            {canManageUsers && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Acciones</CardTitle>
                  <CardDescription>
                    Gestiona la información y permisos de este usuario.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditModalOpen(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar Usuario
                    </Button>
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
                          className="text-green-600 border-green-600 hover:bg-green-50"
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Aprobar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleApprovalChange(false)}
                          className="text-red-600 border-red-600 hover:bg-red-50"
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
          </div>
        </DialogContent>
      </Dialog>

      <UserEditModal
        isOpen={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        user={user}
        onUserUpdated={onUserUpdated}
      />

      <EmployeeSetupDialog
        isOpen={isEmployeeSetupOpen}
        onOpenChange={setIsEmployeeSetupOpen}
        user={user}
        onUserUpdated={onUserUpdated}
      />

      <UserDeleteDialog
        user={user}
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