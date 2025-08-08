import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/use-debounce";
import { usePersonalCalendar, TeamMember } from "@/hooks/usePersonalCalendar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Users, 
  Building, 
  UserCheck, 
  Search, 
  X, 
  Plus,
  UserPlus,
  BrainCircuit
} from "lucide-react";

interface EventInviteManagerProps {
  onUserSelect: (user: TeamMember) => void;
  excludeUserIds?: string[];
  selectedUsers?: TeamMember[];
  onRemoveUser?: (userId: string) => void;
}

export const EventInviteManager = ({ 
  onUserSelect, 
  excludeUserIds = [],
  selectedUsers = [],
  onRemoveUser
}: EventInviteManagerProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<{
    type: 'project' | 'department' | 'position' | 'search' | null;
    value: string;
  }>({ type: null, value: "" });
  
  const debouncedSearch = useDebounce(searchTerm, 300);
  const isMobile = useIsMobile();
  const { profile } = useAuth();
  
  const { 
    getProjectTeamMembers, 
    getUsersByDepartment, 
    getUsersByPosition,
    searchUsersForInvitation 
  } = usePersonalCalendar();

  // Crear lista de usuarios excluidos incluyendo al usuario actual
  const allExcludedUserIds = useMemo(() => {
    const currentUserProfileId = profile?.id;
    return currentUserProfileId 
      ? [...excludeUserIds, currentUserProfileId] 
      : excludeUserIds;
  }, [excludeUserIds, profile?.id]);

  // Obtener proyectos disponibles
  const { data: projects = [] } = useQuery({
    queryKey: ['user-projects-for-invite'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_projects')
        .select(`
          id, 
          project_name, 
          client_id, 
          clients(full_name),
          assigned_advisor_id,
          project_manager_id,
          construction_supervisor_id
        `)
        .order('project_name');

      if (error) throw error;
      return data || [];
    },
  });

  // Obtener departamentos únicos
  const { data: departments = [] } = useQuery({
    queryKey: ['available-departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('department_enum')
        .not('department_enum', 'is', null)
        .in('role', ['admin', 'employee']);

      console.log('🔍 Departments query result:', { data, error });
      if (error) throw error;
      const unique = [...new Set(data.map(d => d.department_enum))];
      console.log('🔍 Unique departments:', unique);
      return unique.filter(Boolean);
    },
  });

  // Obtener posiciones únicas
  const { data: positions = [] } = useQuery({
    queryKey: ['available-positions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('position_enum')
        .not('position_enum', 'is', null)
        .in('role', ['admin', 'employee']);

      console.log('🔍 Positions query result:', { data, error });
      if (error) throw error;
      const unique = [...new Set(data.map(p => p.position_enum))];
      console.log('🔍 Unique positions:', unique);
      return unique.filter(Boolean);
    },
  });

  // Obtener usuarios filtrados
  const { data: filteredUsers = [], isLoading } = useQuery({
    queryKey: ['filtered-users', activeFilter.type, activeFilter.value, debouncedSearch],
    queryFn: async () => {
      console.log('🔍 Starting user filter query:', { 
        type: activeFilter.type, 
        value: activeFilter.value, 
        search: debouncedSearch 
      });
      
      let users: TeamMember[] = [];

      if (activeFilter.type === 'search' || debouncedSearch) {
        console.log('🔍 Using search users function');
        users = await searchUsersForInvitation(debouncedSearch);
      } else if (activeFilter.type === 'project' && activeFilter.value) {
        console.log('🔍 Using project team members function');
        users = await getProjectTeamMembers(activeFilter.value);
      } else if (activeFilter.type === 'department' && activeFilter.value) {
        console.log('🔍 Using department users function');
        users = await getUsersByDepartment(activeFilter.value);
      } else if (activeFilter.type === 'position' && activeFilter.value) {
        console.log('🔍 Using position users function');
        users = await getUsersByPosition(activeFilter.value);
      }

      console.log('🔍 Fetched users:', users);
      console.log('🔍 Excluded user IDs:', allExcludedUserIds);
      
      // Filtrar usuarios ya seleccionados y usuario actual
      const filtered = users.filter(user => {
        const isCurrentUser = user.profile_id === profile?.id;
        const isExcluded = allExcludedUserIds.includes(user.profile_id);
        return !isCurrentUser && !isExcluded;
      });
      return filtered;
    },
    enabled: !!(activeFilter.type && activeFilter.value) || !!debouncedSearch,
  });

  // Preparar opciones para comboboxes
  const projectOptions = useMemo(() => {
    return projects.map(p => ({
      value: p.id,
      label: `${p.project_name} (${p.clients?.full_name || 'Sin cliente'})`
    }));
  }, [projects]);

  const departmentOptions = useMemo(() => {
    return departments.map(d => ({
      value: d,
      label: d.charAt(0).toUpperCase() + d.slice(1)
    }));
  }, [departments]);

  const positionOptions = useMemo(() => {
    return positions.map(p => ({
      value: p,
      label: p.charAt(0).toUpperCase() + p.slice(1).replace('_', ' ')
    }));
  }, [positions]);

  // Manejar selección de filtros
  const handleFilterSelect = (type: 'project' | 'department' | 'position', value: string) => {
    setActiveFilter({ type, value });
    setSearchTerm("");
  };

  // Manejar búsqueda libre
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (value.trim()) {
      setActiveFilter({ type: 'search', value: value.trim() });
    } else {
      setActiveFilter({ type: null, value: "" });
    }
  };

  // Limpiar filtros
  const clearFilters = () => {
    setActiveFilter({ type: null, value: "" });
    setSearchTerm("");
  };

  // Detectar si hay proyecto actual (simplificado - usar el primer proyecto por ahora)
  const suggestedProject = projects[0];

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center space-x-2">
          <UserPlus className="h-4 w-4" />
          <span>Invitar Personas</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Sugerencia inteligente de proyecto */}
        {suggestedProject && !activeFilter.type && (
          <div className="p-3 bg-muted/50 rounded-lg border border-dashed">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BrainCircuit className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Proyecto sugerido</p>
                  <p className="text-xs text-muted-foreground">{suggestedProject.project_name}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleFilterSelect('project', suggestedProject.id)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Usar
              </Button>
            </div>
          </div>
        )}

        {/* Filtros inteligentes */}
        <div className={isMobile ? 'space-y-3' : 'grid grid-cols-1 md:grid-cols-3 gap-3'}>
          <Combobox
            items={projectOptions}
            value={activeFilter.type === 'project' ? activeFilter.value : ""}
            onValueChange={(value) => handleFilterSelect('project', value)}
            placeholder="Por proyecto..."
            emptyText="No hay proyectos"
          />
          
          <Combobox
            items={departmentOptions}
            value={activeFilter.type === 'department' ? activeFilter.value : ""}
            onValueChange={(value) => handleFilterSelect('department', value)}
            placeholder="Por departamento..."
            emptyText="No hay departamentos"
          />
          
          <Combobox
            items={positionOptions}
            value={activeFilter.type === 'position' ? activeFilter.value : ""}
            onValueChange={(value) => handleFilterSelect('position', value)}
            placeholder="Por posición..."
            emptyText="No hay posiciones"
          />
        </div>

        {/* Búsqueda libre con autocompletado */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre o email (ej: 'Seb' para Sebastian)..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          />
        </div>

        {/* Filtro activo */}
        {activeFilter.type && (
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="flex items-center space-x-1">
              <span className="text-xs">
                {activeFilter.type === 'project' && "Proyecto: "}
                {activeFilter.type === 'department' && "Departamento: "}
                {activeFilter.type === 'position' && "Posición: "}
                {activeFilter.type === 'search' && "Búsqueda: "}
                {activeFilter.type === 'search' ? activeFilter.value : 
                 (activeFilter.type === 'project' ? 
                  projects.find(p => p.id === activeFilter.value)?.project_name :
                  activeFilter.value
                 )}
              </span>
              <button onClick={clearFilters}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          </div>
        )}

        {/* Usuarios seleccionados */}
        {selectedUsers.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              {selectedUsers.length} persona{selectedUsers.length !== 1 ? 's' : ''} invitada{selectedUsers.length !== 1 ? 's' : ''}:
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((user) => (
                <Badge key={user.profile_id} variant="default" className="flex items-center space-x-1">
                  <span>{user.full_name}</span>
                  {onRemoveUser && (
                    <button onClick={() => onRemoveUser(user.profile_id)}>
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
            <Separator />
          </div>
        )}

        {/* Lista de usuarios filtrados */}
        {filteredUsers.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              {filteredUsers.length} persona{filteredUsers.length !== 1 ? 's' : ''} encontrada{filteredUsers.length !== 1 ? 's' : ''}:
            </div>
            
            <ScrollArea className={`${isMobile ? 'h-48' : 'h-64'} w-full`}>
              <div className="space-y-2 pr-2">
                {filteredUsers.map((user) => (
                  <div
                    key={user.profile_id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{user.full_name}</div>
                      <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                      <div className="flex items-center space-x-1 mt-1">
                        {user.user_position && (
                          <Badge variant="outline" className="text-xs">
                            {user.user_position.replace('_', ' ')}
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
                      className="ml-2 shrink-0"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {isMobile ? "" : "Invitar"}
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Estados vacíos */}
        {isLoading && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Buscando personas...
          </div>
        )}

        {activeFilter.type && !isLoading && filteredUsers.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No se encontraron personas con {activeFilter.type === 'search' ? 'la búsqueda' : 'el filtro'} seleccionado
          </div>
        )}

        {!activeFilter.type && !searchTerm && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Usa los filtros o busca personas para invitar al evento
          </div>
        )}
      </CardContent>
    </Card>
  );
};