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
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  ResponsiveDialog, 
  ResponsiveDialogContent, 
  ResponsiveDialogHeader, 
  ResponsiveDialogTitle 
} from "@/components/ui/responsive-dialog";
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
  totalBudget: number;
}

interface ConstructionDashboardProps {
  projectId: string;
}

export function ConstructionDashboard({ projectId }: ConstructionDashboardProps) {
  const isMobile = useIsMobile();
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
    totalBudget: 0,
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

      // Fetch budget items and project budget
      const { data: budgetItems } = await supabase
        .from("construction_budget_items")
        .select("*")
        .eq("project_id", projectId);

      // Fetch project construction budget
      const { data: projectData } = await supabase
        .from("client_projects")
        .select("construction_budget")
        .eq("id", projectId)
        .single();

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

      // Calcular presupuesto total desde los items del presupuesto (más confiable)
      const calculatedTotalBudget = budgetItems?.reduce((sum, item) => sum + (item.total_price || 0), 0) || 0;
      const projectBudget = projectData?.construction_budget || 0;

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
        totalBudget: calculatedTotalBudget, // Usar el valor calculado directamente desde los items
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
      <div className="space-y-4 sm:space-y-6">
        <div className={`grid grid-cols-1 ${isMobile ? 'sm:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-4'} gap-3 sm:gap-4`}>
          {[...Array(isMobile ? 4 : 8)].map((_, i) => (
            <Card key={i}>
              <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
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
    <div className="space-y-4 sm:space-y-6">
      {/* Key Metrics */}
      <div className={`grid grid-cols-1 ${isMobile ? 'sm:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-4'} gap-3 sm:gap-4`}>
        <Card>
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <div className={`flex items-center ${isMobile ? 'gap-3' : 'gap-4'}`}>
              <Building2 className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-blue-600`} />
              <div className="flex-1 min-w-0">
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-muted-foreground`}>Fases Completadas</p>
                <div className="flex items-center">
                  <p className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold`}>{stats.completedPhases}</p>
                  <p className={`text-muted-foreground ml-2 ${isMobile ? 'text-sm' : ''}`}>/ {stats.totalPhases}</p>
                </div>
                <Progress value={phaseProgress} className={`mt-2 ${isMobile ? 'h-1' : 'h-2'}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <div className={`flex items-center ${isMobile ? 'gap-3' : 'gap-4'}`}>
              <CheckCircle className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-green-600`} />
              <div className="flex-1 min-w-0">
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-muted-foreground`}>Hitos Completados</p>
                <div className="flex items-center">
                  <p className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold`}>{stats.completedMilestones}</p>
                  <p className={`text-muted-foreground ml-2 ${isMobile ? 'text-sm' : ''}`}>/ {stats.totalMilestones}</p>
                </div>
                <Progress value={milestoneProgress} className={`mt-2 ${isMobile ? 'h-1' : 'h-2'}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <div className={`flex items-center ${isMobile ? 'gap-3' : 'gap-4'}`}>
              <DollarSign className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-blue-600`} />
              <div className="flex-1 min-w-0">
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-muted-foreground`}>Presupuesto Total</p>
                <p className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold`}>${stats.totalBudget.toLocaleString()}</p>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                  {stats.totalBudgetItems} partidas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <div className={`flex items-center ${isMobile ? 'gap-3' : 'gap-4'}`}>
              <DollarSign className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-yellow-600`} />
              <div className="flex-1 min-w-0">
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-muted-foreground`}>Presupuesto Ejecutado</p>
                <p className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold`}>${stats.budgetExecuted.toLocaleString()}</p>
                <Progress value={stats.totalBudget > 0 ? (stats.budgetExecuted / stats.totalBudget) * 100 : 0} className={`mt-2 ${isMobile ? 'h-1' : 'h-2'}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <div className={`flex items-center ${isMobile ? 'gap-3' : 'gap-4'}`}>
              <TrendingUp className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-purple-600`} />
              <div className="flex-1 min-w-0">
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-muted-foreground`}>Calidad</p>
                <p className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold`}>{inspectionPassRate.toFixed(1)}%</p>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                  {stats.passedInspections} / {stats.totalInspections} inspecciones
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts and Status */}
      <div className={`grid grid-cols-1 ${isMobile ? 'gap-4' : 'lg:grid-cols-2 gap-6'}`}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Alertas y Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent className={`${isMobile ? 'space-y-2' : 'space-y-3'}`}>
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
          <CardContent className={`${isMobile ? 'space-y-2' : 'space-y-3'}`}>
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
  const isMobile = useIsMobile();
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
        <div className={`grid grid-cols-2 ${isMobile ? 'gap-3' : 'md:grid-cols-4 gap-4'}`}>
          <Dialog open={newPhaseDialog} onOpenChange={setNewPhaseDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className={`${isMobile ? 'h-16 flex-col gap-1' : 'h-20 flex-col gap-2'}`}>
                <Building2 className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
                <span className={`${isMobile ? 'text-xs' : 'text-sm'}`}>Nueva Fase</span>
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
              <Button variant="outline" className={`${isMobile ? 'h-16 flex-col gap-1' : 'h-20 flex-col gap-2'}`}>
                <Calendar className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
                <span className={`${isMobile ? 'text-xs' : 'text-sm'}`}>Programar Hito</span>
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

          <ResponsiveDialog open={newEquipmentDialog} onOpenChange={setNewEquipmentDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className={`${isMobile ? 'h-16 flex-col gap-1' : 'h-20 flex-col gap-2'}`}>
                <Wrench className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
                <span className={`${isMobile ? 'text-xs' : 'text-sm'}`}>Asignar Equipo</span>
              </Button>
            </DialogTrigger>
            <ResponsiveDialogContent maxHeight="90vh">
              <ResponsiveDialogHeader>
                <ResponsiveDialogTitle>Nuevo Equipo</ResponsiveDialogTitle>
              </ResponsiveDialogHeader>
              <EquipmentForm
                projectId={projectId}
                onSuccess={() => {
                  setNewEquipmentDialog(false);
                  onStatsRefresh();
                }}
                onCancel={() => setNewEquipmentDialog(false)}
              />
            </ResponsiveDialogContent>
          </ResponsiveDialog>

          <Dialog open={uploadPhotoDialog} onOpenChange={setUploadPhotoDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className={`${isMobile ? 'h-16 flex-col gap-1' : 'h-20 flex-col gap-2'}`}>
                <Camera className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
                <span className={`${isMobile ? 'text-xs' : 'text-sm'}`}>Subir Foto</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[85vh]">
              <div className="flex flex-col h-full">
                <DialogHeader className="flex-shrink-0 pb-4">
                  <DialogTitle>Subir Foto de Progreso</DialogTitle>
                  <DialogDescription>
                    Agregar fotos del avance de la construcción
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto px-1">
                  <ProgressPhotoForm
                    projectId={projectId}
                    onSuccess={() => {
                      setUploadPhotoDialog(false);
                      onStatsRefresh();
                    }}
                    onCancel={() => setUploadPhotoDialog(false)}
                    showButtons={false}
                  />
                </div>
                <div className="flex-shrink-0 flex justify-end gap-3 pt-4 border-t bg-background">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setUploadPhotoDialog(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    form="progress-photo-form"
                    className="min-w-[120px]"
                  >
                    Subir Fotos
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}