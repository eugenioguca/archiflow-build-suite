import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building, UserCheck, Search } from "lucide-react";
import { usePersonalCalendar, TeamMember } from "@/hooks/usePersonalCalendar";

interface EventQuickInviteProps {
  onUserSelect: (user: TeamMember) => void;
  excludeUserIds?: string[];
}

export const EventQuickInvite = ({ onUserSelect, excludeUserIds = [] }: EventQuickInviteProps) => {
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedPosition, setSelectedPosition] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<TeamMember[]>([]);

  const { getProjectTeamMembers, getUsersByDepartment, getUsersByPosition } = usePersonalCalendar();

  // Obtener proyectos del usuario actual
  const { data: projects = [] } = useQuery({
    queryKey: ['user-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_projects')
        .select('id, project_name, client_id, clients(full_name)')
        .order('project_name');

      if (error) throw error;
      return data || [];
    },
  });

  // Obtener todos los usuarios para búsqueda libre
  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, email, role, position_enum, department_enum')
        .eq('role', 'employee')
        .order('full_name');

      if (error) throw error;
      return data.map(user => ({
        user_id: user.user_id,
        profile_id: user.id,
        full_name: user.full_name || '',
        email: user.email || '',
        user_role: user.role,
        user_position: user.position_enum || '',
        department: user.department_enum || '',
      })) as TeamMember[];
    },
  });

  // Filtrar usuarios por búsqueda libre
  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = allUsers.filter(user =>
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      ).filter(user => !excludeUserIds.includes(user.profile_id));
      
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers([]);
    }
  }, [searchTerm, allUsers, excludeUserIds]);

  // Manejar selección por proyecto
  const handleProjectSelect = async (projectId: string) => {
    setSelectedProject(projectId);
    setSelectedDepartment("");
    setSelectedPosition("");
    setSearchTerm("");
    setFilteredUsers([]);

    if (projectId) {
      try {
        const users = await getProjectTeamMembers(projectId);
        const availableUsers = users.filter(user => !excludeUserIds.includes(user.profile_id));
        setFilteredUsers(availableUsers);
      } catch (error) {
        console.error('Error fetching project team members:', error);
      }
    }
  };

  // Manejar selección por departamento
  const handleDepartmentSelect = async (department: string) => {
    setSelectedDepartment(department);
    setSelectedProject("");
    setSelectedPosition("");
    setSearchTerm("");
    setFilteredUsers([]);

    if (department) {
      try {
        const users = await getUsersByDepartment(department);
        const availableUsers = users.filter(user => !excludeUserIds.includes(user.profile_id));
        setFilteredUsers(availableUsers);
      } catch (error) {
        console.error('Error fetching users by department:', error);
      }
    }
  };

  // Manejar selección por posición
  const handlePositionSelect = async (position: string) => {
    setSelectedPosition(position);
    setSelectedProject("");
    setSelectedDepartment("");
    setSearchTerm("");
    setFilteredUsers([]);

    if (position) {
      try {
        const users = await getUsersByPosition(position);
        const availableUsers = users.filter(user => !excludeUserIds.includes(user.profile_id));
        setFilteredUsers(availableUsers);
      } catch (error) {
        console.error('Error fetching users by position:', error);
      }
    }
  };

  const handleClearFilters = () => {
    setSelectedProject("");
    setSelectedDepartment("");
    setSelectedPosition("");
    setSearchTerm("");
    setFilteredUsers([]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center space-x-2">
          <Users className="h-4 w-4" />
          <span>Invitar Usuarios</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Filtros inteligentes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Por proyecto */}
          <Select value={selectedProject} onValueChange={handleProjectSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Por proyecto..." />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{project.project_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {project.clients?.full_name}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Por departamento */}
          <Select value={selectedDepartment} onValueChange={handleDepartmentSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Por departamento..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ventas">
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4" />
                  <span>Ventas</span>
                </div>
              </SelectItem>
              <SelectItem value="diseño">
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4" />
                  <span>Diseño</span>
                </div>
              </SelectItem>
              <SelectItem value="construccion">
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4" />
                  <span>Construcción</span>
                </div>
              </SelectItem>
              <SelectItem value="finanzas">
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4" />
                  <span>Finanzas</span>
                </div>
              </SelectItem>
              <SelectItem value="contabilidad">
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4" />
                  <span>Contabilidad</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Por posición */}
          <Select value={selectedPosition} onValueChange={handlePositionSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Por posición..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="director">
                <div className="flex items-center space-x-2">
                  <UserCheck className="h-4 w-4" />
                  <span>Directores</span>
                </div>
              </SelectItem>
              <SelectItem value="gerente">
                <div className="flex items-center space-x-2">
                  <UserCheck className="h-4 w-4" />
                  <span>Gerentes</span>
                </div>
              </SelectItem>
              <SelectItem value="jefatura">
                <div className="flex items-center space-x-2">
                  <UserCheck className="h-4 w-4" />
                  <span>Jefaturas</span>
                </div>
              </SelectItem>
              <SelectItem value="analista">
                <div className="flex items-center space-x-2">
                  <UserCheck className="h-4 w-4" />
                  <span>Analistas</span>
                </div>
              </SelectItem>
              <SelectItem value="auxiliar">
                <div className="flex items-center space-x-2">
                  <UserCheck className="h-4 w-4" />
                  <span>Auxiliares</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Búsqueda libre */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Limpiar filtros */}
        {(selectedProject || selectedDepartment || selectedPosition || searchTerm) && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
            className="w-full"
          >
            Limpiar filtros
          </Button>
        )}

        {/* Lista de usuarios filtrados */}
        {filteredUsers.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            <div className="text-sm font-medium text-muted-foreground">
              {filteredUsers.length} usuario{filteredUsers.length !== 1 ? 's' : ''} encontrado{filteredUsers.length !== 1 ? 's' : ''}:
            </div>
            
            {filteredUsers.map((user) => (
              <div
                key={user.profile_id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-medium">{user.full_name}</div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                  <div className="flex items-center space-x-2 mt-1">
                    {user.user_position && (
                      <Badge variant="outline" className="text-xs">
                        {user.user_position}
                      </Badge>
                    )}
                    {user.department && (
                      <Badge variant="secondary" className="text-xs">
                        {user.department}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <Button
                  size="sm"
                  onClick={() => onUserSelect(user)}
                  className="ml-2"
                >
                  Invitar
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Estado vacío */}
        {(selectedProject || selectedDepartment || selectedPosition || searchTerm) && 
         filteredUsers.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            No se encontraron usuarios con los filtros seleccionados
          </div>
        )}
      </CardContent>
    </Card>
  );
};