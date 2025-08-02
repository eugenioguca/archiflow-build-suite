import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ClientRedirect } from "@/components/ClientRedirect";
import { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <ClientRedirect />
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className={`${isMobile ? 'h-12' : 'h-14'} flex items-center border-b bg-background ${isMobile ? 'px-3' : 'px-6'}`}>
            <SidebarTrigger />
          </header>
          
          <main className={`flex-1 ${isMobile ? 'p-2 sm:p-4' : 'p-6'} bg-background`}>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}