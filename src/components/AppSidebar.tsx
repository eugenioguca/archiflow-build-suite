import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Building2,
  Users,
  FolderOpen,
  BarChart3,
  Calculator,
  DollarSign,
  Camera,
  LogOut,
  User,
  TrendingUp,
  Activity,
  Truck,
  Building,
  Settings,
  HardHat,
  Eye,
  UserCheck,
  HandHeart,
  Calendar,
  Pin,
  Menu,
  X,
  Rocket,
} from "lucide-react";
import { PLANNING_V2_ENABLED } from "@/modules/planning_v2/config/featureFlag";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePermissions } from "@/hooks/usePermissions";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";

const baseMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: BarChart3, color: "text-primary", module: "dashboard" },
  { title: "Calendario", url: "/calendar", icon: Calendar, color: "text-info", module: "calendar" },
  { title: "Clientes", url: "/clients", icon: Users, color: "text-primary", module: "clients" },
  { title: "Ventas", url: "/sales", icon: TrendingUp, color: "text-success", module: "sales" },
  { title: "Diseño", url: "/design", icon: Building, color: "text-purple", module: "design" },
  { title: "Presupuestos y Planeación", url: "/presupuestos-planeacion", icon: Calculator, color: "text-blue", module: "construction" },
  ...(PLANNING_V2_ENABLED ? [
    { title: "Planeación v2 (Beta)", url: "/planning-v2", icon: Rocket, color: "text-orange", module: "planning_v2", badge: "Beta" }
  ] : []),
  { title: "Construcción", url: "/construction", icon: HardHat, color: "text-orange", module: "construction" },
  { title: "Proveedores", url: "/suppliers", icon: Truck, color: "text-orange", module: "suppliers" },
  { title: "Finanzas", url: "/finances", icon: DollarSign, color: "text-primary", module: "finances" },
  { title: "Contabilidad", url: "/accounting", icon: Calculator, color: "text-primary", module: "accounting" },
  { title: "Transacciones Unificadas", url: "/unified-transactions", icon: Settings, color: "text-warning", module: "accounting" },
  { title: "Preview Portal Cliente", url: "/client-portal-preview", icon: Eye, color: "text-info", module: "client_portal_preview" },
  { title: "Herramientas", url: "/user-management", icon: UserCheck, color: "text-primary", module: "tools" },
];

const allMenuItems = baseMenuItems;

const clientItems = [
  { title: "Mi Proyecto", url: "/my-project", icon: Building2, color: "text-info", module: "client_portal" },
  
];

// Constantes de anchura
const COLLAPSED_W = 56;
const EXPANDED_W = 240;

