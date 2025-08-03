import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { CalendarDays, Building2, Wrench, Camera, FileText, Users, BarChart3, MapPin, Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const isMobile = useIsMobile();
  const [projects, setProjects] = useState<ConstructionProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<ConstructionProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<"principal" | "gestion" | "documentacion">("principal");

  useEffect(() => {
    if (user) {
      fetchConstructionProjects();
    }
  }, [user]);

  // Find which category contains the active tab
  useEffect(() => {
    const navigationCategories = {
      principal: ["dashboard", "budget", "timeline"],
      gestion: ["equipment", "materials", "teams", "quality"],
      documentacion: ["photos", "reports", "analytics"]
    };
    
    const categoryKey = Object.keys(navigationCategories).find(key => 
      navigationCategories[key as keyof typeof navigationCategories].includes(activeTab)
    ) as "principal" | "gestion" | "documentacion";
    
    if (categoryKey) {
      setActiveCategory(categoryKey);
    }
  }, [activeTab]);

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

  // Component to render project selector
  const ProjectSelector = () => (
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
            onClick={() => {
              setSelectedProject(project);
              setSidebarOpen(false);
            }}
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
  );

  // Categorized navigation structure
  const navigationCategories = {
    principal: {
      label: "Principal",
      tabs: [
        { value: "dashboard", label: "Dashboard", icon: BarChart3 },
        { value: "budget", label: "Presupuesto", icon: FileText },
        { value: "timeline", label: "Cronograma", icon: CalendarDays },
      ]
    },
    gestion: {
      label: "Gestión",
      tabs: [
        { value: "equipment", label: "Equipos", icon: Wrench },
        { value: "materials", label: "Materiales", icon: Building2 },
        { value: "teams", label: "Equipos", icon: Users },
        { value: "quality", label: "Calidad", icon: Building2 },
      ]
    },
    documentacion: {
      label: "Documentación",
      tabs: [
        { value: "photos", label: "Fotos", icon: Camera },
        { value: "reports", label: "Reportes", icon: FileText },
        { value: "analytics", label: "Análisis", icon: BarChart3 },
      ]
    }
  };

  // Flat array for mobile dropdown
  const tabOptions = Object.values(navigationCategories).flatMap(category => category.tabs);

  return (
    <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isMobile && (
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <div className="mt-4">
                  <ProjectSelector />
                </div>
              </SheetContent>
            </Sheet>
          )}
          <div>
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Módulo de Construcción</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Gestión integral de proyectos de construcción
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs sm:text-sm">
            {projects.length} proyectos
          </Badge>
        </div>
      </div>

      <div className={`${isMobile ? 'space-y-4' : 'flex gap-6'}`}>
        {/* Project Selection Sidebar - Desktop Only */}
        {!isMobile && (
          <div className="w-80 shrink-0">
            <ProjectSelector />
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 min-w-0">{/* min-w-0 prevents flex overflow */}
          {selectedProject && (
            <div className="space-y-4 sm:space-y-6">
              {/* Mobile Project Header */}
              {isMobile && (
                <Card>
                  <CardHeader className="pb-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{selectedProject.project_name}</CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {selectedProject.status === "construction" ? "En Construcción" : "Diseño Completado"}
                        </Badge>
                      </div>
                      <CardDescription className="text-sm">
                        Cliente: {selectedProject.clients.full_name}
                      </CardDescription>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="text-center p-2 bg-muted/50 rounded-lg">
                        <div className="text-lg font-bold text-primary">
                          {selectedProject.overall_progress_percentage || 0}%
                        </div>
                        <div className="text-xs text-muted-foreground">Progreso</div>
                      </div>
                      <div className="text-center p-2 bg-muted/50 rounded-lg">
                        <div className="text-sm font-bold text-green-600">
                          ${(selectedProject.construction_budget || selectedProject.budget || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">Presupuesto</div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              )}

              {/* Desktop Project Header */}
              {!isMobile && (
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
              )}

              {/* Adaptive Navigation System */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                {/* Mobile: Dropdown */}
                {isMobile ? (
                  <div className="space-y-4">
                    <Select value={activeTab} onValueChange={setActiveTab}>
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {tabOptions.find(tab => tab.value === activeTab)?.label || "Selecciona una sección"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(navigationCategories).map(([categoryKey, category]) => (
                          <div key={categoryKey}>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                              {category.label}
                            </div>
                            {category.tabs.map((tab) => (
                              <SelectItem key={tab.value} value={tab.value}>
                                <div className="flex items-center gap-2">
                                  <tab.icon className="h-4 w-4" />
                                  {tab.label}
                                </div>
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  /* Tablet & Desktop: Categorized Navigation */
                  <div className="space-y-4">
                    {/* Category Selection - Hidden on Desktop */}
                    <div className="block md:hidden">
                      <div className="flex space-x-1 p-1 bg-muted rounded-lg">
                        {Object.entries(navigationCategories).map(([categoryKey, category]) => (
                          <Button
                            key={categoryKey}
                            variant={activeCategory === categoryKey ? "default" : "ghost"}
                            size="sm"
                            className="flex-1 text-xs"
                            onClick={() => setActiveCategory(categoryKey as keyof typeof navigationCategories)}
                          >
                            {category.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Tab Lists */}
                    <div className="space-y-3">
                      {/* Desktop: All categories visible */}
                      <div className="hidden md:block space-y-6">
                        {Object.entries(navigationCategories).map(([categoryKey, category]) => (
                          <div key={categoryKey} className="space-y-2">
                            <h3 className="text-sm font-medium text-muted-foreground px-1">
                              {category.label}
                            </h3>
                            <TabsList className="grid w-full grid-cols-3 h-auto">
                              {category.tabs.map((tab) => (
                                <TabsTrigger 
                                  key={tab.value} 
                                  value={tab.value} 
                                  className="flex items-center gap-2 text-xs py-2 px-3"
                                >
                                  <tab.icon className="h-4 w-4" />
                                  <span>{tab.label}</span>
                                </TabsTrigger>
                              ))}
                            </TabsList>
                          </div>
                        ))}
                      </div>

                      {/* Tablet: Active category only */}
                      <div className="block md:hidden">
                        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
                          {navigationCategories[activeCategory].tabs.map((tab) => (
                            <TabsTrigger 
                              key={tab.value} 
                              value={tab.value} 
                              className="flex flex-col items-center gap-1 text-xs py-2 px-2 h-auto"
                            >
                              <tab.icon className="h-4 w-4" />
                              <span className="text-xs truncate">{tab.label}</span>
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </div>
                    </div>
                  </div>
                )}

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