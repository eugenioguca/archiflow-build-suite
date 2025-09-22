import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  CheckCircle, 
  CalendarDays, 
  AlertTriangle, 
  Clock,
  Users,
  Wrench,
  Camera
} from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";

interface ConstructionOverviewProps {
  projectId: string;
  project: {
    id: string;
    project_name: string;
    overall_progress_percentage: number;
    construction_budget: number;
    budget: number;
    construction_start_date: string | null;
    estimated_completion_date: string | null;
    clients: {
      full_name: string;
    };
    status: string;
  };
}

interface ProjectStats {
  totalExpenses: number;
  totalMaterials: number;
  activeEquipment: number;
  completedActivities: number;
  totalActivities: number;
  qualityIssues: number;
  pendingRequests: number;
  activeCrews: number;
  recentPhotos: number;
}

export const ConstructionOverview: React.FC<ConstructionOverviewProps> = ({
  projectId,
  project
}) => {
  const [stats, setStats] = useState<ProjectStats>({
    totalExpenses: 0,
    totalMaterials: 0,
    activeEquipment: 0,
    completedActivities: 0,
    totalActivities: 0,
    qualityIssues: 0,
    pendingRequests: 0,
    activeCrews: 0,
    recentPhotos: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjectStats();
  }, [projectId]);

  const fetchProjectStats = async () => {
    try {
      setLoading(true);

      // Fetch financial transactions for expenses
      const { data: expenses } = await supabase
        .from("unified_financial_transactions")
        .select("monto_total")
        .eq("empresa_proyecto_id", projectId)
        .eq("tipo_movimiento", "gasto")
        .eq("departamento", "construccion");

      // Fetch material requests
      const { data: materials } = await supabase
        .from("unified_financial_transactions")
        .select("id, tiene_factura")
        .eq("empresa_proyecto_id", projectId)
        .eq("departamento", "construccion");

      // Fetch construction equipment
      const { data: equipment } = await supabase
        .from("construction_equipment")
        .select("id, status")
        .eq("project_id", projectId);

      // Fetch progress photos (recent ones)
      const { data: photos } = await supabase
        .from("progress_photos")
        .select("id")
        .eq("project_id", projectId)
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

      // Calculate stats
      const totalExpenses = expenses?.reduce((sum, exp) => sum + (exp.monto_total || 0), 0) || 0;
      const pendingRequests = materials?.filter(m => !m.tiene_factura).length || 0;
      const activeEquipmentCount = equipment?.filter(e => e.status === 'active' || e.status === 'available').length || 0;

      setStats({
        totalExpenses,
        totalMaterials: materials?.length || 0,
        activeEquipment: activeEquipmentCount,
        completedActivities: 0, // TODO: Get from cronograma when integrated
        totalActivities: 0, // TODO: Get from cronograma when integrated
        qualityIssues: 0, // TODO: Get from quality_checklists when integrated
        pendingRequests,
        activeCrews: 0, // TODO: Get from construction_crews when integrated
        recentPhotos: photos?.length || 0
      });
    } catch (error) {
      console.error("Error fetching project stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

  const getDaysElapsed = () => {
    if (!project.construction_start_date) return 0;
    const start = new Date(project.construction_start_date);
    const now = new Date();
    return Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getBudgetUsedPercentage = () => {
    const budget = project.construction_budget || project.budget || 0;
    if (budget === 0) return 0;
    return (stats.totalExpenses / budget) * 100;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{project.project_name}</CardTitle>
              <p className="text-muted-foreground flex items-center gap-2">
                {project.clients.full_name}
                <Badge variant={project.status === "construction" ? "default" : "secondary"}>
                  {project.status === "construction" ? "En construcción" : "Listo para construcción"}
                </Badge>
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Presupuesto de construcción</p>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(project.construction_budget || project.budget || 0)}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Progreso Total</p>
                <p className="text-2xl font-bold text-primary">
                  {project.overall_progress_percentage || 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
            <Progress value={project.overall_progress_percentage || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gastos Acumulados</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.totalExpenses)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">
                {getBudgetUsedPercentage().toFixed(1)}% del presupuesto usado
              </p>
              <Progress value={getBudgetUsedPercentage()} className="h-1 mt-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Solicitudes Material</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.pendingRequests}
                </p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalMaterials} materiales totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Actividades</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.completedActivities}/{stats.totalActivities || 'N/A'}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-orange-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.qualityIssues} temas de calidad
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Equipos Activos</p>
                <p className="text-lg font-bold">{stats.activeEquipment}</p>
              </div>
              <Wrench className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cuadrillas</p>
                <p className="text-lg font-bold">{stats.activeCrews}</p>
              </div>
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fotos (7 días)</p>
                <p className="text-lg font-bold">{stats.recentPhotos}</p>
              </div>
              <Camera className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Días Transcurridos</p>
                <p className="text-lg font-bold">{getDaysElapsed()}</p>
              </div>
              <CalendarDays className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline and Alerts */}
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
                {project.construction_start_date 
                  ? new Date(project.construction_start_date).toLocaleDateString()
                  : "Por definir"
                }
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm">Fecha estimada de finalización</span>
              <span className="text-sm font-medium">
                {project.estimated_completion_date
                  ? new Date(project.estimated_completion_date).toLocaleDateString()
                  : "Por definir"
                }
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm">Días transcurridos</span>
              <span className="text-sm font-medium">{getDaysElapsed()} días</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Estado y Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.pendingRequests > 0 && (
                <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm">{stats.pendingRequests} solicitudes de material pendientes</span>
                </div>
              )}
              {stats.qualityIssues > 0 && (
                <div className="flex items-center gap-2 p-2 bg-red-50 rounded border-l-4 border-red-400">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm">{stats.qualityIssues} temas de calidad por resolver</span>
                </div>
              )}
              {getBudgetUsedPercentage() > 80 && (
                <div className="flex items-center gap-2 p-2 bg-orange-50 rounded border-l-4 border-orange-400">
                  <DollarSign className="h-4 w-4 text-orange-600" />
                  <span className="text-sm">Presupuesto usado: {getBudgetUsedPercentage().toFixed(1)}%</span>
                </div>
              )}
              {stats.pendingRequests === 0 && stats.qualityIssues === 0 && getBudgetUsedPercentage() <= 80 && (
                <div className="flex items-center gap-2 p-2 bg-green-50 rounded border-l-4 border-green-400">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">No hay alertas críticas. Todo marcha bien.</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};