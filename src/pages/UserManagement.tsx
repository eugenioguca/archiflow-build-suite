import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { BranchOfficeManager } from '@/components/BranchOfficeManager';
import CommercialAlliancesManager from '@/components/CommercialAlliancesManager';
import { UserClientLinker } from '@/components/UserClientLinker';
import { UserEditModal } from '@/components/UserEditModal';
import { EmployeeSetupDialog } from '@/components/EmployeeSetupDialog';
import { UserFilters } from '@/components/UserFilters';
import { UserStatsCards } from '@/components/UserStatsCards';
import { UserManagementTable } from '@/components/UserManagementTable';
import { UserProfile } from '@/types/user';
import { Loader2, Users, Building, Handshake, Link, Settings } from 'lucide-react';
import { CorporateContentManager } from '@/components/CorporateContentManager';

const UserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [positionFilter, setPositionFilter] = useState('all');
  
  // Dialog states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEmployeeSetupDialogOpen, setIsEmployeeSetupDialogOpen] = useState(false);
  const [selectedUserForSetup, setSelectedUserForSetup] = useState<UserProfile | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
    fetchCurrentUserRole();
  }, []);

  // Filtered users based on all filters
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Search filter
      const matchesSearch = !searchTerm || 
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Role filter
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || user.approval_status === statusFilter;
      
      // Department filter
      const matchesDepartment = departmentFilter === 'all' || user.department_enum === departmentFilter;
      
      // Position filter
      const matchesPosition = positionFilter === 'all' || user.position_enum === positionFilter;
      
      return matchesSearch && matchesRole && matchesStatus && matchesDepartment && matchesPosition;
    });
  }, [users, searchTerm, roleFilter, statusFilter, departmentFilter, positionFilter]);

  const hasActiveFilters = searchTerm !== '' || roleFilter !== 'all' || statusFilter !== 'all' || 
                          departmentFilter !== 'all' || positionFilter !== 'all';

  const fetchUsers = async () => {
    try {
      // Obtener los perfiles básicos primero
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Obtener asignaciones de sucursales para cada usuario
      const userIds = profiles?.map(p => p.id) || [];
      const { data: branchAssignments } = await supabase
        .from('user_branch_assignments')
        .select(`
          user_id,
          branch_office_id,
          branch_offices(id, name)
        `)
        .in('user_id', userIds);

      // Combinar datos
      const enrichedProfiles = profiles?.map(profile => ({
        ...profile,
        user_branch_assignments: branchAssignments?.filter(
          assignment => assignment.user_id === profile.id
        ) || []
      })) || [];

      setUsers(enrichedProfiles);
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

  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
    setStatusFilter('all');
    setDepartmentFilter('all');
    setPositionFilter('all');
  };

  const handleEditUser = (user: UserProfile) => {
    setSelectedUserForSetup(user);
    setIsEditModalOpen(true);
  };

  const handleSetupEmployee = (user: UserProfile) => {
    setSelectedUserForSetup(user);
    setIsEmployeeSetupDialogOpen(true);
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

  const handleUserDeleted = (userId: string) => {
    setUsers(users.filter(user => user.user_id !== userId));
    toast({
      title: "Usuario eliminado",
      description: "El usuario ha sido eliminado exitosamente."
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const canManageUsers = currentUserRole === 'admin';

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-6 w-6" />
        <h1 className="text-2xl lg:text-3xl font-bold">Herramientas</h1>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5">
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
          <TabsTrigger value="content" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Contenido Corporativo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          {/* Tarjetas estadísticas */}
          <UserStatsCards users={users as any} />
          
          {/* Filtros */}
          <UserFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            roleFilter={roleFilter}
            onRoleFilterChange={setRoleFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            departmentFilter={departmentFilter}
            onDepartmentFilterChange={setDepartmentFilter}
            positionFilter={positionFilter}
            onPositionFilterChange={setPositionFilter}
            onClearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
          />

          {/* Resultados */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Mostrando {filteredUsers.length} de {users.length} usuarios
              </p>
            </div>
            
            {/* Tabla de usuarios */}
          <UserManagementTable
            users={filteredUsers as any}
            currentUserRole={currentUserRole}
            onUserUpdated={fetchUsers}
            onUserDeleted={fetchUsers}
          />
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground">
                  No se encontraron usuarios
                </h3>
                <p className="text-sm text-muted-foreground">
                  Ajusta los filtros para ver más resultados
                </p>
              </div>
            )}
          </div>
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

        <TabsContent value="content">
          {canManageUsers ? (
            <CorporateContentManager />
          ) : (
            <div className="text-center py-12">
              <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground">
                Acceso Restringido
              </h3>
              <p className="text-sm text-muted-foreground">
                Solo los administradores pueden acceder a la gestión de contenido corporativo
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* User Edit Modal */}
      <UserEditModal
        isOpen={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        user={selectedUserForSetup as any}
        onUserUpdated={fetchUsers}
      />

      {/* Employee Setup Dialog */}
      <EmployeeSetupDialog
        isOpen={isEmployeeSetupDialogOpen}
        onOpenChange={setIsEmployeeSetupDialogOpen}
        user={selectedUserForSetup as any}
        onUserUpdated={fetchUsers}
      />
    </div>
  );
};

export default UserManagement;