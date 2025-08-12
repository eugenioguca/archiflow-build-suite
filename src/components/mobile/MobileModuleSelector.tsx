import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Menu,
  BarChart3,
  Calendar,
  Users,
  TrendingUp,
  Building,
  HardHat,
  Truck,
  DollarSign,
  Calculator,
  Settings,
  Eye,
  UserCheck,
  Building2,
  Home
} from "lucide-react";

// All available modules from AppSidebar
const allMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: BarChart3, color: "text-primary", module: "dashboard" },
  { title: "Calendario", url: "/calendar", icon: Calendar, color: "text-info", module: "calendar" },
  { title: "Clientes", url: "/clients", icon: Users, color: "text-primary", module: "clients" },
  { title: "Ventas", url: "/sales", icon: TrendingUp, color: "text-success", module: "sales" },
  { title: "Diseño", url: "/design", icon: Building, color: "text-purple", module: "design" },
  { title: "Construcción", url: "/construction", icon: HardHat, color: "text-orange", module: "construction" },
  { title: "Proveedores", url: "/suppliers", icon: Truck, color: "text-orange", module: "suppliers" },
  { title: "Finanzas", url: "/finances-new", icon: DollarSign, color: "text-primary", module: "finances" },
  { title: "Contabilidad", url: "/accounting", icon: Calculator, color: "text-primary", module: "accounting" },
  { title: "Transacciones", url: "/unified-transactions", icon: Settings, color: "text-warning", module: "accounting" },
  { title: "Portal Cliente", url: "/client-portal-preview", icon: Eye, color: "text-info", module: "client_portal_preview" },
  { title: "Herramientas", url: "/user-management", icon: UserCheck, color: "text-primary", module: "tools" },
];

const clientItems = [
  { title: "Mi Proyecto", url: "/my-project", icon: Building2, color: "text-info", module: "client_portal" },
];

export function MobileModuleSelector() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { hasModuleAccess } = usePermissions();
  
  if (!isMobile) return null;

  // Determine which items to show based on user role
  const isClient = user?.user_metadata?.role === 'client';
  const menuItems = isClient ? clientItems : allMenuItems.filter(item => {
    if (item.module === 'client_portal_preview') return false; // Hide preview for regular users
    return hasModuleAccess(item.module);
  });

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 md:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button 
            size="lg" 
            className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 border-2 border-background animate-pulse"
          >
            <Menu className="h-6 w-6 text-primary-foreground" />
          </Button>
        </SheetTrigger>
        <SheetContent 
          side="bottom" 
          className="h-[85vh] rounded-t-3xl border-t-2 border-border/20 bg-background/95 backdrop-blur-sm"
        >
          <SheetHeader className="pb-4">
            <SheetTitle className="text-lg font-semibold text-foreground">
              Módulos Disponibles
            </SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              Selecciona el módulo al que deseas acceder
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto space-y-3 pb-6">
            <div className="grid grid-cols-2 gap-3">
              {menuItems.map((item) => (
                <Button
                  key={item.url}
                  variant="ghost"
                  onClick={() => handleNavigation(item.url)}
                  className={`h-20 flex-col gap-2 bg-card/50 hover:bg-card/80 border border-border/20 rounded-xl transition-all duration-200 ${
                    location.pathname === item.url ? 'bg-primary/10 border-primary/20' : ''
                  }`}
                >
                  <div className="p-2 rounded-lg bg-primary/10">
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <span className="text-xs font-medium text-foreground text-center leading-tight">
                    {item.title}
                  </span>
                  {location.pathname === item.url && (
                    <Badge variant="secondary" className="text-xs">
                      Actual
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}