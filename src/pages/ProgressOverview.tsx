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
      // Cargar desde localStorage para persistencia local
      const savedProjects = localStorage.getItem('projectsOverview');
      if (savedProjects) {
        const allProjects: ProjectOverview[] = JSON.parse(savedProjects);
        setActiveProjects(allProjects.filter(p => p.status !== 'completed'));
        setCompletedProjects(allProjects.filter(p => p.status === 'completed'));
      } else {
        // Datos iniciales si no hay datos guardados
        const initialProjects: ProjectOverview[] = [
          {
            id: "1",
            name: "Casa Moderna Satelite",
            description: "Construcción de casa residencial 200m²",
            location: "Av. Constituyentes 123, Naucalpan, Estado de México",
            progress_percentage: 60,
            status: 'construction',
            assigned_team: [
              { name: "Juan Pérez", initials: "JP" },
              { name: "María García", initials: "MG" },
              { name: "Carlos López", initials: "CL" }
            ],
            phases: [
              { name: "Diseño", value: 10, color: "bg-blue-500", status: 'completed' },
              { name: "Permisos", value: 5, color: "bg-yellow-500", status: 'completed' },
              { name: "Cimientos", value: 15, color: "bg-green-500", status: 'completed' },
              { name: "Estructura", value: 20, color: "bg-yellow-500", status: 'in_progress' },
              { name: "Instalaciones", value: 15, color: "bg-gray-300", status: 'not_started' },
              { name: "Acabados", value: 25, color: "bg-gray-300", status: 'not_started' },
              { name: "Entrega", value: 10, color: "bg-gray-300", status: 'not_started' }
            ],
            estimated_dates: [
              { phase: "Diseño", date: "2024-01-15" },
              { phase: "Permisos", date: "2024-02-01" },
              { phase: "Cimientos", date: "2024-03-15" },
              { phase: "Estructura", date: "2024-05-30" },
              { phase: "Instalaciones", date: "2024-07-15" },
              { phase: "Acabados", date: "2024-09-30" },
              { phase: "Entrega", date: "2024-10-15" }
            ]
          },
          {
            id: "2",
            name: "Oficinas Corporativas",
            description: "Remodelación de oficinas 500m²",
            location: "Polanco, CDMX",
            progress_percentage: 25,
            status: 'design',
            assigned_team: [
              { name: "Ana Martínez", initials: "AM" },
              { name: "Roberto Silva", initials: "RS" }
            ],
            phases: [
              { name: "Diseño", value: 15, color: "bg-yellow-500", status: 'in_progress' },
              { name: "Permisos", value: 5, color: "bg-gray-300", status: 'not_started' },
              { name: "Demolición", value: 10, color: "bg-gray-300", status: 'not_started' },
              { name: "Construcción", value: 40, color: "bg-gray-300", status: 'not_started' },
              { name: "Instalaciones", value: 20, color: "bg-gray-300", status: 'not_started' },
              { name: "Acabados", value: 10, color: "bg-gray-300", status: 'not_started' }
            ],
            estimated_dates: [
              { phase: "Diseño", date: "2024-02-28" },
              { phase: "Permisos", date: "2024-03-15" },
              { phase: "Demolición", date: "2024-04-01" },
              { phase: "Construcción", date: "2024-07-15" },
              { phase: "Instalaciones", date: "2024-08-30" },
              { phase: "Acabados", date: "2024-09-30" }
            ]
          }
        ];
        
        setActiveProjects(initialProjects.filter(p => p.status !== 'completed'));
        setCompletedProjects(initialProjects.filter(p => p.status === 'completed'));
        localStorage.setItem('projectsOverview', JSON.stringify(initialProjects));
      }
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

  const updatePhaseStatus = (projectId: string, phaseIndex: number, newStatus: ProjectOverview['phases'][0]['status']) => {
    const allProjects = [...activeProjects, ...completedProjects];
    const updatedProjects = allProjects.map(project => {
      if (project.id === projectId) {
        const updatedPhases = [...project.phases];
        updatedPhases[phaseIndex] = { ...updatedPhases[phaseIndex], status: newStatus };
        
        const newProgress = calculateTotalProgress(updatedPhases);
        const newProjectStatus = newProgress === 100 ? 'completed' : project.status;
        
        return { ...project, phases: updatedPhases, progress_percentage: newProgress, status: newProjectStatus };
      }
      return project;
    });

    // Actualizar estado y localStorage
    setActiveProjects(updatedProjects.filter(p => p.status !== 'completed'));
    setCompletedProjects(updatedProjects.filter(p => p.status === 'completed'));
    localStorage.setItem('projectsOverview', JSON.stringify(updatedProjects));
    
    toast({
      title: "Fase actualizada",
      description: "El progreso del proyecto se ha actualizado",
    });
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
                        <div className="grid grid-cols-2 gap-2">
                          {project.phases.map((phase, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <select
                                value={phase.status}
                                onChange={(e) => updatePhaseStatus(project.id, index, e.target.value as ProjectOverview['phases'][0]['status'])}
                                className="text-xs px-2 py-1 border border-border rounded bg-background text-foreground"
                              >
                                {Object.entries(phaseConfig).map(([key, config]) => (
                                  <option key={key} value={key}>{config.label}</option>
                                ))}
                              </select>
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