import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, Shield, Settings } from "lucide-react";

interface User {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'employee' | 'client';
  created_at: string;
  permissions?: UserPermission[];
}

interface UserPermission {
  id: string;
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

type ModuleName = 'dashboard' | 'clients' | 'projects' | 'documents' | 'finances' | 'accounting' | 'progress_photos';

const modules = [
  { id: 'dashboard', name: 'Dashboard', description: 'Vista principal y estadísticas' },
  { id: 'clients', name: 'Clientes', description: 'Gestión de clientes' },
  { id: 'projects', name: 'Proyectos', description: 'Administración de proyectos' },
  { id: 'documents', name: 'Documentos', description: 'Gestión documental' },
  { id: 'finances', name: 'Finanzas', description: 'Control financiero' },
  { id: 'accounting', name: 'Contabilidad', description: 'Registros contables' },
  { id: 'progress_photos', name: 'Fotos de Progreso', description: 'Galería de avances' }
];

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [updatingPermissions, setUpdatingPermissions] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // First fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      if (!profiles || profiles.length === 0) {
        console.log('No profiles found in database');
        setUsers([]);
        return;
      }

      console.log('Fetched profiles:', profiles);

      // Then fetch permissions for each user
      const usersWithPermissions = await Promise.all(
        profiles.map(async (profile) => {
          const { data: permissions, error: permError } = await supabase
            .from('user_permissions')
            .select('*')
            .eq('user_id', profile.user_id);

          if (permError) {
            console.error('Error fetching permissions for user:', profile.user_id, permError);
          }

          return {
            ...profile,
            id: profile.id,
            permissions: permissions || []
          };
        })
      );

      console.log('Users with permissions:', usersWithPermissions);
      setUsers(usersWithPermissions);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'employee' | 'client') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      // If changing to admin, grant all permissions
      if (newRole === 'admin') {
        const adminPermissions = modules.map(module => ({
          user_id: userId,
          module: module.id as any,
          can_view: true,
          can_create: true,
          can_edit: true,
          can_delete: true
        }));

        await supabase
          .from('user_permissions')
          .upsert(adminPermissions, { onConflict: 'user_id,module' });
      }

      toast({
        title: "Éxito",
        description: "Rol actualizado correctamente"
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el rol",
        variant: "destructive"
      });
    }
  };

  const updatePermission = async (
    userId: string,
    module: string,
    permission: keyof Omit<UserPermission, 'id' | 'module'>,
    value: boolean
  ) => {
    setUpdatingPermissions(true);
    try {
      const { error } = await supabase
        .from('user_permissions')
        .upsert({
          user_id: userId,
          module: module as ModuleName,
          [permission]: value,
          // Keep existing permissions for other actions
          can_view: permission === 'can_view' ? value : selectedUser?.permissions?.find(p => p.module === module)?.can_view || false,
          can_create: permission === 'can_create' ? value : selectedUser?.permissions?.find(p => p.module === module)?.can_create || false,
          can_edit: permission === 'can_edit' ? value : selectedUser?.permissions?.find(p => p.module === module)?.can_edit || false,
          can_delete: permission === 'can_delete' ? value : selectedUser?.permissions?.find(p => p.module === module)?.can_delete || false,
        }, { onConflict: 'user_id,module' });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Permisos actualizados correctamente"
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron actualizar los permisos",
        variant: "destructive"
      });
    } finally {
      setUpdatingPermissions(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'employee': return 'default';
      case 'client': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'employee': return 'Empleado';
      case 'client': return 'Cliente';
      default: return role;
    }
  };

  const getUserPermission = (user: User, module: string, permission: string): boolean => {
    const perm = user.permissions?.find(p => p.module === module)?.[permission as keyof UserPermission];
    return Boolean(perm);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6" />
        <div>
          <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">
            Administra roles y permisos de acceso a módulos
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de Usuarios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuarios del Sistema
            </CardTitle>
            <CardDescription>
              {users.length} usuarios registrados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-accent ${
                  selectedUser?.id === user.id ? 'border-primary bg-accent' : ''
                }`}
                onClick={() => setSelectedUser(user)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{user.full_name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <Badge variant={getRoleBadgeVariant(user.role)}>
                    {getRoleLabel(user.role)}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Gestión de Permisos */}
        {selectedUser && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Gestión de Permisos
              </CardTitle>
              <CardDescription>
                Usuario: {selectedUser.full_name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Cambio de Rol */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Rol del Usuario</label>
                <Select
                  value={selectedUser.role}
                  onValueChange={(value: 'admin' | 'employee' | 'client') =>
                    updateUserRole(selectedUser.user_id, value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="employee">Empleado</SelectItem>
                    <SelectItem value="client">Cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Permisos por Módulo */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Permisos por Módulo</h3>
                {selectedUser.role !== 'admin' && (
                  <p className="text-xs text-muted-foreground">
                    Los administradores tienen acceso completo a todos los módulos
                  </p>
                )}
                
                {modules.map((module) => (
                  <div key={module.id} className="space-y-3 p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{module.name}</h4>
                      <p className="text-xs text-muted-foreground">{module.description}</p>
                    </div>
                    
                    {selectedUser.role === 'admin' ? (
                      <div className="text-xs text-muted-foreground italic">
                        Acceso completo (Administrador)
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={getUserPermission(selectedUser, module.id, 'can_view')}
                            onCheckedChange={(checked) =>
                              updatePermission(selectedUser.user_id, module.id, 'can_view', checked)
                            }
                            disabled={updatingPermissions}
                          />
                          <label className="text-xs">Ver</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={getUserPermission(selectedUser, module.id, 'can_create')}
                            onCheckedChange={(checked) =>
                              updatePermission(selectedUser.user_id, module.id, 'can_create', checked)
                            }
                            disabled={updatingPermissions}
                          />
                          <label className="text-xs">Crear</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={getUserPermission(selectedUser, module.id, 'can_edit')}
                            onCheckedChange={(checked) =>
                              updatePermission(selectedUser.user_id, module.id, 'can_edit', checked)
                            }
                            disabled={updatingPermissions}
                          />
                          <label className="text-xs">Editar</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={getUserPermission(selectedUser, module.id, 'can_delete')}
                            onCheckedChange={(checked) =>
                              updatePermission(selectedUser.user_id, module.id, 'can_delete', checked)
                            }
                            disabled={updatingPermissions}
                          />
                          <label className="text-xs">Eliminar</label>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
