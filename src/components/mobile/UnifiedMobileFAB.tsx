import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
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
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Palette,
  ChevronLeft,
  ChevronRight,
  Navigation
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

// Main modules (Level 1)
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

// Submenu configs (Level 2)
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

type NavigationLevel = 'modules' | 'submenu';

const getCurrentModule = (pathname: string): string => {
  if (pathname === "/" || pathname === "/dashboard") return "dashboard";
  if (pathname.startsWith("/sales")) return "sales";
  if (pathname.startsWith("/clients")) return "clients";
  if (pathname.startsWith("/construction")) return "construction";
  if (pathname.startsWith("/finances") || pathname.startsWith("/accounting")) return "finances";
  if (pathname.startsWith("/design")) return "design";
  return "dashboard";
};

export function UnifiedMobileFAB() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [navigationLevel, setNavigationLevel] = useState<NavigationLevel>('modules');
  const [currentModule, setCurrentModule] = useState<string>('');
  const { user } = useAuth();
  const { hasModuleAccess } = usePermissions();
  const { triggerImpact, triggerSelection } = useHapticFeedback();
  
  // Touch gesture handling
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  
  useEffect(() => {
    if (isOpen) {
      const detectedModule = getCurrentModule(location.pathname);
      setCurrentModule(detectedModule);
      
      // Auto-navigate to submenu if we're already in a specific module
      if (detectedModule !== 'dashboard' && moduleConfigs[detectedModule]) {
        setNavigationLevel('submenu');
      } else {
        setNavigationLevel('modules');
      }
    }
  }, [isOpen, location.pathname]);

  if (!isMobile) return null;

  // Determine which items to show based on user role
  const isClient = user?.user_metadata?.role === 'client';
  const menuItems = isClient ? clientItems : allMenuItems.filter(item => {
    if (item.module === 'client_portal_preview') return false; // Hide preview for regular users
    return hasModuleAccess(item.module);
  });

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setSwipeDirection(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartX.current;
    const deltaY = currentY - touchStartY.current;
    
    // Calculate which direction is more prominent
    const isHorizontalGesture = Math.abs(deltaX) > Math.abs(deltaY);
    const isVerticalGesture = Math.abs(deltaY) > Math.abs(deltaX);
    
    // Only handle horizontal swipes for navigation, let vertical scroll naturally
    if (isHorizontalGesture && Math.abs(deltaX) > 50 && Math.abs(deltaY) < 100) {
      // Prevent default to handle horizontal navigation
      e.preventDefault();
      
      const direction = deltaX > 0 ? 'right' : 'left';
      setSwipeDirection(direction);
      
      // Add visual feedback during swipe
      if (containerRef.current) {
        const translateX = Math.max(-20, Math.min(20, deltaX * 0.1));
        containerRef.current.style.transform = `translateX(${translateX}px)`;
      }
    }
    // For vertical gestures, don't prevent default - allow native scrolling
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    
    // Reset visual feedback
    containerRef.current.style.transform = 'translateX(0px)';
    
    const currentX = e.changedTouches[0].clientX;
    const currentY = e.changedTouches[0].clientY;
    const deltaX = currentX - touchStartX.current;
    const deltaY = currentY - touchStartY.current;
    
    // Only trigger navigation for horizontal swipes
    const isHorizontalGesture = Math.abs(deltaX) > Math.abs(deltaY);
    
    if (isHorizontalGesture && Math.abs(deltaX) > 80) {
      if (deltaX > 0) {
        // Swipe right - go back to modules
        handleSwipeRight();
      } else {
        // Swipe left - go to submenu
        handleSwipeLeft();
      }
    }
    
    setSwipeDirection(null);
  };

  const handleSwipeLeft = () => {
    if (navigationLevel === 'modules') {
      const detectedModule = getCurrentModule(location.pathname);
      if (moduleConfigs[detectedModule]) {
        triggerSelection();
        setCurrentModule(detectedModule);
        setNavigationLevel('submenu');
      }
    }
  };

  const handleSwipeRight = () => {
    if (navigationLevel === 'submenu') {
      triggerSelection();
      setNavigationLevel('modules');
    }
  };

  const handleNavigation = (path: string) => {
    triggerImpact('light');
    navigate(path);
    setIsOpen(false);
  };

  const renderModulesView = () => (
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
  );

  const renderSubmenuView = () => {
    const config = moduleConfigs[currentModule];
    if (!config) return null;

    return (
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
    );
  };

  const getHeaderInfo = () => {
    if (navigationLevel === 'modules') {
      return {
        title: "Módulos Disponibles",
        description: "Selecciona el módulo al que deseas acceder"
      };
    } else {
      const config = moduleConfigs[currentModule];
      return {
        title: config?.title || "Navegación",
        description: config?.description || "Opciones disponibles"
      };
    }
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="fixed bottom-4 right-4 z-50 md:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button 
            size="lg" 
            className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 border-2 border-background"
          >
            <Navigation className="h-6 w-6 text-primary-foreground" />
          </Button>
        </SheetTrigger>
        <SheetContent 
          side="bottom" 
          className="h-[85vh] rounded-t-3xl border-t-2 border-border/20 bg-background/95 backdrop-blur-sm"
        >
          <SheetHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <SheetTitle className="text-lg font-semibold text-foreground text-left">
                  {headerInfo.title}
                </SheetTitle>
                <SheetDescription className="text-sm text-muted-foreground text-left">
                  {headerInfo.description}
                </SheetDescription>
              </div>
              <div className="flex items-center gap-2">
                {navigationLevel === 'submenu' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSwipeRight}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
                {navigationLevel === 'modules' && currentModule && moduleConfigs[currentModule] && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSwipeLeft}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            {/* Navigation indicator */}
            <div className="flex items-center justify-center gap-2 pt-2">
              <div className={`w-2 h-2 rounded-full transition-all duration-200 ${
                navigationLevel === 'modules' ? 'bg-primary' : 'bg-muted'
              }`} />
              <div className={`w-2 h-2 rounded-full transition-all duration-200 ${
                navigationLevel === 'submenu' ? 'bg-primary' : 'bg-muted'
              }`} />
            </div>
            
            {/* Swipe hint */}
            <p className="text-xs text-muted-foreground text-center pt-1">
              {navigationLevel === 'modules' 
                ? "Desliza ← para submenús • ↕ Scroll vertical • Toca un módulo para navegar"
                : "Desliza → para volver a módulos • ↕ Scroll vertical"
              }
            </p>
          </SheetHeader>

          <ScrollArea className="h-[calc(85vh-140px)]">
            <div 
              ref={containerRef}
              className="transition-transform duration-200 px-1"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {navigationLevel === 'modules' ? renderModulesView() : renderSubmenuView()}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}