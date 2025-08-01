import { UserProfileForm } from "@/components/UserProfileForm";
import { BranchOfficeManager } from "@/components/BranchOfficeManager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Edit2, Users, Settings, Check, Clock, X, Building } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface UserProfile {
  id: string;
  user_id: string;
  full_name?: string;
  display_name?: string;
  email?: string;
  position?: string;
  department?: string;
  phone?: string;
  role: string;
  approval_status: string;
  created_at: string;
  profile_completed?: boolean;
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUsers(profiles || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUserUpdate = async (updatedProfile: any) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: updatedProfile.full_name,
          position: updatedProfile.position,
          department: updatedProfile.department,
          phone: updatedProfile.phone,
          profile_completed: true
        })
        .eq('user_id', updatedProfile.user_id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Usuario actualizado correctamente"
      });

      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el usuario",
        variant: "destructive"
      });
    }
  };

  const handleApprovalChange = async (userId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ approval_status: newStatus })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `Estado de aprobación actualizado a ${newStatus}`
      });

      fetchUsers();
    } catch (error: any) {
      console.error('Error updating approval:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de aprobación",
        variant: "destructive"
      });
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'employee' | 'client') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `Rol actualizado a ${newRole}`
      });

      fetchUsers();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el rol",
        variant: "destructive"
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      // En lugar de eliminar el usuario del auth (que requiere service_role),
      // marcamos el perfil como eliminado y lo desactivamos
      const { error } = await supabase
        .from('profiles')
        .update({ 
          approval_status: 'rejected',
          role: 'client' // Cambiar a rol más básico
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Usuario desactivado correctamente"
      });

      fetchUsers();
    } catch (error: any) {
      console.error('Error deactivating user:', error);
      toast({
        title: "Error",
        description: "No se pudo desactivar el usuario",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Herramientas</h1>
        </div>
      </div>

      <Alert>
        <Settings className="h-4 w-4" />
        <AlertDescription>
          Este módulo incluye la gestión de usuarios y sucursales. Cada usuario debe completar su tarjeta de contacto para poder ser añadido a los equipos de proyectos.
        </AlertDescription>
      </Alert>

      {!loading && (
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Gestión de Usuarios
            </TabsTrigger>
            <TabsTrigger value="branches" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Sucursales
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Usuarios Registrados
                </CardTitle>
                <CardDescription>
                  Gestiona los usuarios de la plataforma, sus roles y estado de aprobación. Cada usuario debe completar su tarjeta de contacto para ser añadido a proyectos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {users.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No hay usuarios registrados
                  </p>
                ) : (
                  <div className="space-y-4">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">
                              {user.full_name || user.display_name || "Sin nombre"}
                            </h3>
                            <Badge variant={user.role === 'admin' ? 'default' : user.role === 'employee' ? 'secondary' : 'outline'}>
                              {user.role}
                            </Badge>
                            <Badge variant={
                              user.approval_status === 'approved' ? 'default' : 
                              user.approval_status === 'pending' ? 'secondary' : 
                              'destructive'
                            }>
                              {user.approval_status === 'approved' && <Check className="h-3 w-3 mr-1" />}
                              {user.approval_status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                              {user.approval_status === 'rejected' && <X className="h-3 w-3 mr-1" />}
                              {user.approval_status}
                            </Badge>
                            {user.profile_completed && (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                Perfil Completo
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {user.email}
                          </p>
                          {user.position && user.department && (
                            <p className="text-xs text-muted-foreground">
                              {user.position} - {user.department}
                            </p>
                          )}
                          {user.phone && (
                            <p className="text-xs text-muted-foreground">
                              Teléfono: {user.phone}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Registrado: {new Date(user.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Edit2 className="h-4 w-4 mr-1" />
                                Editar
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Editar Usuario</DialogTitle>
                                <DialogDescription>
                                  Actualiza la información del usuario y su tarjeta de contacto
                                </DialogDescription>
                              </DialogHeader>
                              <UserProfileForm 
                                profile={user as any}
                                onSave={handleUserUpdate}
                                isEditing={true}
                              />
                            </DialogContent>
                          </Dialog>
                          
                          <Select value={user.approval_status} onValueChange={(value) => handleApprovalChange(user.user_id, value)}>
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pendiente</SelectItem>
                              <SelectItem value="approved">Aprobado</SelectItem>
                              <SelectItem value="rejected">Rechazado</SelectItem>
                            </SelectContent>
                          </Select>

                          <Select value={user.role} onValueChange={(value: 'admin' | 'employee' | 'client') => handleRoleChange(user.user_id, value)}>
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="employee">Employee</SelectItem>
                              <SelectItem value="client">Client</SelectItem>
                            </SelectContent>
                          </Select>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción desactivará al usuario cambiando su estado a "rechazado" y su rol a "client". El usuario no será eliminado del sistema pero perderá sus permisos administrativos.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteUser(user.user_id)}>
                                  Desactivar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="branches">
            <BranchOfficeManager />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}