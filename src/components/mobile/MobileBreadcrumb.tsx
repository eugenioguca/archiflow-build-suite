import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  path: string;
  isActive?: boolean;
}

const getBreadcrumbItems = (pathname: string, searchParams: URLSearchParams): BreadcrumbItem[] => {
  const items: BreadcrumbItem[] = [
    { label: "Inicio", path: "/" }
  ];

  if (pathname === "/" || pathname === "/dashboard") {
    items[0].isActive = true;
    return items;
  }

  if (pathname.startsWith("/sales")) {
    items.push({ label: "Ventas", path: "/sales" });
    const tab = searchParams.get("tab");
    if (tab === "crm") items.push({ label: "CRM", path: "/sales?tab=crm", isActive: true });
    else if (tab === "analytics") items.push({ label: "Análisis", path: "/sales?tab=analytics", isActive: true });
    else items[items.length - 1].isActive = true;
  }

  if (pathname.startsWith("/clients")) {
    items.push({ label: "Clientes", path: "/clients" });
    const tab = searchParams.get("tab");
    if (tab === "search") items.push({ label: "Búsqueda", path: "/clients?tab=search", isActive: true });
    else if (tab === "documents") items.push({ label: "Documentos", path: "/clients?tab=documents", isActive: true });
    else items[items.length - 1].isActive = true;
  }

  if (pathname.startsWith("/construction")) {
    items.push({ label: "Construcción", path: "/construction" });
    const tab = searchParams.get("tab");
    if (tab === "projects") items.push({ label: "Proyectos", path: "/construction?tab=projects", isActive: true });
    else if (tab === "schedule") items.push({ label: "Cronograma", path: "/construction?tab=schedule", isActive: true });
    else items[items.length - 1].isActive = true;
  }

  if (pathname.startsWith("/finances") || pathname.startsWith("/accounting")) {
    items.push({ label: "Finanzas", path: "/finances-new" });
    const tab = searchParams.get("tab");
    if (tab === "treasury") items.push({ label: "Tesorería", path: "/finances-new?tab=treasury", isActive: true });
    else if (tab === "dashboard") items.push({ label: "Dashboard", path: "/finances-new?tab=dashboard", isActive: true });
    else items[items.length - 1].isActive = true;
  }

  if (pathname.startsWith("/design")) {
    items.push({ label: "Diseño", path: "/design" });
    const tab = searchParams.get("tab");
    if (tab === "completed") items.push({ label: "Completados", path: "/design?tab=completed", isActive: true });
    else if (tab === "timeline") items.push({ label: "Timeline", path: "/design?tab=timeline", isActive: true });
    else items[items.length - 1].isActive = true;
  }

  return items;
};

export function MobileBreadcrumb() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  
  if (!isMobile) return null;

  const searchParams = new URLSearchParams(location.search);
  const items = getBreadcrumbItems(location.pathname, searchParams);
  const currentItem = items[items.length - 1];
  const canGoBack = items.length > 1;

  const handleBack = () => {
    if (canGoBack) {
      const previousItem = items[items.length - 2];
      navigate(previousItem.path);
    }
  };

  const handleHome = () => {
    navigate("/");
  };

  return (
    <div className="bg-background/95 backdrop-blur-sm border-b border-border/20 px-4 py-2 md:hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {canGoBack ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="p-2 h-auto rounded-lg"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleHome}
              className="p-2 h-auto rounded-lg"
            >
              <Home className="h-4 w-4" />
            </Button>
          )}

          <div className="flex items-center gap-1 flex-1 min-w-0">
            {items.map((item, index) => (
              <React.Fragment key={item.path}>
                {index > 0 && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(item.path)}
                  className={`text-sm px-2 py-1 h-auto rounded-md truncate ${
                    item.isActive 
                      ? "text-foreground font-medium" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  disabled={item.isActive}
                >
                  {item.label}
                </Button>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}