type SidebarMode = 'pinned-open' | 'pinned-closed' | 'hover-open';

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const currentPath = location.pathname;
  
  // Estados de la máquina de estados del sidebar
  const [isPinnedOpen, setIsPinnedOpen] = useState<boolean>(false);
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const isMobile = useIsMobile();
  
  // Estado derivado: expandido si está pinned-open O si está en hover (hover-open)
  const isExpanded = isPinnedOpen || isHovering;
  
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userDepartment, setUserDepartment] = useState<string | null>(null);
  const [userPosition, setUserPosition] = useState<string | null>(null);
  const { hasModuleAccess, isLoading } = usePermissions();

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('role, department_enum, position_enum')
          .eq('user_id', user.id)
          .single();
        
        if (data && !error) {
          setUserRole(data.role);
          setUserDepartment(data.department_enum);
          setUserPosition(data.position_enum);
        } else {
          setUserRole(null);
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  const handleNavigate = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handlePinToggle = () => {
    setIsPinnedOpen(prev => !prev);
  };

  const isActive = (path: string) => {
    // Special handling for Planning v2 routes
    if (path === '/planning-v2') {
      return currentPath.startsWith('/planning-v2');
    }
    return currentPath === path;
  };
  
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md" 
      : "hover:bg-sidebar-accent/80 transition-all duration-200";

  // Filter menu items based on user permissions
  let menuItems = allMenuItems;
  
  if (userRole === 'client') {
    menuItems = clientItems;
  } else if (!isLoading) {
    // Filter items based on permissions
    menuItems = allMenuItems.filter(item => hasModuleAccess(item.module));
  }

  // Helper function to display position in Spanish
  const getPositionDisplay = (position: string | null, department: string | null) => {
    if (!position) return 'Usuario';
    
    // Special case for Director General
    if (position === 'director' && department === 'general') {
      return 'Director General';
    }
    
    const positionMap: Record<string, string> = {
      'director': 'Director',
      'gerente': 'Gerente',
      'coordinador': 'Coordinador',
      'supervisor': 'Supervisor',
      'especialista': 'Especialista',
      'auxiliar': 'Auxiliar'
    };

    const departmentMap: Record<string, string> = {
      'general': 'General',
      'ventas': 'Ventas',
      'diseño': 'Diseño',
      'construcción': 'Construcción',
      'finanzas': 'Finanzas',
      'contabilidad': 'Contabilidad'
    };

    const positionTitle = positionMap[position] || position;
    const departmentTitle = department ? departmentMap[department] || department : '';
    
    return `${positionTitle} ${departmentTitle}`.trim();
  };

  if (isMobile) {
    return (
      <Sidebar 
        collapsible="none"
        className="border-r border-sidebar-border"
        variant="floating"
      >
        {/* Contenido móvil simplificado - mantener funcionalmente igual */}
        <SidebarHeader className="shrink-0 p-2 border-b border-sidebar-border">
          <div className="flex justify-center">
            <img 
              src="/lovable-uploads/2d4574ff-eac1-4a35-8890-f3fb20cf2252.png" 
              alt="Dovita Arquitectura" 
              className="h-12 w-auto dark:hidden"
            />
            <img 
              src="/lovable-uploads/7a3755e3-978f-4182-af7d-1db88590b5a4.png" 
              alt="Dovita Arquitectura" 
              className="h-12 w-auto hidden dark:block"
            />
          </div>
        </SidebarHeader>

        <SidebarContent className="flex-1 overflow-y-auto px-2">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-10">
                      <NavLink to={item.url} className={getNavCls} onClick={handleNavigate}>
                        <div className={`p-1 rounded-lg ${item.color}`}>
                          <item.icon className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-xs">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {user && (
          <SidebarFooter className="shrink-0 p-2 border-t border-sidebar-border">
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-sidebar-accent/50 rounded-lg">
                <div className="p-1.5 bg-primary rounded-full">
                  <User className="h-3 w-3 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-sidebar-foreground truncate">
                    {user.email}
                  </p>
                  <p className="text-[10px] text-sidebar-foreground/70">
                    {userRole === 'client' ? 'Cliente' : getPositionDisplay(userPosition, userDepartment)}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={signOut}
                className="w-full h-8 bg-transparent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent text-xs"
              >
                <LogOut className="h-3 w-3 mr-1" />
                Cerrar Sesión
              </Button>
            </div>
          </SidebarFooter>
        )}
      </Sidebar>
    );
  }

  return (
    <TooltipProvider>
      <aside 
        className="fixed left-0 top-0 h-screen z-40 bg-sidebar shadow-sm transition-[width] duration-200 ease-out border-r border-sidebar-border flex flex-col"
        style={{ width: isExpanded ? EXPANDED_W : COLLAPSED_W }}
        onMouseEnter={() => !isPinnedOpen && setIsHovering(true)}
        onMouseLeave={() => !isPinnedOpen && setIsHovering(false)}
      >
        {/* Header con logo y botón pin */}
        <header className="shrink-0 p-3 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            {isExpanded && (
              <div className="flex justify-center flex-1">
                <img 
                  src="/lovable-uploads/2d4574ff-eac1-4a35-8890-f3fb20cf2252.png" 
                  alt="Dovita Arquitectura" 
                  className="h-12 w-auto dark:hidden"
                />
                <img 
                  src="/lovable-uploads/7a3755e3-978f-4182-af7d-1db88590b5a4.png" 
                  alt="Dovita Arquitectura" 
                  className="h-12 w-auto hidden dark:block"
                />
              </div>
            )}
            
            {!isExpanded && (
              <div className="flex justify-center w-full">
                <div className="p-1.5 bg-primary rounded-lg">
                  <Building2 className="h-4 w-4 text-primary-foreground" />
                </div>
              </div>
            )}
            
            {/* Botón Pin - solo visible en expandido */}
            {isExpanded && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePinToggle}
                className={`ml-2 p-1 ${isPinnedOpen ? 'bg-primary text-primary-foreground' : 'hover:bg-sidebar-accent'}`}
                aria-pressed={isPinnedOpen}
                aria-label={isPinnedOpen ? "Desanclar sidebar" : "Anclar sidebar"}
              >
                <Pin className={`h-3 w-3 transition-transform ${isPinnedOpen ? 'rotate-45' : ''}`} />
              </Button>
            )}
          </div>
        </header>

        {/* Contenido de navegación con scroll */}
        <nav className="flex-1 overflow-y-auto px-2 py-2">
          <ul className={`space-y-1 ${!isExpanded ? 'flex flex-col items-center' : ''}`}>
            {menuItems.map((item) => {
              const itemIsActive = isActive(item.url);
              
              return (
                <li key={item.title}>
                  {isExpanded ? (
                    <NavLink
                      to={item.url}
                      className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-150 ${
                        itemIsActive 
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md" 
                          : "hover:bg-sidebar-accent/80"
                      }`}
                      onClick={handleNavigate}
                    >
                      <span
                        className="flex items-center justify-center w-8 h-8 shrink-0 rounded-lg"
                        style={{ overflow: 'visible' }}
                      >
                        <div className={`p-1 rounded-lg ${item.color}`}>
                          <item.icon className="w-5 h-5" />
                        </div>
                      </span>
                      
                       <span className="whitespace-nowrap overflow-hidden font-medium text-xs flex-1">
                         {item.title}
                       </span>
                       {(item as any).badge && (
                         <span 
                           className="ml-auto text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-medium"
                           aria-label={(item as any).badge}
                         >
                           {(item as any).badge}
                         </span>
                       )}
                    </NavLink>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <NavLink
                          to={item.url}
                          className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-150 ${
                            itemIsActive 
                              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md" 
                              : "hover:bg-sidebar-accent/80"
                          }`}
                          onClick={handleNavigate}
                        >
                          <span
                            className="flex items-center justify-center w-8 h-8 shrink-0 rounded-lg"
                            style={{ overflow: 'visible' }}
                          >
                            <div className={`p-1 rounded-lg ${item.color}`}>
                              <item.icon className="w-5 h-5" />
                            </div>
                          </span>
                        </NavLink>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="ml-2">
                        {item.title}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer con información del usuario */}
        {user && (
          <footer className="shrink-0 p-2 border-t border-sidebar-border">
            {isExpanded ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-sidebar-accent/50 rounded-lg">
                  <div className="p-1.5 bg-primary rounded-full">
                    <User className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-sidebar-foreground truncate">
                      {user.email}
                    </p>
                    <p className="text-[10px] text-sidebar-foreground/70">
                      {userRole === 'client' ? 'Cliente' : getPositionDisplay(userPosition, userDepartment)}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={signOut}
                  className="w-full h-8 bg-transparent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent text-xs"
                >
                  <LogOut className="h-3 w-3 mr-1" />
                  Cerrar Sesión
                </Button>
              </div>
            ) : (
              <div className="flex justify-center">
                {user ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={signOut}
                        className="p-1.5 bg-transparent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent"
                      >
                        <LogOut className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="ml-2">
                      Cerrar Sesión
                    </TooltipContent>
                  </Tooltip>
                ) : null}
              </div>
            )}
          </footer>
        )}
      </aside>
    </TooltipProvider>
  );
}