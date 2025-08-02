import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CalendarDays, Building2, Wrench, Camera, FileText, Users, BarChart3, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ConstructionProjectsGrid } from "@/components/ConstructionProjectsGrid";
import { ConstructionDashboard } from "@/components/ConstructionDashboard";
import { AdvancedBudgetManager } from "@/components/AdvancedBudgetManager";
import { ConstructionGanttAdvanced } from "@/components/ConstructionGanttAdvanced";
import { EquipmentManager } from "@/components/EquipmentManager";
import { ProgressPhotosManager } from "@/components/ProgressPhotosManager";
import { QualityInspections } from "@/components/QualityInspections";
import { WorkReportsManager } from "@/components/WorkReportsManager";
import { MaterialRequirements } from "@/components/MaterialRequirements";
import { ConstructionTeamsManager } from "@/components/ConstructionTeamsManager";
import { ConstructionReports } from "@/components/ConstructionReports";
import { ConstructionAnalytics } from "@/components/ConstructionAnalytics";

interface ConstructionProject {
  id: string;
  project_name: string;
  status: string;
  client_id: string;
  budget: number;
  construction_budget: number;
  overall_progress_percentage: number;
  construction_start_date: string | null;
  estimated_completion_date: string | null;
  clients: {
    full_name: string;
  };
}

export function Construction() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ConstructionProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<ConstructionProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    if (user) {
      fetchConstructionProjects();
    }
  }, [user]);

  const fetchConstructionProjects = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("client_projects")
        .select(`
          id,
          project_name,
          status,
          client_id,
          budget,
          construction_budget,
          overall_progress_percentage,
          construction_start_date,
          estimated_completion_date,
          clients!inner (
            full_name
          )
        `)
        .in("status", ["construction", "design_completed", "budget_accepted"])
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching construction projects:", error);
        toast.error("Error al cargar los proyectos de construcción");
        return;
      }

      setProjects(data || []);
      
      // Auto-select first project if none selected
      if (!selectedProject && data && data.length > 0) {
        setSelectedProject(data[0]);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar los proyectos");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-lg text-muted-foreground">Cargando módulo de construcción...</p>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader className="text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <CardTitle>No hay proyectos en construcción</CardTitle>
            <CardDescription>
              Los proyectos aparecerán aquí cuando se complete el diseño o se marque que el cliente ya cuenta con un diseño.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Módulo de Construcción</h1>
          <p className="text-muted-foreground">
            Gestión integral de proyectos de construcción
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            {projects.length} proyectos activos
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Project Selection Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Proyectos Activos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedProject?.id === project.id
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => setSelectedProject(project)}
                >
                  <div className="font-medium text-sm truncate">
                    {project.project_name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {project.clients.full_name}
                  </div>
                  <div className="mt-2">
                    <Progress 
                      value={project.overall_progress_percentage || 0} 
                      className="h-1"
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      {project.overall_progress_percentage || 0}% completado
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          {selectedProject && (
            <div className="space-y-6">
              {/* Project Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">{selectedProject.project_name}</CardTitle>
                      <CardDescription>
                        Cliente: {selectedProject.clients.full_name}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">
                      {selectedProject.status === "construction" ? "En Construcción" : "Diseño Completado"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {selectedProject.overall_progress_percentage || 0}%
                      </div>
                      <div className="text-sm text-muted-foreground">Progreso</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        ${(selectedProject.construction_budget || selectedProject.budget || 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Presupuesto</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedProject.construction_start_date 
                          ? new Date(selectedProject.construction_start_date).toLocaleDateString()
                          : "No iniciado"
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">Inicio</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {selectedProject.estimated_completion_date
                          ? new Date(selectedProject.estimated_completion_date).toLocaleDateString()
                          : "Sin fecha"
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">Estimado</div>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Tabs for different modules */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5 lg:grid-cols-10">
                  <TabsTrigger value="dashboard" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </TabsTrigger>
                  <TabsTrigger value="budget" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Presupuesto</span>
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    <span className="hidden sm:inline">Cronograma</span>
                  </TabsTrigger>
                  <TabsTrigger value="equipment" className="flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    <span className="hidden sm:inline">Equipos</span>
                  </TabsTrigger>
                  <TabsTrigger value="photos" className="flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    <span className="hidden sm:inline">Fotos</span>
                  </TabsTrigger>
                  <TabsTrigger value="quality" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Calidad</span>
                  </TabsTrigger>
                  <TabsTrigger value="reports" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Reportes</span>
                  </TabsTrigger>
                  <TabsTrigger value="materials" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Materiales</span>
                  </TabsTrigger>
                  <TabsTrigger value="teams" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline">Equipos</span>
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Análisis</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="mt-6">
                  <ConstructionDashboard projectId={selectedProject.id} />
                </TabsContent>

                <TabsContent value="budget" className="mt-6">
                  <AdvancedBudgetManager projectId={selectedProject.id} />
                </TabsContent>

                <TabsContent value="timeline" className="mt-6">
                  <ConstructionGanttAdvanced projectId={selectedProject.id} />
                </TabsContent>

                <TabsContent value="equipment" className="mt-6">
                  <EquipmentManager projectId={selectedProject.id} />
                </TabsContent>

                <TabsContent value="photos" className="mt-6">
                  <ProgressPhotosManager projectId={selectedProject.id} />
                </TabsContent>

                <TabsContent value="quality" className="mt-6">
                  <QualityInspections projectId={selectedProject.id} />
                </TabsContent>

                <TabsContent value="reports" className="mt-6">
                  <ConstructionReports projectId={selectedProject.id} />
                </TabsContent>

                <TabsContent value="work-reports" className="mt-6">
                  <WorkReportsManager projectId={selectedProject.id} />
                </TabsContent>

                <TabsContent value="materials" className="mt-6">
                  <MaterialRequirements projectId={selectedProject.id} />
                </TabsContent>

                <TabsContent value="teams" className="mt-6">
                  <ConstructionTeamsManager projectId={selectedProject.id} />
                </TabsContent>

                <TabsContent value="analytics" className="mt-6">
                  <ConstructionAnalytics projectId={selectedProject.id} />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}