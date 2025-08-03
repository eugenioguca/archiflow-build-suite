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
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Proyectos Activos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {projects.map((project) => (
          <div
            key={project.id}
            className={`group p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
              selectedProject?.id === project.id
                ? "bg-primary/5 border-primary/30 shadow-sm"
                : "hover:bg-muted/50 border-border/50 hover:border-border"
            }`}
            onClick={() => {
              setSelectedProject(project);
              setSidebarOpen(false);
            }}
          >
            <div className="space-y-2">
              <div className="font-semibold text-sm text-foreground truncate">
                {project.project_name}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {project.clients.full_name}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-muted-foreground">Progreso</span>
                  <span className="text-xs font-semibold text-foreground">
                    {project.overall_progress_percentage || 0}%
                  </span>
                </div>
                <Progress 
                  value={project.overall_progress_percentage || 0} 
                  className="h-2"
                />
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isMobile && (
                <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="shrink-0">
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
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  Módulo de Construcción
                </h1>
                <p className="text-muted-foreground text-sm">
                  Gestión integral de proyectos de construcción
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-medium">
                <Building2 className="w-3 h-3 mr-1" />
                {projects.length} proyectos
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-6 space-y-6">

        <div className={`${isMobile ? 'space-y-6' : 'flex gap-6'}`}>
          {/* Project Selection Sidebar - Desktop Only */}
          {!isMobile && (
            <div className="w-80 shrink-0">
              <ProjectSelector />
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 min-w-0 space-y-6">{/* min-w-0 prevents flex overflow */}
          {selectedProject && (
            <div className="space-y-4 sm:space-y-6">
            {/* Mobile Project Header */}
            {isMobile && (
              <Card className="shadow-sm border-border/50">
                <CardHeader className="pb-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-lg font-bold text-foreground truncate">
                          {selectedProject.project_name}
                        </CardTitle>
                        <CardDescription className="text-sm mt-1">
                          Cliente: {selectedProject.clients.full_name}
                        </CardDescription>
                      </div>
                      <Badge 
                        variant={selectedProject.status === "construction" ? "default" : "secondary"} 
                        className="text-xs font-medium shrink-0"
                      >
                        {selectedProject.status === "construction" ? "En Construcción" : "Diseño Completado"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                        <div className="text-lg font-bold text-primary">
                          {selectedProject.overall_progress_percentage || 0}%
                        </div>
                        <div className="text-xs text-muted-foreground font-medium">Progreso</div>
                      </div>
                      <div className="text-center p-3 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-lg border border-green-500/20">
                        <div className="text-sm font-bold text-green-700">
                          ${(selectedProject.construction_budget || selectedProject.budget || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground font-medium">Presupuesto</div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            )}

            {/* Desktop Project Header */}
            {!isMobile && (
              <Card className="shadow-sm border-border/50 bg-gradient-to-r from-card to-card/80">
                <CardHeader className="pb-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <CardTitle className="text-2xl font-bold text-foreground">
                        {selectedProject.project_name}
                      </CardTitle>
                      <CardDescription className="text-base">
                        Cliente: {selectedProject.clients.full_name}
                      </CardDescription>
                    </div>
                    <Badge 
                      variant={selectedProject.status === "construction" ? "default" : "secondary"}
                      className="text-sm font-medium px-3 py-1"
                    >
                      {selectedProject.status === "construction" ? "En Construcción" : "Diseño Completado"}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
                    <div className="text-center p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20">
                      <div className="text-3xl font-bold text-primary mb-1">
                        {selectedProject.overall_progress_percentage || 0}%
                      </div>
                      <div className="text-sm text-muted-foreground font-medium">Progreso General</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-xl border border-green-500/20">
                      <div className="text-xl font-bold text-green-700 mb-1">
                        ${(selectedProject.construction_budget || selectedProject.budget || 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground font-medium">Presupuesto</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-xl border border-blue-500/20">
                      <div className="text-lg font-bold text-blue-700 mb-1">
                        {selectedProject.construction_start_date 
                          ? new Date(selectedProject.construction_start_date).toLocaleDateString()
                          : "No iniciado"
                        }
                      </div>
                      <div className="text-sm text-muted-foreground font-medium">Fecha de Inicio</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-orange-500/10 to-orange-500/5 rounded-xl border border-orange-500/20">
                      <div className="text-lg font-bold text-orange-700 mb-1">
                        {selectedProject.estimated_completion_date
                          ? new Date(selectedProject.estimated_completion_date).toLocaleDateString()
                          : "Sin fecha"
                        }
                      </div>
                      <div className="text-sm text-muted-foreground font-medium">Fecha Estimada</div>
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
    </div>
  );
}