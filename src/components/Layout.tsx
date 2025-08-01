import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { CRMNotifications } from "@/components/CRMNotifications";
import { SmartReminders } from "@/components/SmartReminders";
import { ClientRedirect } from "@/components/ClientRedirect";
import { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <ClientRedirect />
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b bg-background px-6">
            <SidebarTrigger />
          </header>
          
          <main className="flex-1 p-6 bg-background">
            {children}
            <CRMNotifications />
            <SmartReminders />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}