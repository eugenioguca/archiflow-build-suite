import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Calendar, 
  Users, 
  DollarSign, 
  Camera, 
  AlertTriangle,
  Truck,
  CheckCircle,
  Clock,
  TrendingUp,
  MapPin,
  FileText,
  Shield,
  Settings
} from "lucide-react";
import { BudgetEditDialog } from "./BudgetEditDialog";
import { ConstructionTimeline } from "./ConstructionTimeline";
import { ProgressPhotos } from "./ProgressPhotos";
import { ConstructionPhases } from "./ConstructionPhases";
import { MaterialsInventory } from "./MaterialsInventory";
import { QualityControl } from "./QualityControl";
import { ConstructionExpenses } from "./ConstructionExpenses";
import { ConstructionTeams } from "./ConstructionTeams";

interface ConstructionProject {
  id: string;
  project_id: string;
  construction_area: number;
  total_budget: number;
  spent_budget: number;
  start_date: string;
  estimated_completion_date: string;
  overall_progress_percentage: number;
  permit_status: string;
  project: {
    project_name: string;
    client: {
      full_name: string;
    };
  };
}

interface ConstructionDashboardProps {
  projectId: string;
}

export function ConstructionDashboard({ projectId }: ConstructionDashboardProps) {
  const [constructionProject, setConstructionProject] = useState<ConstructionProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchConstructionProject = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("construction_projects")
        .select(`
          *,
          project:client_projects(
            project_name,
            client:clients(full_name)
          )
        `)
        .eq("project_id", projectId)
        .single();

      if (error) throw error;
      setConstructionProject(data);
    } catch (error) {
      console.error("Error fetching construction project:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchConstructionProject();
    }
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!constructionProject) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Proyecto de Construcción No Encontrado</h3>
          <p className="text-muted-foreground text-center">
            Este proyecto no tiene datos de construcción configurados.
          </p>
        </CardContent>
      </Card>
    );
  }

  const progressColor = constructionProject.overall_progress_percentage >= 75 
    ? "bg-green-500" 
    : constructionProject.overall_progress_percentage >= 50 
    ? "bg-yellow-500" 
    : "bg-red-500";

  const permitStatusColor = constructionProject.permit_status === "approved" 
    ? "bg-green-100 text-green-800" 
    : constructionProject.permit_status === "pending" 
    ? "bg-yellow-100 text-yellow-800" 
    : "bg-red-100 text-red-800";

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{constructionProject.project.project_name}</h1>
          <p className="text-muted-foreground">
            Cliente: {constructionProject.project.client.full_name}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge className={permitStatusColor}>
            <Shield className="h-3 w-3 mr-1" />
            {constructionProject.permit_status === "approved" && "Permisos Aprobados"}
            {constructionProject.permit_status === "pending" && "Permisos Pendientes"}
            {constructionProject.permit_status === "expired" && "Permisos Vencidos"}
          </Badge>
          <BudgetEditDialog
            projectId={constructionProject.project_id}
            currentBudget={constructionProject.total_budget}
            currentArea={constructionProject.construction_area}
            estimatedCompletion={constructionProject.estimated_completion_date}
            onUpdate={fetchConstructionProject}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progreso General</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">
              {constructionProject.overall_progress_percentage}%
            </div>
            <Progress 
              value={constructionProject.overall_progress_percentage} 
              className="h-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Presupuesto</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${constructionProject.spent_budget.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              de ${constructionProject.total_budget.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Área de Construcción</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {constructionProject.construction_area} m²
            </div>
            <p className="text-xs text-muted-foreground">
              Área total a construir
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fecha Estimada</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date(constructionProject.estimated_completion_date).toLocaleDateString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Fecha de finalización (editable)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="overview">Vista General</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="phases">Fases</TabsTrigger>
          <TabsTrigger value="photos">Fotos</TabsTrigger>
          <TabsTrigger value="materials">Materiales</TabsTrigger>
          <TabsTrigger value="quality">Calidad</TabsTrigger>
          <TabsTrigger value="expenses">Gastos</TabsTrigger>
          <TabsTrigger value="teams">Equipos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Actividades Recientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Las actividades recientes aparecerán aquí cuando se registren cambios en el proyecto.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Alertas y Pendientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Las alertas del proyecto aparecerán aquí cuando se detecten problemas o fechas importantes.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timeline">
          <ConstructionTimeline constructionProjectId={constructionProject.id} />
        </TabsContent>

        <TabsContent value="phases">
          <ConstructionPhases constructionProjectId={constructionProject.id} />
        </TabsContent>

        <TabsContent value="photos">
          <ProgressPhotos constructionProjectId={constructionProject.id} />
        </TabsContent>

        <TabsContent value="materials">
          <MaterialsInventory constructionProjectId={constructionProject.id} />
        </TabsContent>

        <TabsContent value="quality">
          <QualityControl constructionProjectId={constructionProject.id} />
        </TabsContent>

        <TabsContent value="expenses">
          <ConstructionExpenses constructionProjectId={constructionProject.id} />
        </TabsContent>

        <TabsContent value="teams">
          <ConstructionTeams constructionProjectId={constructionProject.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}