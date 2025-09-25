import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Play, Pause, CheckCircle, AlertTriangle, Calendar, Clock, User, Camera, Package, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getGanttByProject, getGanttConstructionStatus, type GanttConstructionActivity } from '@/services/planning/getGanttByProject';

interface ConstructionActivity {
  id: string;
  source_activity_id: string;
  activity_name: string;
  mayor_name: string;
  mayor_id: string;
  planned_start_date: string;
  planned_end_date: string;
  status: 'no_iniciado' | 'en_proceso' | 'bloqueado' | 'terminado';
  progress_percentage: number;
  actual_start_date?: string;
  actual_end_date?: string;
  delay_reason?: string;
  notes?: string;
  amount: number;
  material_readiness?: 'solicitado' | 'listo' | 'pendiente';
}

interface ConstructionScheduleProps {
  projectId: string;
  clientId: string;
}

const statusConfig = {
  no_iniciado: { label: 'No iniciado', icon: Calendar, color: 'bg-muted', textColor: 'text-muted-foreground' },
  en_proceso: { label: 'En proceso', icon: Play, color: 'bg-blue-500', textColor: 'text-white' },
  bloqueado: { label: 'Bloqueado', icon: AlertTriangle, color: 'bg-red-500', textColor: 'text-white' },
  terminado: { label: 'Terminado', icon: CheckCircle, color: 'bg-green-500', textColor: 'text-white' },
};

const materialReadinessConfig = {
  pendiente: { label: 'Pendiente', icon: Package, color: 'bg-red-100 text-red-700' },
  solicitado: { label: 'Solicitado', icon: Clock, color: 'bg-yellow-100 text-yellow-700' },
  listo: { label: 'Listo', icon: CheckCircle, color: 'bg-green-100 text-green-700' },
};

