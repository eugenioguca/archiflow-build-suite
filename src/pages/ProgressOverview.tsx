import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, User } from "lucide-react";

interface ProjectOverview {
  id: string;
  name: string;
  description: string;
  location?: string;
  progress_percentage: number;
  status: 'planning' | 'construction' | 'design' | 'permits' | 'completed' | 'cancelled';
  assigned_team: {
    name: string;
    initials: string;
  }[];
  phases: {
    name: string;
    value: number;
    color: string;
    status: 'not_started' | 'planning' | 'in_progress' | 'on_hold' | 'completed';
  }[];
  estimated_dates: {
    phase: string;
    date: string;
  }[];
}

const phaseConfig = {
  not_started: { label: "No ha empezado", color: "bg-gray-100", textColor: "text-gray-600", value: 0 },
  planning: { label: "En planeación", color: "bg-blue-100", textColor: "text-blue-600", value: 1 },
  in_progress: { label: "En progreso", color: "bg-yellow-100", textColor: "text-yellow-600", value: 5 },
  on_hold: { label: "Detenido", color: "bg-red-100", textColor: "text-red-600", value: 5 },
  completed: { label: "Hecho", color: "bg-green-100", textColor: "text-green-600", value: 10 },
};

export default function ProgressOverview() {
  const [activeProjects, setActiveProjects] = useState<ProjectOverview[]>([]);
  const [completedProjects, setCompletedProjects] = useState<ProjectOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data: projects, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          description,
          progress_percentage,
          status,
          clients (
            full_name,
            address
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Mock data para demostración
      const mockProjects: ProjectOverview[] = (projects || []).map(project => ({
        id: project.id,
        name: project.name,
        description: project.description || '',
        location: project.clients?.address || 'Sin dirección',
        progress_percentage: project.progress_percentage || 0,
        status: project.status,
        assigned_team: [
          { name: "Juan Pérez", initials: "JP" },
          { name: "María García", initials: "MG" }
        ],
        phases: [
          { name: "Diseño", value: 1, color: "bg-blue-500", status: 'completed' },
          { name: "Construcción", value: 5, color: "bg-yellow-500", status: 'in_progress' },
          { name: "Acabados", value: 3, color: "bg-gray-300", status: 'not_started' },
          { name: "Entrega", value: 1, color: "bg-gray-300", status: 'not_started' }
        ],
        estimated_dates: [
          { phase: "Diseño", date: "2024-02-15" },
          { phase: "Construcción", date: "2024-06-30" },
          { phase: "Acabados", date: "2024-08-15" },
          { phase: "Entrega", date: "2024-09-01" }
        ]
      }));

      // Separar proyectos activos y completados
      const active = mockProjects.filter(p => p.status !== 'completed');
      const completed = mockProjects.filter(p => p.status === 'completed');

      setActiveProjects(active);
      setCompletedProjects(completed);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los proyectos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = phaseConfig[status as keyof typeof phaseConfig];
    if (!config) return null;
    
    return (
      <Badge variant="outline" className={`${config.color} ${config.textColor} border-none`}>
        {config.label}
      </Badge>
    );
  };

  const calculateTotalProgress = (phases: ProjectOverview['phases']) => {
    const totalValue = phases.reduce((sum, phase) => sum + phase.value, 0);
    const completedValue = phases
      .filter(p => p.status === 'completed')
      .reduce((sum, phase) => sum + phase.value, 0);
    
    return totalValue > 0 ? Math.round((completedValue / totalValue) * 100) : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground">Avances de Proyectos</h1>
      </div>

      {/* Proyectos Activos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-foreground">Proyectos Activos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeProjects.map((project) => (
              <Card key={project.id} className="border border-border">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-center">
                    {/* Nombre del Proyecto */}
                    <div className="lg:col-span-1">
                      <h3 className="font-semibold text-foreground">{project.name}</h3>
                      <p className="text-sm text-muted-foreground">{project.description}</p>
                    </div>

                    {/* Ubicación */}
                    <div className="lg:col-span-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">{project.location}</span>
                      </div>
                    </div>

                    {/* Equipo Asignado */}
                    <div className="lg:col-span-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div className="flex -space-x-2">
                          {project.assigned_team.map((member, index) => (
                            <Avatar key={index} className="h-8 w-8 border-2 border-background">
                              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                {member.initials}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Progreso General */}
                    <div className="lg:col-span-1">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-foreground">Progreso</span>
                          <span className="text-sm font-medium text-foreground">
                            {calculateTotalProgress(project.phases)}%
                          </span>
                        </div>
                        <Progress value={calculateTotalProgress(project.phases)} className="h-2" />
                      </div>
                    </div>

                    {/* Fases del Proyecto */}
                    <div className="lg:col-span-2">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-foreground">Fases del Proyecto</h4>
                        <div className="flex gap-2 flex-wrap">
                          {project.phases.map((phase, index) => (
                            <div key={index} className="flex items-center gap-1">
                              {getStatusBadge(phase.status)}
                              <span className="text-xs text-muted-foreground">{phase.name}</span>
                            </div>
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Próxima fecha: {project.estimated_dates.find(d => d.phase === "Construcción")?.date}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Proyectos Completados */}
      {completedProjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-foreground">Proyectos Completados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {completedProjects.map((project) => (
                <Card key={project.id} className="border border-border bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-foreground">{project.name}</h3>
                        <p className="text-sm text-muted-foreground">{project.location}</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        ✓ Completado
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}