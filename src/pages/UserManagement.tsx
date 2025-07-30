import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, Shield, Settings, Palette, Upload, Image } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface User {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'employee' | 'client';
  approval_status: 'pending' | 'approved' | 'rejected';
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

interface PlatformSettings {
  primary_color: string;
  secondary_color: string;
  company_logo: string;
  dashboard_background: string;
  company_name: string;
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
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({
    primary_color: '#0070f3',
    secondary_color: '#00a8ff',
    company_logo: '/placeholder.svg',
    dashboard_background: '/placeholder.svg',
    company_name: 'Mi Empresa'
  });
  const [activeTab, setActiveTab] = useState('users');
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
    fetchPlatformSettings();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const usersWithPermissions = await Promise.all(
        profiles.map(async (profile) => {
          const { data: permissions } = await supabase
            .from('user_permissions')
            .select('*')
            .eq('user_id', profile.user_id);

          return {
            ...profile,
            id: profile.id,
            approval_status: profile.approval_status as 'pending' | 'approved' | 'rejected',
            permissions: permissions || []
          };
        })
      );

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

  const fetchPlatformSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_key, setting_value');

      if (error) throw error;

      const settings: Partial<PlatformSettings> = {};
      data.forEach((setting) => {
        const value = typeof setting.setting_value === 'string' 
          ? JSON.parse(setting.setting_value) 
          : setting.setting_value;
        settings[setting.setting_key as keyof PlatformSettings] = value;
      });

      setPlatformSettings(prev => ({ ...prev, ...settings }));
    } catch (error: any) {
      console.error('Error fetching platform settings:', error);
    }
  };

  const updatePlatformSetting = async (key: keyof PlatformSettings, value: string) => {
    try {
      const { error } = await supabase
        .from('platform_settings')
        .upsert({
          setting_key: key,
          setting_value: JSON.stringify(value)
        }, { onConflict: 'setting_key' });

      if (error) throw error;

      setPlatformSettings(prev => ({ ...prev, [key]: value }));
      
      toast({
        title: "Configuración actualizada",
        description: "Los cambios se aplicaron correctamente"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la configuración",
        variant: "destructive"
      });
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

  const updateUserApproval = async (userId: string, approvalStatus: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ approval_status: approvalStatus })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `Usuario ${approvalStatus === 'approved' ? 'aprobado' : 'rechazado'} correctamente`,
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de aprobación",
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

  const getApprovalBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const getApprovalLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Aprobado';
      case 'pending': return 'Pendiente';
      case 'rejected': return 'Rechazado';
      default: return status;
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
          <h1 className="text-3xl font-bold">Gestión de Usuarios y Plataforma</h1>
          <p className="text-muted-foreground">
            Administra roles, permisos y personalización de la plataforma
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Gestión de Usuarios</TabsTrigger>
          <TabsTrigger value="customization">Personalización</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
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
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {getRoleLabel(user.role)}
                          </Badge>
                          <Badge variant={getApprovalBadgeVariant(user.approval_status)}>
                            {getApprovalLabel(user.approval_status)}
                          </Badge>
                        </div>
                      </div>
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

                  {/* Gestión de Aprobación */}
                  {selectedUser.approval_status !== 'approved' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Estado de Aprobación</label>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => updateUserApproval(selectedUser.user_id, 'approved')}
                        >
                          Aprobar Usuario
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateUserApproval(selectedUser.user_id, 'rejected')}
                        >
                          Rechazar Usuario
                        </Button>
                      </div>
                    </div>
                  )}

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
        </TabsContent>

        <TabsContent value="customization">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Personalización de Colores */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Colores de la Plataforma
                </CardTitle>
                <CardDescription>
                  Personaliza los colores principales de la aplicación
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="primary-color">Color Primario</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="primary-color"
                      type="color"
                      value={platformSettings.primary_color}
                      onChange={(e) => updatePlatformSetting('primary_color', e.target.value)}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      type="text"
                      value={platformSettings.primary_color}
                      onChange={(e) => updatePlatformSetting('primary_color', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondary-color">Color Secundario</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="secondary-color"
                      type="color"
                      value={platformSettings.secondary_color}
                      onChange={(e) => updatePlatformSetting('secondary_color', e.target.value)}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      type="text"
                      value={platformSettings.secondary_color}
                      onChange={(e) => updatePlatformSetting('secondary_color', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company-name">Nombre de la Empresa</Label>
                  <Input
                    id="company-name"
                    type="text"
                    value={platformSettings.company_name}
                    onChange={(e) => updatePlatformSetting('company_name', e.target.value)}
                    placeholder="Nombre de tu empresa"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Personalización de Imágenes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  Imágenes y Logos
                </CardTitle>
                <CardDescription>
                  Personaliza el logo y las imágenes de la plataforma
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="company-logo">Logo de la Empresa</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="company-logo"
                      type="text"
                      value={platformSettings.company_logo}
                      onChange={(e) => updatePlatformSetting('company_logo', e.target.value)}
                      placeholder="URL del logo"
                      className="flex-1"
                    />
                    <Button variant="outline" size="icon">
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-2">
                    <img 
                      src={platformSettings.company_logo} 
                      alt="Logo preview" 
                      className="w-16 h-16 object-contain border rounded"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dashboard-bg">Imagen de Fondo del Dashboard</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="dashboard-bg"
                      type="text"
                      value={platformSettings.dashboard_background}
                      onChange={(e) => updatePlatformSetting('dashboard_background', e.target.value)}
                      placeholder="URL de la imagen de fondo"
                      className="flex-1"
                    />
                    <Button variant="outline" size="icon">
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-2">
                    <img 
                      src={platformSettings.dashboard_background} 
                      alt="Background preview" 
                      className="w-full h-24 object-cover border rounded"
                    />
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Vista Previa</h4>
                  <div 
                    className="p-4 rounded border-2"
                    style={{ 
                      borderColor: platformSettings.primary_color,
                      backgroundColor: `${platformSettings.secondary_color}10`
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <img 
                        src={platformSettings.company_logo} 
                        alt="Logo" 
                        className="w-8 h-8 object-contain"
                      />
                      <span className="font-bold">{platformSettings.company_name}</span>
                    </div>
                    <div 
                      className="h-16 rounded"
                      style={{
                        backgroundImage: `url(${platformSettings.dashboard_background})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