export const ConstructionSchedule: React.FC<ConstructionScheduleProps> = ({
  projectId,
  clientId
}) => {
  const [activities, setActivities] = useState<ConstructionActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<ConstructionActivity | null>(null);
  const [notes, setNotes] = useState('');
  const [delayReason, setDelayReason] = useState('');
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterWeek, setFilterWeek] = useState<string>('all');
  const [materialAlerts, setMaterialAlerts] = useState<any[]>([]);

  useEffect(() => {
    fetchActivities();
  }, [projectId]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      
      // Get planning gantt activities
      const planningActivities = await getGanttByProject(projectId, clientId);
      
      // Get construction status for each activity
      const constructionStatus = await getGanttConstructionStatus(projectId);
      
      // Get material readiness
      const materialReadiness = await getMaterialReadiness(projectId);
      
      // Combine planning data with construction status
      const constructionActivities: ConstructionActivity[] = planningActivities.map(activity => {
        const status = constructionStatus[activity.id];
        const readiness = materialReadiness[activity.mayor_id];
        
        return {
          id: activity.id,
          source_activity_id: activity.id,
          activity_name: activity.nombre_actividad,
          mayor_name: activity.mayor?.nombre || 'Sin mayor',
          mayor_id: activity.mayor_id,
          planned_start_date: activity.start_date_plan || '',
          planned_end_date: activity.end_date_plan || '',
          status: status?.estado || 'no_iniciado',
          progress_percentage: status?.avance_real_pct || 0,
          actual_start_date: status?.start_real,
          actual_end_date: status?.end_real,
          delay_reason: status?.causa_retraso,
          notes: status?.nota,
          amount: activity.amount,
          material_readiness: readiness
        };
      });

      setActivities(constructionActivities);
      
      // Check for material alerts
      await checkMaterialAlerts(constructionActivities);
      
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast.error('Error al cargar el cronograma: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const getMaterialReadiness = async (projectId: string): Promise<Record<string, 'solicitado' | 'listo' | 'pendiente'>> => {
    try {
      // Query construction budget rollups to check material status
      const { data: rollups, error } = await supabase
        .from('v_construction_budget_rollup')
        .select('mayor_id, allocated_amount, remaining_amount')
        .eq('project_id', projectId);

      if (error) throw error;

      const readiness: Record<string, 'solicitado' | 'listo' | 'pendiente'> = {};
      
      (rollups || []).forEach(rollup => {
        const allocatedPct = rollup.allocated_amount / (rollup.allocated_amount + rollup.remaining_amount) * 100;
        
        if (allocatedPct >= 80) {
          // Check if materials are delivered (would need TU integration)
          readiness[rollup.mayor_id] = 'solicitado';
        } else {
          readiness[rollup.mayor_id] = 'pendiente';
        }
      });

      return readiness;
    } catch (error) {
      console.error('Error checking material readiness:', error);
      return {};
    }
  };

  const checkMaterialAlerts = async (activities: ConstructionActivity[]) => {
    const today = new Date();
    const alertThreshold = new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000); // +4 days

    const alerts = activities.filter(activity => {
      const startDate = new Date(activity.planned_start_date);
      return startDate <= alertThreshold && activity.material_readiness === 'pendiente';
    });

    setMaterialAlerts(alerts);
  };

  const updateActivityStatus = async (activityId: string, newStatus: 'no_iniciado' | 'en_proceso' | 'bloqueado' | 'terminado') => {
    try {
      const activity = activities.find(a => a.id === activityId);
      if (!activity) return;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const logData: any = {
        project_id: projectId,
        source_activity_id: activityId,
        estado: newStatus,
        avance_real_pct: newStatus === 'terminado' ? 100 : progressPercentage || activity.progress_percentage,
        usuario_id: user.id
      };

      if (newStatus === 'en_proceso' && !activity.actual_start_date) {
        logData.start_real = new Date().toISOString().split('T')[0];
      }

      if (newStatus === 'terminado') {
        logData.end_real = new Date().toISOString().split('T')[0];
        logData.avance_real_pct = 100;
      }

      if (notes) logData.nota = notes;
      if (delayReason) logData.causa_retraso = delayReason;

      // Insert log entry
      const { error } = await supabase
        .from('gantt_activity_log')
        .insert([logData]);

      if (error) throw error;

      // Refresh activities
      await fetchActivities();
      
      toast.success('Estado de actividad actualizado');
      setNotes('');
      setDelayReason('');
      setProgressPercentage(0);
    } catch (error) {
      console.error('Error updating activity status:', error);
      toast.error('Error al actualizar estado: ' + (error as Error).message);
    }
  };

  const markAsCompleted = async (activityId: string) => {
    await updateActivityStatus(activityId, 'terminado');
  };

  // Filtros
  const filteredActivities = activities.filter(activity => {
    const matchesStatus = filterStatus === 'all' || activity.status === filterStatus;
    
    let matchesWeek = true;
    if (filterWeek !== 'all') {
      const now = new Date();
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
      
      const activityStart = new Date(activity.planned_start_date);
      const activityEnd = new Date(activity.planned_end_date);
      
      if (filterWeek === 'current_week') {
        matchesWeek = (activityStart >= startOfWeek && activityStart <= endOfWeek) ||
                     (activityEnd >= startOfWeek && activityEnd <= endOfWeek) ||
                     (activityStart <= startOfWeek && activityEnd >= endOfWeek);
      }
    }
    
    return matchesStatus && matchesWeek;
  });

  // Calcular retrasos
  const getDelayDays = (activity: ConstructionActivity) => {
    if (activity.status === 'terminado' && activity.actual_end_date) {
      const planned = new Date(activity.planned_end_date);
      const actual = new Date(activity.actual_end_date);
      return Math.ceil((actual.getTime() - planned.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    if (activity.status === 'en_proceso') {
      const planned = new Date(activity.planned_end_date);
      const today = new Date();
      if (today > planned) {
        return Math.ceil((today.getTime() - planned.getTime()) / (1000 * 60 * 60 * 24));
      }
    }
    
    return 0;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Material Alerts */}
      {materialAlerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <Package className="h-5 w-5" />
              Materiales por solicitar (próximos 7 días)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {materialAlerts.map(activity => (
                <div key={activity.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <p className="font-medium">{activity.activity_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Inicia: {format(new Date(activity.planned_start_date), 'dd/MMM/yyyy', { locale: es })}
                    </p>
                  </div>
                  <Button size="sm" className="gap-2">
                    <Wrench className="h-4 w-4" />
                    Solicitar materiales
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros y controles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Cronograma de Construcción
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {Object.entries(statusConfig).map(([value, config]) => (
                  <SelectItem key={value} value={value}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterWeek} onValueChange={setFilterWeek}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por tiempo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las actividades</SelectItem>
                <SelectItem value="current_week">Semana actual</SelectItem>
                <SelectItem value="overdue">Retrasadas</SelectItem>
                <SelectItem value="critical">Críticas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Resumen */}
          <div className="grid grid-cols-4 gap-4">
            {Object.entries(statusConfig).map(([status, config]) => {
              const count = activities.filter(a => a.status === status).length;
              const StatusIcon = config.icon;
              return (
                <div key={status} className="flex items-center gap-2 p-3 border rounded-lg">
                  <div className={`p-2 rounded ${config.color}`}>
                    <StatusIcon className={`h-4 w-4 ${config.textColor}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{count}</p>
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Lista de actividades */}
      <Card>
        <CardContent className="p-0">
          <div className="space-y-2 p-4">
            {filteredActivities.map((activity) => {
              const StatusIcon = statusConfig[activity.status as keyof typeof statusConfig]?.icon;
              const delayDays = getDelayDays(activity);
              
              return (
                <div key={activity.id} className="border rounded-lg p-4 space-y-3">
                  {/* Header de actividad */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{activity.activity_name}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span>Inicio: {format(new Date(activity.planned_start_date), 'dd/MMM/yyyy', { locale: es })}</span>
                        <span>Fin: {format(new Date(activity.planned_end_date), 'dd/MMM/yyyy', { locale: es })}</span>
                        {delayDays > 0 && (
                          <span className="text-red-500 font-medium">
                            Retraso: {delayDays} días
                          </span>
                        )}
                      </div>
                    </div>
                    
                  <div className="flex items-center gap-3">
                      <Badge 
                        variant="secondary" 
                        className={`${statusConfig[activity.status]?.color} ${statusConfig[activity.status]?.textColor}`}
                      >
                        {StatusIcon && <StatusIcon className="h-3 w-3 mr-1" />}
                        {statusConfig[activity.status]?.label}
                      </Badge>
                      
                      {activity.material_readiness && (
                        <Badge 
                          variant="outline" 
                          className={materialReadinessConfig[activity.material_readiness]?.color}
                        >
                          <Package className="h-3 w-3 mr-1" />
                          {materialReadinessConfig[activity.material_readiness]?.label}
                        </Badge>
                      )}
                      
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedActivity(activity)}
                          >
                            Control
                          </Button>
                        </SheetTrigger>
                        <SheetContent>
                          <SheetHeader>
                            <SheetTitle>Control de Actividad</SheetTitle>
                          </SheetHeader>
                          
                          {selectedActivity && (
                            <div className="space-y-6 mt-6">
                              {/* Información básica */}
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">Actividad</label>
                                  <p className="text-sm text-muted-foreground">{selectedActivity.activity_name}</p>
                                  <p className="text-xs text-muted-foreground">Mayor: {selectedActivity.mayor_name}</p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium">Inicio Planeado</label>
                                    <p className="text-sm">{format(new Date(selectedActivity.planned_start_date), 'dd/MMM/yyyy', { locale: es })}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Fin Planeado</label>
                                    <p className="text-sm">{format(new Date(selectedActivity.planned_end_date), 'dd/MMM/yyyy', { locale: es })}</p>
                                  </div>
                                </div>

                                {selectedActivity.actual_start_date && (
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-sm font-medium">Inicio Real</label>
                                      <p className="text-sm">{format(new Date(selectedActivity.actual_start_date), 'dd/MMM/yyyy', { locale: es })}</p>
                                    </div>
                                    {selectedActivity.actual_end_date && (
                                      <div>
                                        <label className="text-sm font-medium">Fin Real</label>
                                        <p className="text-sm">{format(new Date(selectedActivity.actual_end_date), 'dd/MMM/yyyy', { locale: es })}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Progreso */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <label className="text-sm font-medium">Progreso</label>
                                  <span className="text-sm">{selectedActivity.progress_percentage}%</span>
                                </div>
                                <Progress value={selectedActivity.progress_percentage} className="h-2" />
                              </div>

                              {/* Estado */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Estado de la Actividad</label>
                                <Select 
                                  value={selectedActivity.status} 
                                  onValueChange={(value) => updateActivityStatus(selectedActivity.id, value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(statusConfig).map(([value, config]) => (
                                      <SelectItem key={value} value={value}>
                                        {config.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Notas y acciones */}
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Agregar Nota</label>
                                  <Textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Escribir anotación sobre la actividad..."
                                    className="min-h-[80px]"
                                  />
                                </div>

                                {selectedActivity.status === 'bloqueado' && (
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Causa del Bloqueo</label>
                                    <Textarea
                                      value={delayReason}
                                      onChange={(e) => setDelayReason(e.target.value)}
                                      placeholder="Describir la causa del bloqueo..."
                                      className="min-h-[60px]"
                                    />
                                  </div>
                                )}
                                
                                {/* Material Readiness */}
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Estado de Materiales</label>
                                  <div className="flex items-center gap-2">
                                    {selectedActivity.material_readiness && (
                                      <Badge 
                                        variant="outline" 
                                        className={materialReadinessConfig[selectedActivity.material_readiness]?.color}
                                      >
                                        <Package className="h-3 w-3 mr-1" />
                                        {materialReadinessConfig[selectedActivity.material_readiness]?.label}
                                      </Badge>
                                    )}
                                    <Button variant="outline" size="sm" className="gap-2">
                                      <Wrench className="h-4 w-4" />
                                      Solicitar materiales
                                    </Button>
                                  </div>
                                </div>

                                <div className="flex gap-2">
                                  {selectedActivity.status !== 'terminado' && (
                                    <Button 
                                      onClick={() => markAsCompleted(selectedActivity.id)}
                                      className="flex-1"
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Marcar como Terminado
                                    </Button>
                                  )}
                                  
                                  <Button 
                                    variant="outline" 
                                    onClick={() => toast.info('Funcionalidad de fotos próximamente')}
                                    className="flex-1"
                                  >
                                    <Camera className="h-4 w-4 mr-2" />
                                    Subir Evidencia
                                  </Button>
                                </div>
                              </div>

                              {/* Notas existentes */}
                              {selectedActivity.notes && (
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Notas Anteriores</label>
                                  <div className="p-3 bg-muted rounded text-sm">
                                    {selectedActivity.notes}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </SheetContent>
                      </Sheet>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>Progreso de la actividad</span>
                      <span>{activity.progress_percentage}%</span>
                    </div>
                    <Progress value={activity.progress_percentage} className="h-1" />
                  </div>

                  {/* Acciones rápidas */}
                  <div className="flex items-center gap-2">
                    {activity.status === 'not_started' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => updateActivityStatus(activity.id, 'in_progress')}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Iniciar
                      </Button>
                    )}
                    
                    {activity.status === 'in_progress' && (
                      <Button 
                        size="sm" 
                        onClick={() => markAsCompleted(activity.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Terminar
                      </Button>
                    )}
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => toast.info('Funcionalidad de notas próximamente')}
                    >
                      <Clock className="h-4 w-4 mr-1" />
                      Nota Rápida
                    </Button>
                  </div>
                </div>
              );
            })}

            {filteredActivities.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay actividades</h3>
                <p className="text-muted-foreground mb-4">
                  {filterStatus === 'all' 
                    ? "No se han encontrado actividades del cronograma para este proyecto."
                    : `No hay actividades con estado "${statusConfig[filterStatus as keyof typeof statusConfig]?.label}".`
                  }
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};