import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CalendarDays, 
  Building2, 
  Wrench, 
  Camera, 
  FileText, 
  Users, 
  BarChart3, 
  Calculator,
  Package,
  Shield,
  Edit,
  ArrowUpRight,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  TrendingUp
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ConstructionBudgetTabs } from "@/components/construction/ConstructionBudgetTabs";
import { ConstructionSchedule } from "@/components/construction/ConstructionSchedule";
import { ConstructionMaterials } from "@/components/construction/ConstructionMaterials";
import { ConstructionEquipmentManager } from "@/components/construction/ConstructionEquipmentManager";
import { ConstructionCrews } from "@/components/construction/ConstructionCrews";
import { ConstructionQuality } from "@/components/construction/ConstructionQuality";
import { ProgressPhotosManager } from "@/components/ProgressPhotosManager";
import { ConstructionReports } from "@/components/ConstructionReports";
import ProfitabilityAnalysis from "@/components/ProfitabilityAnalysis";
import { DocumentsPanel } from "@/components/DocumentsPanel";

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

interface ProjectStats {
  totalExpenses: number;
  totalMaterials: number;
  activeTeams: number;
  completedActivities: number;
  totalActivities: number;
  qualityIssues: number;
  pendingRequests: number;
}

export function Construction() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [projects, setProjects] = useState<ConstructionProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<ConstructionProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [projectStats, setProjectStats] = useState<ProjectStats>({
    totalExpenses: 0,
    totalMaterials: 0,
    activeTeams: 0,
    completedActivities: 0,
    totalActivities: 0,
    qualityIssues: 0,
    pendingRequests: 0
  });

  useEffect(() => {
    if (user) {
      fetchConstructionProjects();
    }
  }, [user]);

  useEffect(() => {
    if (selectedProject) {
      fetchProjectStats();
    }
  }, [selectedProject]);

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

  const fetchProjectStats = async () => {
    if (!selectedProject) return;

    try {
      // Fetch expenses for this project
      const { data: expenses } = await supabase
        .from("unified_financial_transactions")
        .select("monto_total")
        .eq("empresa_proyecto_id", selectedProject.id)
        .eq("tipo_movimiento", "gasto")
        .eq("departamento", "construccion");

      // Fetch material requests
      const { data: materials } = await supabase
        .from("unified_financial_transactions")
        .select("id")
        .eq("empresa_proyecto_id", selectedProject.id)
        .eq("departamento", "construccion")
        .contains("metadata", { type: "material_request" });

      // Fetch construction equipment for this project
      const { data: equipment } = await supabase
        .from("construction_equipment")
        .select("id")
        .eq("project_id", selectedProject.id)
        .eq("status", "active");

      // Calculate stats
      const totalExpenses = expenses?.reduce((sum, exp) => sum + (exp.monto_total || 0), 0) || 0;
      
      setProjectStats({
        totalExpenses,
        totalMaterials: materials?.length || 0,
        activeTeams: equipment?.length || 0,
        completedActivities: 0, // TODO: Get from cronograma
        totalActivities: 0, // TODO: Get from cronograma  
        qualityIssues: 0, // TODO: Get from quality_checklists
        pendingRequests: materials?.length || 0
      });
    } catch (error) {
      console.error("Error fetching project stats:", error);
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

  const OverviewKPIs = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Progreso Total</p>
              <p className="text-2xl font-bold text-primary">
                {selectedProject?.overall_progress_percentage || 0}%
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-primary" />
          </div>
          <Progress value={selectedProject?.overall_progress_percentage || 0} className="mt-2" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Gastos Totales</p>
              <p className="text-2xl font-bold text-green-600">
                ${projectStats.totalExpenses.toLocaleString()}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Presupuesto: ${(selectedProject?.construction_budget || 0).toLocaleString()}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Solicitudes Material</p>
              <p className="text-2xl font-bold text-blue-600">
                {projectStats.pendingRequests}
              </p>
            </div>
            <Package className="h-8 w-8 text-blue-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {projectStats.totalMaterials} materiales activos
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Actividades</p>
              <p className="text-2xl font-bold text-orange-600">
                {projectStats.completedActivities}/{projectStats.totalActivities}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-orange-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {projectStats.qualityIssues} temas de calidad
          </p>
        </CardContent>
      </Card>
    </div>
  );

  const ProjectSelector = () => (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Proyectos de Construcción
            </CardTitle>
            <CardDescription>Selecciona un proyecto para gestionar su construcción</CardDescription>
          </div>
          <Badge variant="secondary">{projects.length} proyectos activos</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Select 
          value={selectedProject?.id || ""} 
          onValueChange={(value) => {
            const project = projects.find(p => p.id === value);
            if (project) setSelectedProject(project);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Seleccionar proyecto" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                <div className="flex items-center justify-between w-full">
                  <span>{project.project_name}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {project.clients.full_name}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Módulo de Construcción</h1>
          <p className="text-muted-foreground">Gestión integral de proyectos de construcción</p>
        </div>
      </div>

      {/* Project Selector */}
      <ProjectSelector />

      {selectedProject && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-9">
            <TabsTrigger value="overview" className="flex items-center gap-1 text-xs">
              <BarChart3 className="h-3 w-3" />
              Vista General
            </TabsTrigger>
            <TabsTrigger value="budget" className="flex items-center gap-1 text-xs">
              <Calculator className="h-3 w-3" />
              Presupuesto
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-1 text-xs">
              <CalendarDays className="h-3 w-3" />
              Cronograma
            </TabsTrigger>
            <TabsTrigger value="materials" className="flex items-center gap-1 text-xs">
              <Package className="h-3 w-3" />
              Materiales
            </TabsTrigger>
            <TabsTrigger value="equipment" className="flex items-center gap-1 text-xs">
              <Wrench className="h-3 w-3" />
              Equipos
            </TabsTrigger>
            <TabsTrigger value="crews" className="flex items-center gap-1 text-xs">
              <Users className="h-3 w-3" />
              Cuadrillas
            </TabsTrigger>
            <TabsTrigger value="quality" className="flex items-center gap-1 text-xs">
              <Shield className="h-3 w-3" />
              Calidad
            </TabsTrigger>
            <TabsTrigger value="photos" className="flex items-center gap-1 text-xs">
              <Camera className="h-3 w-3" />
              Fotos
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-1 text-xs">
              <FileText className="h-3 w-3" />
              Reportes
            </TabsTrigger>
          </TabsList>

          {/* Vista General */}
          <TabsContent value="overview" className="space-y-6">
            <div className="space-y-6">
              {/* Project Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">{selectedProject.project_name}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        {selectedProject.clients.full_name}
                        <Badge variant={selectedProject.status === "construction" ? "default" : "secondary"}>
                          {selectedProject.status === "construction" ? "En construcción" : "Listo para construcción"}
                        </Badge>
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Presupuesto de construcción</p>
                      <p className="text-lg font-bold text-green-600">
                        ${(selectedProject.construction_budget || selectedProject.budget || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* KPIs */}
              <OverviewKPIs />

              {/* Timeline resumen */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      Timeline del Proyecto
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm">Inicio de construcción</span>
                      <span className="text-sm font-medium">
                        {selectedProject.construction_start_date 
                          ? new Date(selectedProject.construction_start_date).toLocaleDateString()
                          : "Por definir"
                        }
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm">Fecha estimada de finalización</span>
                      <span className="text-sm font-medium">
                        {selectedProject.estimated_completion_date
                          ? new Date(selectedProject.estimated_completion_date).toLocaleDateString()
                          : "Por definir"
                        }
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm">Días transcurridos</span>
                      <span className="text-sm font-medium">
                        {selectedProject.construction_start_date 
                          ? Math.ceil((new Date().getTime() - new Date(selectedProject.construction_start_date).getTime()) / (1000 * 60 * 60 * 24))
                          : 0
                        } días
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Alertas y Notificaciones
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {projectStats.pendingRequests > 0 && (
                        <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
                          <Clock className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm">{projectStats.pendingRequests} solicitudes pendientes</span>
                        </div>
                      )}
                      {projectStats.qualityIssues > 0 && (
                        <div className="flex items-center gap-2 p-2 bg-red-50 rounded border-l-4 border-red-400">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <span className="text-sm">{projectStats.qualityIssues} temas de calidad</span>
                        </div>
                      )}
                      {projectStats.pendingRequests === 0 && projectStats.qualityIssues === 0 && (
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded border-l-4 border-green-400">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">No hay alertas pendientes</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Presupuesto */}
          <TabsContent value="budget">
          <ConstructionBudgetTabs 
            selectedClientId={selectedProject.client_id}
            selectedProjectId={selectedProject.id}
          />
          </TabsContent>

          {/* Cronograma */}
          <TabsContent value="schedule">
            <ConstructionSchedule 
              projectId={selectedProject.id}
              clientId={selectedProject.client_id}
            />
          </TabsContent>

          {/* Materiales */}
          <TabsContent value="materials">
            <ConstructionMaterials 
              projectId={selectedProject.id}
              clientId={selectedProject.client_id}
            />
          </TabsContent>

          {/* Equipos */}
          <TabsContent value="equipment">
            <ConstructionEquipmentManager 
              projectId={selectedProject.id}
              clientId={selectedProject.client_id}
            />
          </TabsContent>

          {/* Cuadrillas */}
          <TabsContent value="crews">
            <ConstructionCrews 
              projectId={selectedProject.id}
              clientId={selectedProject.client_id}
            />
          </TabsContent>

          {/* Calidad */}
          <TabsContent value="quality">
            <ConstructionQuality 
              projectId={selectedProject.id}
              clientId={selectedProject.client_id}
            />
          </TabsContent>

          {/* Fotos */}
          <TabsContent value="photos">
            <ProgressPhotosManager 
              projectId={selectedProject.id}
            />
          </TabsContent>

          {/* Reportes */}
          <TabsContent value="reports">
            <ConstructionReports 
              projectId={selectedProject.id}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}