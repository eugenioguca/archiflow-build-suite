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
  project_name: string;
  budget: number;
  construction_budget: number;
  spent_budget: number;
  construction_area: number;
  land_square_meters: number;
  client: {
    full_name: string;
  };
  construction_project?: {
    id: string;
    construction_area: number;
    total_budget: number;
    spent_budget: number;
    start_date: string;
    estimated_completion_date: string;
    overall_progress_percentage: number;
    permit_status: string;
    project_manager_id?: string;
    construction_supervisor_id?: string;
    location_coordinates?: any;
    safety_requirements?: string;
    weather_considerations?: string;
    permit_expiry_date?: string;
    actual_completion_date?: string;
  }[];
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
        .from("client_projects")
        .select(`
          *,
          client:clients(full_name),
          construction_project:construction_projects(
            id,
            construction_area,
            total_budget,
            spent_budget,
            start_date,
            estimated_completion_date,
            overall_progress_percentage,
            permit_status,
            project_manager_id,
            construction_supervisor_id,
            location_coordinates,
            safety_requirements,
            weather_considerations,
            permit_expiry_date,
            actual_completion_date
          )
        `)
        .eq("id", projectId)
        .maybeSingle();

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

  const constructionData = constructionProject.construction_project?.[0];
  const progressPercentage = constructionData?.overall_progress_percentage || 0;
  const permitStatus = constructionData?.permit_status || "pending";
  const totalBudget = constructionProject.budget || constructionData?.total_budget || 0;
  const spentBudget = constructionProject.spent_budget || constructionData?.spent_budget || 0;
  const constructionArea = constructionData?.construction_area || constructionProject.construction_area || (constructionProject.land_square_meters * 0.8);
  const estimatedCompletion = constructionData?.estimated_completion_date;

  const progressColor = progressPercentage >= 75 
    ? "bg-green-500" 
    : progressPercentage >= 50 
    ? "bg-yellow-500" 
    : "bg-red-500";

  const permitStatusColor = permitStatus === "approved" 
    ? "bg-green-100 text-green-800" 
    : permitStatus === "pending" 
    ? "bg-yellow-100 text-yellow-800" 
    : "bg-red-100 text-red-800";

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{constructionProject.project_name}</h1>
          <p className="text-muted-foreground">
            Cliente: {constructionProject.client.full_name}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge className={permitStatusColor}>
            <Shield className="h-3 w-3 mr-1" />
            {permitStatus === "approved" && "Permisos Aprobados"}
            {permitStatus === "pending" && "Permisos Pendientes"}
            {permitStatus === "expired" && "Permisos Vencidos"}
          </Badge>
          <BudgetEditDialog
            projectId={constructionProject.id}
            currentBudget={totalBudget}
            currentArea={constructionArea}
            estimatedCompletion={estimatedCompletion}
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
              {progressPercentage}%
            </div>
            <Progress 
              value={progressPercentage} 
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
              ${spentBudget.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              de ${totalBudget.toLocaleString()}
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
              {constructionArea} m²
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
              {estimatedCompletion ? new Date(estimatedCompletion).toLocaleDateString() : 'Sin fecha'}
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