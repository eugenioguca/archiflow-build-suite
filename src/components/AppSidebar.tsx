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
} from "lucide-react";
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
import { useAuth } from "@/hooks/useAuth";

const allMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: BarChart3, color: "text-primary", module: "dashboard" },
  { title: "Calendario", url: "/calendar", icon: Calendar, color: "text-info", module: "calendar" },
  { title: "Clientes", url: "/clients", icon: Users, color: "text-primary", module: "clients" },
  { title: "Ventas", url: "/sales", icon: TrendingUp, color: "text-success", module: "sales" },
  { title: "Diseño", url: "/design", icon: Building, color: "text-purple", module: "design" },
  { title: "Construcción", url: "/construction", icon: HardHat, color: "text-orange", module: "construction" },
  { title: "Proveedores", url: "/suppliers", icon: Truck, color: "text-orange", module: "suppliers" },
  { title: "Finanzas", url: "/finances", icon: DollarSign, color: "text-primary", module: "finances" },
  { title: "Contabilidad", url: "/accounting", icon: Calculator, color: "text-primary", module: "accounting" },
  { title: "Transacciones Unificadas", url: "/unified-transactions", icon: Settings, color: "text-warning", module: "accounting" },
  { title: "Preview Portal Cliente", url: "/client-portal-preview", icon: Eye, color: "text-info", module: "client_portal_preview" },
  { title: "Herramientas", url: "/user-management", icon: UserCheck, color: "text-primary", module: "tools" },
];

const clientItems = [
  { title: "Mi Proyecto", url: "/my-project", icon: Building2, color: "text-info", module: "client_portal" },
  
];

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userDepartment, setUserDepartment] = useState<string | null>(null);
  const [userPosition, setUserPosition] = useState<string | null>(null);
  const isMobile = useIsMobile();
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

  const isActive = (path: string) => currentPath === path;
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

  return (
    <Sidebar 
      collapsible={isMobile ? "none" : "icon"} 
      className="border-r border-sidebar-border"
      variant={isMobile ? "floating" : "sidebar"}
    >
      <SidebarHeader className={`${isMobile ? 'p-3' : 'p-4'} border-b border-sidebar-border`}>
        {(!collapsed || isMobile) && (
          <div className="flex justify-center">
            <img 
              src="/lovable-uploads/2d4574ff-eac1-4a35-8890-f3fb20cf2252.png" 
              alt="Dovita Arquitectura" 
              className={`${isMobile ? 'h-10' : 'h-12'} w-auto dark:hidden`}
            />
            <img 
              src="/lovable-uploads/7a3755e3-978f-4182-af7d-1db88590b5a4.png" 
              alt="Dovita Arquitectura" 
              className={`${isMobile ? 'h-10' : 'h-12'} w-auto hidden dark:block`}
            />
          </div>
        )}
        {collapsed && !isMobile && (
          <div className="flex justify-center">
            <div className="p-2 bg-primary rounded-lg">
              <Building2 className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70 font-medium text-xs">
            Módulos Principales
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className={`${isMobile ? 'h-12' : 'h-11'}`}>
                    <NavLink to={item.url} className={getNavCls} onClick={handleNavigate}>
                      <div className={`p-1.5 rounded-lg ${item.color}`}>
                        <item.icon className="h-5 w-5" />
                      </div>
                      {(!collapsed || isMobile) && (
                        <span className={`font-medium ${isMobile ? 'text-base' : 'text-sm'}`}>{item.title}</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className={`${isMobile ? 'p-3' : 'p-4'} border-t border-sidebar-border`}>
        {(!collapsed || isMobile) && user && (
          <div className="space-y-3">
            <div className={`flex items-center gap-3 ${isMobile ? 'p-2' : 'p-3'} bg-sidebar-accent/50 rounded-lg`}>
              <div className="p-2 bg-primary rounded-full">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`${isMobile ? 'text-sm' : 'text-sm'} font-medium text-sidebar-foreground truncate`}>
                  {user.email}
                </p>
                <p className="text-xs text-sidebar-foreground/70">
                  {userRole === 'client' ? 'Cliente' : getPositionDisplay(userPosition, userDepartment)}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={signOut}
              className="w-full bg-transparent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        )}
        {collapsed && !isMobile && user && (
          <div className="flex justify-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={signOut}
              className="p-2 bg-transparent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}