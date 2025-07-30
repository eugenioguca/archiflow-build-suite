import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPin, User, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/DatePicker";
import { EditableCell } from "@/components/EditableCell";
import { UserAvatar } from "@/components/UserAvatar";

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
    avatar_url?: string | null;
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
              { name: "Juan Pérez", initials: "JP", avatar_url: null },
              { name: "María García", initials: "MG", avatar_url: null },
              { name: "Carlos López", initials: "CL", avatar_url: null }
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
              { name: "Ana Martínez", initials: "AM", avatar_url: null },
              { name: "Roberto Silva", initials: "RS", avatar_url: null }
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

  const addNewProject = () => {
    const newProject: ProjectOverview = {
      id: Date.now().toString(),
      name: "Nuevo Proyecto",
      description: "Descripción del proyecto",
      location: "Ciudad, Estado",
      progress_percentage: 0,
      status: 'planning',
      assigned_team: [
        { name: "Nuevo Encargado", initials: "NE", avatar_url: null }
      ],
      phases: [
        { name: "Diseño", value: 10, color: "bg-blue-500", status: 'not_started' },
        { name: "Permisos", value: 5, color: "bg-gray-300", status: 'not_started' },
        { name: "Construcción", value: 60, color: "bg-gray-300", status: 'not_started' },
        { name: "Acabados", value: 20, color: "bg-gray-300", status: 'not_started' },
        { name: "Entrega", value: 5, color: "bg-gray-300", status: 'not_started' }
      ],
      estimated_dates: [
        { phase: "Diseño", date: new Date(Date.now() + 30*86400000).toISOString().split('T')[0] },
        { phase: "Permisos", date: new Date(Date.now() + 60*86400000).toISOString().split('T')[0] },
        { phase: "Construcción", date: new Date(Date.now() + 180*86400000).toISOString().split('T')[0] },
        { phase: "Acabados", date: new Date(Date.now() + 240*86400000).toISOString().split('T')[0] },
        { phase: "Entrega", date: new Date(Date.now() + 270*86400000).toISOString().split('T')[0] }
      ]
    };

    const allProjects = [...activeProjects, ...completedProjects, newProject];
    setActiveProjects(allProjects.filter(p => p.status !== 'completed'));
    localStorage.setItem('projectsOverview', JSON.stringify(allProjects));
    
    toast({
      title: "Nuevo proyecto agregado",
      description: "Puedes editar la información haciendo clic en los campos",
    });
  };

  const updateProject = (projectId: string, updates: Partial<ProjectOverview>) => {
    const allProjects = [...activeProjects, ...completedProjects];
    const updatedProjects = allProjects.map(project => 
      project.id === projectId ? { ...project, ...updates } : project
    );

    setActiveProjects(updatedProjects.filter(p => p.status !== 'completed'));
    setCompletedProjects(updatedProjects.filter(p => p.status === 'completed'));
    localStorage.setItem('projectsOverview', JSON.stringify(updatedProjects));
    
    toast({
      title: "Proyecto actualizado",
      description: "Los cambios se han guardado correctamente",
    });
  };

  const updateEstimatedDate = (projectId: string, phaseIndex: number, newDate: Date) => {
    const allProjects = [...activeProjects, ...completedProjects];
    const project = allProjects.find(p => p.id === projectId);
    if (!project) return;

    const updatedDates = [...project.estimated_dates];
    updatedDates[phaseIndex] = { 
      ...updatedDates[phaseIndex], 
      date: newDate.toISOString().split('T')[0] 
    };
    
    updateProject(projectId, { estimated_dates: updatedDates });
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
        <Button onClick={addNewProject}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Proyecto
        </Button>
      </div>

      {/* Proyectos Activos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-foreground">Proyectos Activos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Equipo</TableHead>
                  <TableHead>Progreso</TableHead>
                  <TableHead>Fases del Proyecto</TableHead>
                  <TableHead>Fechas Estimadas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeProjects.map((project) => (
                  <TableRow key={project.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="space-y-1">
                        <EditableCell 
                          value={project.name} 
                          onSave={(value) => updateProject(project.id, { name: value })}
                          className="font-semibold text-foreground"
                        />
                        <EditableCell 
                          value={project.description} 
                          onSave={(value) => updateProject(project.id, { description: value })}
                          className="text-sm text-muted-foreground"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <EditableCell 
                          value={project.location || ""} 
                          onSave={(value) => updateProject(project.id, { location: value })}
                          className="text-sm text-foreground"
                        />
                      </div>
                    </TableCell>
                     <TableCell>
                       <div className="flex items-center gap-2">
                         <User className="h-4 w-4 text-muted-foreground" />
                         <div className="flex -space-x-2">
                           {project.assigned_team.map((member, index) => (
                             <UserAvatar 
                               key={index}
                               user={{ 
                                 full_name: member.name, 
                                 avatar_url: member.avatar_url 
                               }}
                               size="sm"
                               showTooltip={true}
                               className="border-2 border-background"
                             />
                           ))}
                         </div>
                       </div>
                     </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-foreground">Progreso</span>
                          <span className="text-sm font-medium text-foreground">
                            {calculateTotalProgress(project.phases)}%
                          </span>
                        </div>
                        <Progress value={calculateTotalProgress(project.phases)} className="h-2" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2 min-w-[300px]">
                        {project.phases.map((phase, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <select
                              value={phase.status}
                              onChange={(e) => updatePhaseStatus(project.id, index, e.target.value as ProjectOverview['phases'][0]['status'])}
                              className="text-xs px-2 py-1 border border-border rounded bg-background text-foreground shadow-sm hover:bg-muted transition-colors"
                            >
                              {Object.entries(phaseConfig).map(([key, config]) => (
                                <option key={key} value={key} className="bg-background text-foreground">
                                  {config.label}
                                </option>
                              ))}
                            </select>
                            <span className="text-xs text-muted-foreground min-w-[80px]">{phase.name}</span>
                            <span className="text-xs text-muted-foreground">({phase.value} pts)</span>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2 min-w-[150px]">
                        {project.estimated_dates.map((dateInfo, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground min-w-[80px]">{dateInfo.phase}:</span>
                            <DatePicker
                              date={new Date(dateInfo.date)}
                              onDateChange={(date) => {
                                if (date) {
                                  updateEstimatedDate(project.id, index, date);
                                }
                              }}
                              className="text-xs"
                            />
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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