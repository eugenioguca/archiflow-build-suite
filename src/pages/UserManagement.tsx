import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { BranchOfficeManager } from '@/components/BranchOfficeManager';
import CommercialAlliancesManager from '@/components/CommercialAlliancesManager';
import { UserClientLinker } from '@/components/UserClientLinker';
import { EmployeeSetupDialog } from '@/components/EmployeeSetupDialog';
import { Loader2, UserX, Trash2, Edit3, Save, X, Link, Users, Building, Handshake, Settings } from 'lucide-react';

// Interfaces
interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: 'admin' | 'employee' | 'client';
  approval_status: string;
  created_at: string;
  [key: string]: any; // Para campos adicionales de Supabase
}

interface Client {
  id: string;
  full_name: string;
  profile_id: string | null;
}

interface ClientProject {
  id: string;
  project_name: string;
  client_id: string;
  status: string;
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [linkingUserId, setLinkingUserId] = useState<string>('');
  const [editingUser, setEditingUser] = useState<string>('');
  const [editForm, setEditForm] = useState({ full_name: '', phone: '' });
  
  // Employee setup dialog states
  const [isEmployeeSetupDialogOpen, setIsEmployeeSetupDialogOpen] = useState(false);
  const [selectedUserForSetup, setSelectedUserForSetup] = useState<UserProfile | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
    fetchCurrentUserRole();
    fetchClients();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      fetchProjectsForClient(selectedClientId);
    } else {
      setProjects([]);
      setSelectedProjectId('');
    }
  }, [selectedClientId]);

  const fetchUsers = async () => {
    try {
      // Obtener los perfiles con email directamente de la tabla profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      setUsers(profiles || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los usuarios"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        if (data && !error) {
          setCurrentUserRole(data.role);
        }
      }
    } catch (error) {
      console.error('Error fetching current user role:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, profile_id')
        .order('full_name', { ascending: true });
      
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los clientes"
      });
    }
  };

  const fetchProjectsForClient = async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from('client_projects')
        .select('id, project_name, client_id, status')
        .eq('client_id', clientId)
        .order('project_name', { ascending: true });
      
      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los proyectos"
      });
    }
  };

  const handleUserUpdate = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          phone: editForm.phone,
        })
        .eq('user_id', userId);

      if (error) throw error;

      setUsers(users.map(user => 
        user.user_id === userId 
          ? { ...user, full_name: editForm.full_name, phone: editForm.phone }
          : user
      ));
      
      setEditingUser('');
      setEditForm({ full_name: '', phone: '' });
      
      toast({
        title: "Usuario actualizado",
        description: "La información del usuario ha sido actualizada exitosamente."
      });
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el usuario"
      });
    }
  };

  const handleApprovalChange = async (userId: string, approved: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ approval_status: approved ? 'approved' : 'pending' })
        .eq('user_id', userId);

      if (error) throw error;

      setUsers(users.map(user => 
        user.user_id === userId ? { ...user, approval_status: approved ? 'approved' : 'pending' } : user
      ));
      
      toast({
        title: "Estado actualizado",
        description: `Usuario ${approved ? 'aprobado' : 'rechazado'} exitosamente.`
      });
    } catch (error) {
      console.error('Error updating approval:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el estado de aprobación"
      });
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'employee' | 'client') => {
    // Si el rol es 'client', mostrar dropdowns para vincular
    if (newRole === 'client') {
      setLinkingUserId(userId);
      setSelectedClientId('');
      setSelectedProjectId('');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      setUsers(users.map(user => 
        user.user_id === userId ? { ...user, role: newRole } : user
      ));
      
      toast({
        title: "Rol actualizado",
        description: "El rol del usuario ha sido actualizado exitosamente."
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el rol del usuario"
      });
    }
  };

  const handleLinkClientToUser = async () => {
    if (!linkingUserId || !selectedClientId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debe seleccionar un cliente para vincular"
      });
      return;
    }

    try {
      const userProfile = users.find(user => user.user_id === linkingUserId);
      if (!userProfile) throw new Error('Usuario no encontrado');

      // 1. Actualizar el rol del usuario a 'client'
      const { error: roleError } = await supabase
        .from('profiles')
        .update({ role: 'client' })
        .eq('user_id', linkingUserId);

      if (roleError) throw roleError;

      // 2. Vincular el profile_id en la tabla clients
      const { error: clientError } = await supabase
        .from('clients')
        .update({ profile_id: userProfile.id })
        .eq('id', selectedClientId);

      if (clientError) throw clientError;

      // 3. Crear configuración del portal
      const { error: portalError } = await supabase
        .from('client_portal_settings')
        .insert({
          client_id: selectedClientId,
          can_view_documents: true,
          can_view_finances: true,
          can_view_photos: true,
          can_view_progress: true
        });

      if (portalError) throw portalError;

      // Actualizar estado local
      setUsers(users.map(user => 
        user.user_id === linkingUserId ? { ...user, role: 'client' } : user
      ));

      // Limpiar estado
      setLinkingUserId('');
      setSelectedClientId('');
      setSelectedProjectId('');

      toast({
        title: "Usuario vinculado exitosamente",
        description: "El usuario ha sido vinculado como cliente y puede acceder a su portal."
      });

    } catch (error) {
      console.error('Error linking client to user:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo vincular el usuario con el cliente"
      });
    }
  };

  const cancelLinking = () => {
    setLinkingUserId('');
    setSelectedClientId('');
    setSelectedProjectId('');
  };

  const handleDeactivateUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          approval_status: 'pending',
          role: 'client'
        })
        .eq('user_id', userId);

      if (error) throw error;

      setUsers(users.map(user => 
        user.user_id === userId ? { ...user, approval_status: 'pending', role: 'client' } : user
      ));
      
      toast({
        title: "Usuario desactivado",
        description: "El usuario ha sido desactivado exitosamente."
      });
    } catch (error) {
      console.error('Error deactivating user:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo desactivar el usuario"
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No authenticated session');
      }

      const response = await fetch('https://ycbflvptfgrjclzzlxci.supabase.co/functions/v1/delete-user', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user');
      }

      setUsers(users.filter(user => user.user_id !== userId));
      
      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido eliminado completamente del sistema."
      });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo eliminar el usuario"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Herramientas</h1>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="linking" className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            Vincular
          </TabsTrigger>
          <TabsTrigger value="branches" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Sucursales
          </TabsTrigger>
          <TabsTrigger value="alliances" className="flex items-center gap-2">
            <Handshake className="h-4 w-4" />
            Alianzas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Usuarios Registrados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4">Nombre</th>
                      <th className="text-left p-4">Email</th>
                      <th className="text-left p-4">Rol</th>
                      <th className="text-left p-4">Estado</th>
                      <th className="text-left p-4">Fecha</th>
                      <th className="text-left p-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b">
                        <td className="p-4">
                          {editingUser === user.id ? (
                            <Input
                              value={editForm.full_name}
                              onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                              placeholder="Nombre completo"
                            />
                          ) : (
                            user.full_name || 'Sin nombre'
                          )}
                        </td>
                        <td className="p-4">{user.email || 'Email no disponible'}</td>
                        <td className="p-4">
                          <Badge 
                            variant={user.role === 'admin' ? 'default' : 
                                   user.role === 'employee' ? 'secondary' : 'outline'}
                          >
                            {user.role === 'admin' ? 'Administrador' : 
                             user.role === 'employee' ? 'Empleado' : 'Cliente'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge variant={user.approval_status === 'approved' ? 'default' : 'destructive'}>
                            {user.approval_status === 'approved' ? 'Aprobado' : 'Pendiente'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            {/* Interface de vinculación usuario-cliente */}
                            {linkingUserId === user.user_id && (
                              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                                <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
                                  <h3 className="text-lg font-semibold mb-4">
                                    Vincular Usuario con Cliente
                                  </h3>
                                  
                                  <div className="space-y-4">
                                    <div>
                                      <Label htmlFor="client-select">Cliente:</Label>
                                      <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Seleccionar cliente" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {clients.filter(c => !c.profile_id).map((client) => (
                                            <SelectItem key={client.id} value={client.id}>
                                              {client.full_name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div className="flex gap-2 justify-end">
                                      <Button variant="outline" onClick={cancelLinking}>
                                        Cancelar
                                      </Button>
                                      <Button onClick={handleLinkClientToUser}>
                                        <Link className="h-4 w-4 mr-2" />
                                        Vincular
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Employee Setup Button */}
                            {user.role === 'employee' && user.approval_status === 'approved' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedUserForSetup(user);
                                  setIsEmployeeSetupDialogOpen(true);
                                }}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            )}

                            {editingUser === user.id ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleUserUpdate(user.user_id)}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingUser('');
                                    setEditForm({ full_name: '', phone: '' });
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingUser(user.id);
                                  setEditForm({
                                    full_name: user.full_name || '',
                                    phone: user.phone || '',
                                  });
                                }}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            )}
                            
                            <Select
                              value={user.approval_status === 'approved' ? "approved" : "pending"}
                              onValueChange={(value) => 
                                handleApprovalChange(user.user_id, value === "approved")
                              }
                            >
                              <SelectTrigger className="w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="approved">Aprobado</SelectItem>
                                <SelectItem value="pending">Pendiente</SelectItem>
                              </SelectContent>
                            </Select>

                            <Select
                              value={user.role}
                              onValueChange={(value: 'admin' | 'employee' | 'client') => 
                                handleRoleChange(user.user_id, value)
                              }
                            >
                              <SelectTrigger className="w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="employee">Empleado</SelectItem>
                                <SelectItem value="client">Cliente</SelectItem>
                              </SelectContent>
                            </Select>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeactivateUser(user.user_id)}
                            >
                              <UserX className="h-4 w-4" />
                            </Button>

                            {currentUserRole === 'admin' && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar usuario permanentemente?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta acción eliminará completamente el usuario del sistema. 
                                      Esta acción no se puede deshacer.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDeleteUser(user.user_id)}
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      Eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Dialog para vincular cliente */}
          {linkingUserId && (
            <Card className="mt-6 border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="h-5 w-5" />
                  Vincular Usuario con Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Seleccionar Cliente</Label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.filter(client => !client.profile_id).map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedClientId && (
                  <div>
                    <Label>Proyecto Principal (Opcional)</Label>
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un proyecto..." />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.project_name} - {project.status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={handleLinkClientToUser} disabled={!selectedClientId}>
                    Vincular Cliente
                  </Button>
                  <Button variant="outline" onClick={cancelLinking}>
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="linking">
          <UserClientLinker />
        </TabsContent>

        <TabsContent value="branches">
          <BranchOfficeManager />
        </TabsContent>

        <TabsContent value="alliances">
          <CommercialAlliancesManager />
        </TabsContent>
      </Tabs>

      {/* Employee Setup Dialog */}
      <EmployeeSetupDialog
        isOpen={isEmployeeSetupDialogOpen}
        onOpenChange={setIsEmployeeSetupDialogOpen}
        user={selectedUserForSetup}
        onUserUpdated={fetchUsers}
      />
    </div>
  );
};

export default UserManagement;