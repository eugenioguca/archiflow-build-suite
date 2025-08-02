import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/DatePicker";
import { 
  FileText, 
  Download, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  BarChart3,
  PieChart,
  Calendar,
  Users
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ConstructionReportsProps {
  projectId: string;
}

interface ReportData {
  phases: any[];
  teams: any[];
  timeline: any[];
  budget: any[];
  equipment: any[];
  progressPhotos: any[];
  qualityInspections: any[];
  workReports: any[];
}

export function ConstructionReports({ projectId }: ConstructionReportsProps) {
  const [reportData, setReportData] = useState<ReportData>({
    phases: [],
    teams: [],
    timeline: [],
    budget: [],
    equipment: [],
    progressPhotos: [],
    qualityInspections: [],
    workReports: []
  });
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<string>("general");
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    to: new Date()
  });

  useEffect(() => {
    fetchReportData();
  }, [projectId, dateRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      // Fetch all construction data
      const [
        phasesData,
        teamsData,
        timelineData,
        budgetData,
        equipmentData,
        progressPhotosData,
        qualityInspectionsData,
        workReportsData
      ] = await Promise.all([
        supabase.from("construction_phases").select("*").eq("project_id", projectId),
        supabase.from("construction_teams").select("*").eq("project_id", projectId),
        supabase.from("construction_timeline").select("*").eq("project_id", projectId),
        supabase.from("construction_budget_items").select("*").eq("project_id", projectId),
        supabase.from("construction_equipment").select("*").eq("project_id", projectId),
        supabase.from("progress_photos").select("*").eq("project_id", projectId),
        supabase.from("quality_inspections").select("*").eq("project_id", projectId),
        supabase.from("work_reports").select("*").eq("project_id", projectId)
      ]);

      setReportData({
        phases: phasesData.data || [],
        teams: teamsData.data || [],
        timeline: timelineData.data || [],
        budget: budgetData.data || [],
        equipment: equipmentData.data || [],
        progressPhotos: progressPhotosData.data || [],
        qualityInspections: qualityInspectionsData.data || [],
        workReports: workReportsData.data || []
      });
    } catch (error) {
      console.error("Error fetching report data:", error);
      toast.error("Error al cargar los datos del reporte");
    } finally {
      setLoading(false);
    }
  };

  const generateReport = () => {
    switch (reportType) {
      case "general":
        return generateGeneralReport();
      case "progress":
        return generateProgressReport();
      case "budget":
        return generateBudgetReport();
      case "quality":
        return generateQualityReport();
      case "productivity":
        return generateProductivityReport();
      default:
        return generateGeneralReport();
    }
  };

  const generateGeneralReport = () => {
    const totalPhases = reportData.phases.length;
    const completedPhases = reportData.phases.filter(p => p.status === 'completed').length;
    const totalActivities = reportData.timeline.length;
    const completedActivities = reportData.timeline.filter(a => a.status === 'completed').length;
    const totalTeams = reportData.teams.length;
    const activeTeams = reportData.teams.filter(t => t.status === 'active').length;

    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{completedPhases}/{totalPhases}</div>
              <div className="text-sm text-muted-foreground">Fases Completadas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{completedActivities}/{totalActivities}</div>
              <div className="text-sm text-muted-foreground">Actividades Terminadas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{activeTeams}/{totalTeams}</div>
              <div className="text-sm text-muted-foreground">Equipos Activos</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{reportData.progressPhotos.length}</div>
              <div className="text-sm text-muted-foreground">Fotos de Progreso</div>
            </CardContent>
          </Card>
        </div>

        {/* Status Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen de Estado del Proyecto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium">Progreso General:</span>
                <Badge variant="secondary">
                  {totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0}%
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Fases por Estado</h4>
                <div className="space-y-1">
                  {['pending', 'in_progress', 'completed', 'on_hold'].map(status => {
                    const count = reportData.phases.filter(p => p.status === status).length;
                    const statusLabel = {
                      'pending': 'Pendiente',
                      'in_progress': 'En Progreso', 
                      'completed': 'Completada',
                      'on_hold': 'En Pausa'
                    }[status];
                    return (
                      <div key={status} className="flex justify-between">
                        <span className="text-sm">{statusLabel}:</span>
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Equipos por Especialidad</h4>
                <div className="space-y-1">
                  {Array.from(new Set(reportData.teams.map(t => t.specialty))).map(specialty => {
                    const count = reportData.teams.filter(t => t.specialty === specialty).length;
                    return (
                      <div key={specialty} className="flex justify-between">
                        <span className="text-sm">{specialty}:</span>
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const generateProgressReport = () => {
    const activitiesWithDates = reportData.timeline.filter(a => a.estimated_start_date && a.estimated_end_date);
    const overdueTasks = activitiesWithDates.filter(a => 
      new Date(a.estimated_end_date) < new Date() && a.status !== 'completed'
    );
    const upcomingTasks = activitiesWithDates.filter(a => 
      new Date(a.estimated_start_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) &&
      new Date(a.estimated_start_date) > new Date() &&
      a.status === 'not_started'
    );

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="font-medium">Tareas Atrasadas</span>
              </div>
              <div className="text-2xl font-bold text-red-600">{overdueTasks.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <span className="font-medium">Próximas Tareas</span>
              </div>
              <div className="text-2xl font-bold text-yellow-600">{upcomingTasks.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span className="font-medium">Eficiencia</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {activitiesWithDates.length > 0 ? 
                  Math.round(((activitiesWithDates.length - overdueTasks.length) / activitiesWithDates.length) * 100) : 100}%
              </div>
            </CardContent>
          </Card>
        </div>

        {overdueTasks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Tareas Atrasadas - Atención Requerida</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {overdueTasks.slice(0, 5).map(task => (
                  <div key={task.id} className="flex justify-between items-center p-2 border rounded">
                    <div>
                      <div className="font-medium">{task.activity_name}</div>
                      <div className="text-sm text-muted-foreground">
                        Vencimiento: {new Date(task.estimated_end_date).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant="destructive">
                      {Math.ceil((new Date().getTime() - new Date(task.estimated_end_date).getTime()) / (1000 * 60 * 60 * 24))} días
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const generateBudgetReport = () => {
    const totalBudget = reportData.budget.reduce((sum, item) => sum + (item.total_price || 0), 0);
    const executedBudget = reportData.budget.reduce((sum, item) => sum + (item.executed_amount || 0), 0);
    const remainingBudget = totalBudget - executedBudget;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                ${totalBudget.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Presupuesto Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                ${executedBudget.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Ejecutado</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                ${remainingBudget.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Restante</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Análisis Presupuestal por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from(new Set(reportData.budget.map(item => item.category))).map(category => {
                const categoryItems = reportData.budget.filter(item => item.category === category);
                const categoryTotal = categoryItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
                const categoryExecuted = categoryItems.reduce((sum, item) => sum + (item.executed_amount || 0), 0);
                const percentage = categoryTotal > 0 ? (categoryExecuted / categoryTotal) * 100 : 0;

                return (
                  <div key={category} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{category}</span>
                      <span className="text-sm">
                        ${categoryExecuted.toLocaleString()} / ${categoryTotal.toLocaleString()} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const generateQualityReport = () => {
    const totalInspections = reportData.qualityInspections.length;
    const passedInspections = reportData.qualityInspections.filter(i => i.status === 'passed').length;
    const failedInspections = reportData.qualityInspections.filter(i => i.status === 'failed').length;
    const pendingInspections = reportData.qualityInspections.filter(i => i.status === 'pending').length;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{totalInspections}</div>
              <div className="text-sm text-muted-foreground">Total Inspecciones</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{passedInspections}</div>
              <div className="text-sm text-muted-foreground">Aprobadas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{failedInspections}</div>
              <div className="text-sm text-muted-foreground">Rechazadas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{pendingInspections}</div>
              <div className="text-sm text-muted-foreground">Pendientes</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Índice de Calidad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">
                {totalInspections > 0 ? Math.round((passedInspections / totalInspections) * 100) : 0}%
              </div>
              <div className="text-muted-foreground">Tasa de Aprobación de Inspecciones</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const generateProductivityReport = () => {
    const activeTeams = reportData.teams.filter(t => t.status === 'active');
    const avgRating = activeTeams.length > 0 ? 
      activeTeams.reduce((sum, team) => sum + (team.performance_rating || 0), 0) / activeTeams.length : 0;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{activeTeams.length}</div>
              <div className="text-sm text-muted-foreground">Equipos Trabajando</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{avgRating.toFixed(1)}/5.0</div>
              <div className="text-sm text-muted-foreground">Rating Promedio</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{reportData.workReports.length}</div>
              <div className="text-sm text-muted-foreground">Reportes de Trabajo</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Rendimiento por Equipo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeTeams.map(team => (
                <div key={team.id} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <div className="font-medium">{team.team_name}</div>
                    <div className="text-sm text-muted-foreground">{team.specialty}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{team.performance_rating}/5.0</div>
                    <div className="text-sm text-muted-foreground">
                      {team.members?.length || 0} miembros
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const exportReport = async () => {
    try {
      const reportContent = {
        projectId,
        reportType,
        dateRange,
        generatedAt: new Date().toISOString(),
        data: reportData,
        summary: {
          totalPhases: reportData.phases.length,
          totalTeams: reportData.teams.length,
          totalActivities: reportData.timeline.length,
          totalBudgetItems: reportData.budget.length
        }
      };

      const blob = new Blob([JSON.stringify(reportContent, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte-construccion-${reportType}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Reporte exportado exitosamente");
    } catch (error) {
      console.error("Error exporting report:", error);
      toast.error("Error al exportar el reporte");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Generando reporte...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Reportes de Construcción
              </CardTitle>
              <CardDescription>
                Análisis detallado y reportes del proyecto de construcción
              </CardDescription>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Tipo de reporte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Reporte General
                    </div>
                  </SelectItem>
                  <SelectItem value="progress">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Progreso y Cronograma
                    </div>
                  </SelectItem>
                  <SelectItem value="budget">
                    <div className="flex items-center gap-2">
                      <PieChart className="h-4 w-4" />
                      Análisis Presupuestal
                    </div>
                  </SelectItem>
                  <SelectItem value="quality">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Control de Calidad
                    </div>
                  </SelectItem>
                  <SelectItem value="productivity">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Productividad
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              <Button onClick={exportReport} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              
              <Button onClick={fetchReportData}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Report Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {reportType === 'general' && 'Reporte General del Proyecto'}
            {reportType === 'progress' && 'Reporte de Progreso y Cronograma'}
            {reportType === 'budget' && 'Análisis Presupuestal'}
            {reportType === 'quality' && 'Reporte de Control de Calidad'}
            {reportType === 'productivity' && 'Reporte de Productividad'}
          </CardTitle>
          <CardDescription>
            Período: {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {generateReport()}
        </CardContent>
      </Card>
    </div>
  );
}