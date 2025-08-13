import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ClientRedirect } from "@/components/ClientRedirect";
import { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { UnifiedMobileFAB } from "@/components/mobile/UnifiedMobileFAB";
import { MobileBreadcrumb } from "@/components/mobile/MobileBreadcrumb";
import { MobileEyeToggle } from "@/components/mobile/MobileEyeToggle";
import { useMobileSidebar } from "@/hooks/useMobileSidebar";
import { ChatNotificationBell } from "@/components/notifications/ChatNotificationBell";
import { ChatNotificationManager } from "@/components/notifications/ChatNotificationManager";
import { ChatNotificationSound } from "@/components/ChatNotificationSound";
import { UserAvatar } from "@/components/UserAvatar";
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
  const mobileSidebar = useMobileSidebar();

  return (
    <SidebarProvider>
      <ClientRedirect />
      <div className="min-h-screen flex w-full">
        {/* Desktop Sidebar */}
        {!isMobile && <AppSidebar />}
        
        {/* Mobile Sidebar with Overlay */}
        {isMobile && (
          <>
            {/* Overlay */}
            {mobileSidebar.isOpen && (
              <div 
                className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
                onClick={mobileSidebar.close}
              />
            )}
            
            {/* Mobile Sidebar */}
            <div 
              className={`fixed top-0 left-0 h-full w-64 z-50 transform transition-transform duration-300 ease-out ${
                mobileSidebar.isOpen ? 'translate-x-0' : '-translate-x-full'
              }`}
            >
              <AppSidebar />
            </div>
          </>
        )}
        
        <div className="flex-1 flex flex-col">
          <header className={`${isMobile ? 'h-12' : 'h-14'} flex items-center justify-between border-b bg-background ${isMobile ? 'px-3' : 'px-6'}`}>
            <div className="flex items-center gap-4">
              {!isMobile && <MobileSidebarTrigger />}
              {isMobile && (
                <div className="text-sm font-medium text-muted-foreground ml-12">
                  ArchiFlow
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <ChatNotificationBell />
              <UserAvatar user={{ full_name: "Usuario" }} />
            </div>
          </header>
          
          <MobileBreadcrumb />
          
          <main className={`flex-1 ${isMobile ? 'p-2 sm:p-4' : 'p-6'} bg-background`}>
            {children}
          </main>
        </div>
      </div>
      
      {/* Eye Toggle Button for Mobile */}
      <MobileEyeToggle 
        isOpen={mobileSidebar.isOpen}
        onToggle={mobileSidebar.toggle}
      />
      
      <UnifiedMobileFAB />
      
      {/* Chat Notification System */}
      <ChatNotificationManager />
      <ChatNotificationSound enabled={true} soundType="professional" volume={0.6} />
    </SidebarProvider>
  );
}