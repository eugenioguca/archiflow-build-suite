import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Eye, ArrowRight, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CompletedProject {
  id: string;
  project_name: string;
  status: string;
  moved_to_construction_at: string | null;
  created_at: string;
  client: {
    full_name: string;
  };
}

export function CompletedDesignsTab() {
  const [completedProjects, setCompletedProjects] = useState<CompletedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCompletedProjects();
  }, []);

  const fetchCompletedProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('client_projects')
        .select(`
          id,
          project_name,
          status,
          moved_to_construction_at,
          created_at,
          client:clients(full_name)
        `)
        .in('status', ['design_completed', 'design_only_completed', 'budget_accepted', 'construction', 'completed'])
        .order('moved_to_construction_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      setCompletedProjects((data as any) || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los diseños completados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'design_completed':
        return { 
          label: 'Diseño Completado', 
          variant: 'default' as const,
          description: 'Diseño terminado, listo para construcción'
        };
      case 'design_only_completed':
        return { 
          label: 'Solo Diseño', 
          variant: 'secondary' as const,
          description: 'Proyecto completado únicamente con diseño'
        };
      case 'budget_accepted':
        return { 
          label: 'Presupuesto Aceptado', 
          variant: 'destructive' as const,
          description: 'Presupuesto aceptado, pasó a construcción'
        };
      case 'construction':
        return { 
          label: 'En Construcción', 
          variant: 'outline' as const,
          description: 'Actualmente en construcción'
        };
      case 'completed':
        return { 
          label: 'Completado', 
          variant: 'default' as const,
          description: 'Proyecto completamente terminado'
        };
      default:
        return { 
          label: status, 
          variant: 'secondary' as const,
          description: 'Estado desconocido'
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (completedProjects.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay diseños completados</h3>
          <p className="text-muted-foreground">
            Los proyectos completados aparecerán aquí
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {completedProjects.map((project) => {
        const statusInfo = getStatusInfo(project.status);
        
        return (
          <Card key={project.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg">{project.project_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Cliente: {project.client?.full_name}
                  </p>
                </div>
                <Badge variant={statusInfo.variant} className="text-xs">
                  {statusInfo.label}
                </Badge>
              </div>
              
              <div className="space-y-2 mb-4">
                <p className="text-sm text-muted-foreground">
                  {statusInfo.description}
                </p>
                {project.moved_to_construction_at && (
                  <p className="text-xs text-muted-foreground">
                    Pasó a construcción: {new Date(project.moved_to_construction_at).toLocaleDateString('es-MX')}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => window.location.href = `/design?projectId=${project.id}`}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Ver Diseño
                </Button>
                {(project.status === 'construction' || project.status === 'budget_accepted') && (
                  <Button 
                    size="sm" 
                    onClick={() => window.location.href = `/construction`}
                    className="flex-1"
                  >
                    <ArrowRight className="h-4 w-4 mr-1" />
                    Construcción
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}