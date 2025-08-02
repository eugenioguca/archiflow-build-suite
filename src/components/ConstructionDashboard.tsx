import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Calendar, 
  DollarSign, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  TrendingUp,
  Wrench,
  Camera
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EquipmentForm } from "@/components/forms/EquipmentForm";
import { ConstructionPhaseForm } from "@/components/forms/ConstructionPhaseForm";
import { ConstructionMilestoneForm } from "@/components/forms/ConstructionMilestoneForm";
import { ProgressPhotoForm } from "@/components/forms/ProgressPhotoForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ConstructionStats {
  totalPhases: number;
  completedPhases: number;
  activePhases: number;
  totalMilestones: number;
  completedMilestones: number;
  overdueMilestones: number;
  totalBudgetItems: number;
  completedBudgetItems: number;
  totalEquipment: number;
  activeEquipment: number;
  totalInspections: number;
  passedInspections: number;
  failedInspections: number;
  totalWorkReports: number;
  thisWeekReports: number;
  budgetExecuted: number;
  budgetRemaining: number;
}

interface ConstructionDashboardProps {
  projectId: string;
}

export function ConstructionDashboard({ projectId }: ConstructionDashboardProps) {
  const [stats, setStats] = useState<ConstructionStats>({
    totalPhases: 0,
    completedPhases: 0,
    activePhases: 0,
    totalMilestones: 0,
    completedMilestones: 0,
    overdueMilestones: 0,
    totalBudgetItems: 0,
    completedBudgetItems: 0,
    totalEquipment: 0,
    activeEquipment: 0,
    totalInspections: 0,
    passedInspections: 0,
    failedInspections: 0,
    totalWorkReports: 0,
    thisWeekReports: 0,
    budgetExecuted: 0,
    budgetRemaining: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConstructionStats();
  }, [projectId]);

  const fetchConstructionStats = async () => {
    try {
      setLoading(true);

      // Fetch phases
      const { data: phases } = await supabase
        .from("construction_phases")
        .select("*")
        .eq("project_id", projectId);

      // Fetch milestones
      const { data: milestones } = await supabase
        .from("construction_milestones")
        .select("*")
        .eq("project_id", projectId);

      // Fetch budget items
      const { data: budgetItems } = await supabase
        .from("construction_budget_items")
        .select("*")
        .eq("project_id", projectId);

      // Fetch equipment
      const { data: equipment } = await supabase
        .from("construction_equipment")
        .select("*")
        .eq("project_id", projectId);

      // Fetch inspections
      const { data: inspections } = await supabase
        .from("quality_inspections")
        .select("*")
        .eq("project_id", projectId);

      // Fetch work reports
      const { data: workReports } = await supabase
        .from("work_reports")
        .select("*")
        .eq("project_id", projectId);

      // Calculate stats
      const currentDate = new Date();
      const oneWeekAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);

      const newStats: ConstructionStats = {
        totalPhases: phases?.length || 0,
        completedPhases: phases?.filter(p => p.status === 'completed').length || 0,
        activePhases: phases?.filter(p => p.status === 'in_progress').length || 0,
        totalMilestones: milestones?.length || 0,
        completedMilestones: milestones?.filter(m => m.status === 'completed').length || 0,
        overdueMilestones: milestones?.filter(m => 
          m.status !== 'completed' && 
          new Date(m.target_date) < currentDate
        ).length || 0,
        totalBudgetItems: budgetItems?.length || 0,
        completedBudgetItems: budgetItems?.filter(b => b.status === 'completed').length || 0,
        totalEquipment: equipment?.length || 0,
        activeEquipment: equipment?.filter(e => e.status === 'in_use').length || 0,
        totalInspections: inspections?.length || 0,
        passedInspections: inspections?.filter(i => i.status === 'passed').length || 0,
        failedInspections: inspections?.filter(i => i.status === 'failed').length || 0,
        totalWorkReports: workReports?.length || 0,
        thisWeekReports: workReports?.filter(w => 
          new Date(w.report_date) >= oneWeekAgo
        ).length || 0,
        budgetExecuted: budgetItems?.reduce((sum, item) => sum + (item.executed_amount || 0), 0) || 0,
        budgetRemaining: budgetItems?.reduce((sum, item) => sum + (item.total_price - (item.executed_amount || 0)), 0) || 0,
      };

      setStats(newStats);
    } catch (error) {
      console.error("Error fetching construction stats:", error);
      toast.error("Error al cargar las estadísticas de construcción");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const phaseProgress = stats.totalPhases > 0 ? (stats.completedPhases / stats.totalPhases) * 100 : 0;
  const milestoneProgress = stats.totalMilestones > 0 ? (stats.completedMilestones / stats.totalMilestones) * 100 : 0;
  const budgetProgress = stats.totalBudgetItems > 0 ? (stats.completedBudgetItems / stats.totalBudgetItems) * 100 : 0;
  const inspectionPassRate = stats.totalInspections > 0 ? (stats.passedInspections / stats.totalInspections) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Fases Completadas</p>
                <div className="flex items-center">
                  <p className="text-2xl font-bold">{stats.completedPhases}</p>
                  <p className="text-muted-foreground ml-2">/ {stats.totalPhases}</p>
                </div>
                <Progress value={phaseProgress} className="mt-2 h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Hitos Completados</p>
                <div className="flex items-center">
                  <p className="text-2xl font-bold">{stats.completedMilestones}</p>
                  <p className="text-muted-foreground ml-2">/ {stats.totalMilestones}</p>
                </div>
                <Progress value={milestoneProgress} className="mt-2 h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Presupuesto Ejecutado</p>
                <p className="text-2xl font-bold">${stats.budgetExecuted.toLocaleString()}</p>
                <Progress value={budgetProgress} className="mt-2 h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Calidad</p>
                <p className="text-2xl font-bold">{inspectionPassRate.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">
                  {stats.passedInspections} / {stats.totalInspections} inspecciones
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts and Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Alertas y Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.overdueMilestones > 0 && (
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Hitos vencidos</span>
                </div>
                <Badge variant="destructive">{stats.overdueMilestones}</Badge>
              </div>
            )}
            
            {stats.failedInspections > 0 && (
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">Inspecciones fallidas</span>
                </div>
                <Badge variant="destructive">{stats.failedInspections}</Badge>
              </div>
            )}

            {stats.activePhases === 0 && stats.totalPhases > 0 && (
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium">Sin fases activas</span>
                </div>
                <Badge variant="outline">Revisar</Badge>
              </div>
            )}

            {stats.overdueMilestones === 0 && stats.failedInspections === 0 && stats.activePhases > 0 && (
              <div className="text-center text-muted-foreground py-4">
                <CheckCircle className="h-8 w-8 mx-auto text-green-600 mb-2" />
                <p>Todo en orden</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Actividad Reciente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Equipos activos</span>
              </div>
              <Badge variant="secondary">{stats.activeEquipment}</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Reportes esta semana</span>
              </div>
              <Badge variant="secondary">{stats.thisWeekReports}</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Fases activas</span>
              </div>
              <Badge variant="secondary">{stats.activePhases}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <QuickActions projectId={projectId} onStatsRefresh={fetchConstructionStats} />
    </div>
  );
}

interface QuickActionsProps {
  projectId: string;
  onStatsRefresh: () => void;
}

function QuickActions({ projectId, onStatsRefresh }: QuickActionsProps) {
  const [newPhaseDialog, setNewPhaseDialog] = useState(false);
  const [newMilestoneDialog, setNewMilestoneDialog] = useState(false);
  const [newEquipmentDialog, setNewEquipmentDialog] = useState(false);
  const [uploadPhotoDialog, setUploadPhotoDialog] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Acciones Rápidas</CardTitle>
        <CardDescription>
          Accesos directos a las funcionalidades más utilizadas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Dialog open={newPhaseDialog} onOpenChange={setNewPhaseDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <Building2 className="h-6 w-6" />
                <span className="text-sm">Nueva Fase</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nueva Fase de Construcción</DialogTitle>
                <DialogDescription>
                  Crear una nueva fase para organizar las actividades del proyecto
                </DialogDescription>
              </DialogHeader>
              <ConstructionPhaseForm
                projectId={projectId}
                onSuccess={() => {
                  setNewPhaseDialog(false);
                  onStatsRefresh();
                }}
                onCancel={() => setNewPhaseDialog(false)}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={newMilestoneDialog} onOpenChange={setNewMilestoneDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <Calendar className="h-6 w-6" />
                <span className="text-sm">Programar Hito</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nuevo Hito</DialogTitle>
                <DialogDescription>
                  Programar un nuevo hito importante en el cronograma
                </DialogDescription>
              </DialogHeader>
              <ConstructionMilestoneForm
                projectId={projectId}
                onSuccess={() => {
                  setNewMilestoneDialog(false);
                  onStatsRefresh();
                }}
                onCancel={() => setNewMilestoneDialog(false)}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={newEquipmentDialog} onOpenChange={setNewEquipmentDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <Wrench className="h-6 w-6" />
                <span className="text-sm">Asignar Equipo</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nuevo Equipo</DialogTitle>
                <DialogDescription>
                  Agregar un nuevo equipo al inventario del proyecto
                </DialogDescription>
              </DialogHeader>
              <EquipmentForm
                projectId={projectId}
                onSuccess={() => {
                  setNewEquipmentDialog(false);
                  onStatsRefresh();
                }}
                onCancel={() => setNewEquipmentDialog(false)}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={uploadPhotoDialog} onOpenChange={setUploadPhotoDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <Camera className="h-6 w-6" />
                <span className="text-sm">Subir Foto</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Subir Foto de Progreso</DialogTitle>
                <DialogDescription>
                  Agregar fotos del avance de la construcción
                </DialogDescription>
              </DialogHeader>
              <ProgressPhotoForm
                projectId={projectId}
                onSuccess={() => {
                  setUploadPhotoDialog(false);
                  onStatsRefresh();
                }}
                onCancel={() => setUploadPhotoDialog(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}