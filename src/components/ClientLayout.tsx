import React, { ReactNode } from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LogOut, Building2, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";

interface ClientProject {
  id: string;
  project_name: string;
  status: string;
  overall_progress_percentage?: number | null;
}

interface ClientLayoutProps {
  children: ReactNode;
  clientName?: string;
  projects: ClientProject[];
  selectedProjectId?: string;
  onProjectChange: (projectId: string) => void;
}

export default function ClientLayout({ 
  children, 
  clientName, 
  projects, 
  selectedProjectId, 
  onProjectChange 
}: ClientLayoutProps) {
  const { signOut } = useAuth();
  const isMobile = useIsMobile();

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      planning: { label: 'Planeación', variant: 'secondary' as const },
      design: { label: 'Diseño', variant: 'default' as const },
      construction: { label: 'Construcción', variant: 'default' as const },
      completed: { label: 'Completado', variant: 'default' as const },
      paused: { label: 'Pausado', variant: 'destructive' as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      variant: 'outline' as const
    };

    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className={`border-b bg-card/50 backdrop-blur ${isMobile ? 'px-4 py-3' : 'px-6 py-4'}`}>
        <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center justify-between'}`}>
          <div className={`flex items-center gap-3 ${isMobile ? 'justify-between' : ''}`}>
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              <div>
                <h1 className={`font-bold text-foreground ${isMobile ? 'text-lg' : 'text-xl'}`}>
                  Portal del Cliente
                </h1>
                {clientName && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <User className="h-3 w-3" />
                    {clientName}
                  </div>
                )}
              </div>
            </div>
            
            {/* Logout button for mobile */}
            {isMobile && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={signOut}
                className="h-8 w-8 p-0"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className={`flex items-center gap-4 ${isMobile ? 'flex-col gap-3' : ''}`}>
            {/* Project Selector */}
            {projects.length > 0 && (
              <div className={`flex items-center gap-3 ${isMobile ? 'w-full' : ''}`}>
                <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                  Proyecto:
                </label>
                <Select 
                  value={selectedProjectId} 
                  onValueChange={onProjectChange}
                >
                  <SelectTrigger className={`${isMobile ? 'flex-1' : 'w-[280px]'} bg-background`}>
                    <SelectValue placeholder="Seleccionar proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {project.project_name}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {getStatusBadge(project.status)}
                              {project.overall_progress_percentage !== null && (
                                <span className="text-xs text-muted-foreground">
                                  {project.overall_progress_percentage}% completado
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Logout button for desktop */}
            {!isMobile && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={signOut}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Cerrar Sesión
              </Button>
            )}
          </div>
        </div>

        {/* Project info bar */}
        {selectedProject && (
          <div className={`mt-3 p-3 bg-muted/50 rounded-lg ${isMobile ? 'text-sm' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-medium text-foreground">
                  {selectedProject.project_name}
                </span>
                {getStatusBadge(selectedProject.status)}
              </div>
              {selectedProject.overall_progress_percentage !== null && (
                <div className="text-sm text-muted-foreground">
                  Progreso: {selectedProject.overall_progress_percentage}%
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className={`${isMobile ? 'p-2' : 'p-6'}`}>
        {children}
      </main>
    </div>
  );
}