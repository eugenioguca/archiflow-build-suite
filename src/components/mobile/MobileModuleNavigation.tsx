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
import { Separator } from "@/components/ui/separator";
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
  Home,
  Clock,
  FileText,
  Search,
  Filter,
  FolderOpen,
  Construction,
  Palette
} from "lucide-react";

interface ModuleAction {
  label: string;
  icon: React.ElementType;
  path: string;
  description?: string;
  badge?: string;
}

interface ModuleConfig {
  title: string;
  description: string;
  categories: {
    [key: string]: ModuleAction[];
  };
}

const moduleConfigs: Record<string, ModuleConfig> = {
  dashboard: {
    title: "Dashboard Principal",
    description: "Vista general de la plataforma",
    categories: {
      "Navegación": [
        { label: "Inicio", icon: Home, path: "/", description: "Página principal" },
      ]
    }
  },
  sales: {
    title: "Módulo de Ventas",
    description: "Gestión completa del proceso de ventas",
    categories: {
      "Visualizar": [
        { label: "Pipeline", icon: Eye, path: "/sales", description: "Vista del embudo de ventas" },
        { label: "CRM", icon: Users, path: "/sales?tab=crm", description: "Gestión de relaciones" },
      ],
      "Gestionar": [
        { label: "Nuevo Proyecto", icon: Settings, path: "/sales?action=new", description: "Crear proyecto" },
        { label: "Seguimiento", icon: Clock, path: "/sales?tab=follow-up", description: "Seguimiento de leads" },
      ],
      "Análisis": [
        { label: "Métricas", icon: BarChart3, path: "/sales?tab=analytics", description: "Análisis de ventas" },
        { label: "Reportes", icon: FileText, path: "/sales?tab=reports", description: "Reportes de rendimiento" },
      ]
    }
  },
  clients: {
    title: "Módulo de Clientes",
    description: "Administración y seguimiento de clientes",
    categories: {
      "Gestión": [
        { label: "Lista de Clientes", icon: Users, path: "/clients", description: "Todos los clientes" },
        { label: "Nuevo Cliente", icon: UserCheck, path: "/clients?action=new", description: "Registrar cliente" },
      ],
      "Búsqueda": [
        { label: "Buscar", icon: Search, path: "/clients?tab=search", description: "Buscar clientes" },
        { label: "Filtros", icon: Filter, path: "/clients?tab=filters", description: "Filtros avanzados" },
      ],
      "Documentos": [
        { label: "Expedientes", icon: FolderOpen, path: "/clients?tab=documents", description: "Gestión documental" },
        { label: "Contratos", icon: FileText, path: "/clients?tab=contracts", description: "Contratos y acuerdos" },
      ]
    }
  },
  construction: {
    title: "Módulo de Construcción",
    description: "Seguimiento y control de obra",
    categories: {
      "Principal": [
        { label: "Dashboard", icon: Construction, path: "/construction", description: "Vista general de obras" },
        { label: "Proyectos", icon: Building2, path: "/construction?tab=projects", description: "Lista de proyectos" },
      ],
      "Gestión": [
        { label: "Cronograma", icon: Clock, path: "/construction?tab=schedule", description: "Programación de obra" },
        { label: "Recursos", icon: Settings, path: "/construction?tab=resources", description: "Materiales y equipos" },
      ],
      "Documentación": [
        { label: "Reportes", icon: FileText, path: "/construction?tab=reports", description: "Reportes de avance" },
        { label: "Fotos", icon: Eye, path: "/construction?tab=photos", description: "Galería de progreso" },
      ]
    }
  },
  finances: {
    title: "Módulo Financiero",
    description: "Control financiero y contable",
    categories: {
      "Operativo": [
        { label: "Transacciones", icon: DollarSign, path: "/finances-new", description: "Movimientos financieros" },
        { label: "Tesorería", icon: Calculator, path: "/finances-new?tab=treasury", description: "Flujo de caja" },
      ],
      "Análisis": [
        { label: "Dashboard", icon: BarChart3, path: "/finances-new?tab=dashboard", description: "Métricas financieras" },
        { label: "Rentabilidad", icon: TrendingUp, path: "/finances-new?tab=profitability", description: "Análisis de rentabilidad" },
      ],
      "Configuración": [
        { label: "Cuentas", icon: Settings, path: "/finances-new?tab=accounts", description: "Plan de cuentas" },
        { label: "Facturación", icon: FileText, path: "/finances-new?tab=invoicing", description: "Gestión de facturas" },
      ]
    }
  },
  design: {
    title: "Módulo de Diseño",
    description: "Gestión del proceso de diseño",
    categories: {
      "Proyectos": [
        { label: "En Proceso", icon: Palette, path: "/design", description: "Diseños en desarrollo" },
        { label: "Completados", icon: Eye, path: "/design?tab=completed", description: "Diseños terminados" },
      ],
      "Gestión": [
        { label: "Timeline", icon: Clock, path: "/design?tab=timeline", description: "Cronograma de diseño" },
        { label: "Documentos", icon: FolderOpen, path: "/design?tab=documents", description: "Archivos de diseño" },
      ],
      "Herramientas": [
        { label: "Calendario", icon: Calendar, path: "/design?tab=calendar", description: "Programación de diseño" },
        { label: "Recursos", icon: Settings, path: "/design?tab=resources", description: "Materiales y referencias" },
      ]
    }
  }
};

const getCurrentModule = (pathname: string): string => {
  if (pathname === "/" || pathname === "/dashboard") return "dashboard";
  if (pathname.startsWith("/sales")) return "sales";
  if (pathname.startsWith("/clients")) return "clients";
  if (pathname.startsWith("/construction")) return "construction";
  if (pathname.startsWith("/finances") || pathname.startsWith("/accounting")) return "finances";
  if (pathname.startsWith("/design")) return "design";
  return "dashboard";
};

export function MobileModuleNavigation() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  
  if (!isMobile) return null;

  const currentModule = getCurrentModule(location.pathname);
  const config = moduleConfigs[currentModule];

  if (!config) return null;

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
            className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 border-2 border-background"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent 
          side="bottom" 
          className="h-[85vh] rounded-t-3xl border-t-2 border-border/20 bg-background/95 backdrop-blur-sm"
        >
          <SheetHeader className="pb-4">
            <SheetTitle className="text-lg font-semibold text-foreground">
              {config.title}
            </SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              {config.description}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto space-y-6 pb-6">
            {Object.entries(config.categories).map(([categoryName, actions]) => (
              <div key={categoryName} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-foreground/80 uppercase tracking-wide">
                    {categoryName}
                  </h3>
                  <div className="flex-1 h-px bg-border/30" />
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  {actions.map((action) => (
                    <Button
                      key={action.path}
                      variant="ghost"
                      onClick={() => handleNavigation(action.path)}
                      className="justify-start h-auto p-4 bg-card/50 hover:bg-card/80 border border-border/20 rounded-xl transition-all duration-200"
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <action.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">
                              {action.label}
                            </span>
                            {action.badge && (
                              <Badge variant="secondary" className="text-xs">
                                {action.badge}
                              </Badge>
                            )}
                          </div>
                          {action.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {action.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}