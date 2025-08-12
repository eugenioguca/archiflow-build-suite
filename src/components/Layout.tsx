import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ClientRedirect } from "@/components/ClientRedirect";
import { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileModuleNavigation } from "@/components/mobile/MobileModuleNavigation";
import { MobileBreadcrumb } from "@/components/mobile/MobileBreadcrumb";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: ReactNode;
}

// Enhanced mobile sidebar trigger component
function MobileSidebarTrigger() {
  const { open, toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();

  if (!isMobile) {
    return <SidebarTrigger />;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleSidebar}
      className="h-10 w-10 p-0 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring transition-all duration-200"
      aria-label={open ? "Cerrar menú" : "Abrir menú"}
    >
      {open ? (
        <X className="h-5 w-5 text-foreground" />
      ) : (
        <Menu className="h-5 w-5 text-foreground" />
      )}
    </Button>
  );
}

export default function Layout({ children }: LayoutProps) {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <ClientRedirect />
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className={`${isMobile ? 'h-12' : 'h-14'} flex items-center justify-between border-b bg-background ${isMobile ? 'px-3' : 'px-6'}`}>
            <MobileSidebarTrigger />
            {isMobile && (
              <div className="text-sm font-medium text-muted-foreground">
                ArchiFlow
              </div>
            )}
          </header>
          
          <MobileBreadcrumb />
          
          <main className={`flex-1 ${isMobile ? 'p-2 sm:p-4' : 'p-6'} bg-background`}>
            {children}
          </main>
        </div>
      </div>
      
      <MobileModuleNavigation />
    </SidebarProvider>
  );
}