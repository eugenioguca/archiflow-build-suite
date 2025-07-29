import { NavLink, useLocation } from "react-router-dom";
import {
  Building2,
  Users,
  FolderOpen,
  BarChart3,
  Calculator,
  DollarSign,
  Camera,
  LogOut,
  User
} from "lucide-react";

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

const adminItems = [
  { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
  { title: "Clientes", url: "/clients", icon: Users },
  { title: "Proyectos", url: "/projects", icon: Building2 },
  { title: "Documentos", url: "/documents", icon: FolderOpen },
  { title: "Finanzas", url: "/finances", icon: DollarSign },
  { title: "Contabilidad", url: "/accounting", icon: Calculator },
  { title: "Fotos de Avance", url: "/progress-photos", icon: Camera },
];

const clientItems = [
  { title: "Mi Proyecto", url: "/my-project", icon: Building2 },
  { title: "Documentos", url: "/my-documents", icon: FolderOpen },
  { title: "Fotos de Avance", url: "/my-photos", icon: Camera },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50";

  // For now, showing admin items. Later we'll add role-based logic
  const menuItems = adminItems;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-sidebar-primary" />
            <span className="font-semibold text-sidebar-foreground">DOVITA CRM</span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Módulos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed && user && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-sidebar-foreground">
              <User className="h-4 w-4" />
              <span>{user.email}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={signOut}
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}