import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Play, Pause, CheckCircle, AlertTriangle, Calendar, Clock, User, Camera } from 'lucide-react';
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

interface GanttActivity {
  id: string;
  activity_name: string;
  planned_start_date: string;
  planned_end_date: string;
  status: string;
  progress_percentage: number;
  actual_start_date?: string;
  actual_end_date?: string;
  delay_reason?: string;
  notes?: string;
  responsible_user_id?: string;
  evidence_photos: string[];
}

interface ConstructionScheduleProps {
  projectId: string;
  clientId: string;
}

const statusConfig = {
  not_started: { label: 'No iniciado', icon: Calendar, color: 'bg-muted', textColor: 'text-muted-foreground' },
  in_progress: { label: 'En proceso', icon: Play, color: 'bg-blue-500', textColor: 'text-white' },
  blocked: { label: 'Bloqueado', icon: AlertTriangle, color: 'bg-red-500', textColor: 'text-white' },
  completed: { label: 'Terminado', icon: CheckCircle, color: 'bg-green-500', textColor: 'text-white' },
};

export const ConstructionSchedule: React.FC<ConstructionScheduleProps> = ({
  projectId,
  clientId
}) => {
  const [activities, setActivities] = useState<GanttActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<GanttActivity | null>(null);
  const [notes, setNotes] = useState('');
  const [delayReason, setDelayReason] = useState('');
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterWeek, setFilterWeek] = useState<string>('all');

  useEffect(() => {
    fetchActivities();
  }, [projectId]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      
      // Obtener cronograma de Planeación
      const { data: cronogramaData, error: cronogramaError } = await supabase
        .from('cronograma_matriz')
        .select('*')
        .eq('project_id', projectId);

      if (cronogramaError) throw cronogramaError;

      // Obtener logs de actividades
      const { data: logsData } = await supabase
        .from('gantt_activity_log')
        .select('*')
        .eq('project_id', projectId);

      // Combinar datos del cronograma con logs
      const combinedActivities = cronogramaData?.map(item => {
        const log = logsData?.find(l => l.activity_reference === item.id);
        
        return {
          id: item.id,
          activity_name: item.concepto,
          planned_start_date: item.inicio_actividad || '',
          planned_end_date: item.fin_actividad || '',
          status: log?.status || 'not_started',
          progress_percentage: log?.progress_percentage || 0,
          actual_start_date: log?.actual_start_date,
          actual_end_date: log?.actual_end_date,
          delay_reason: log?.delay_reason,
          notes: log?.notes,
          responsible_user_id: log?.responsible_user_id,
          evidence_photos: log?.evidence_photos || []
        };
      }) || [];

      setActivities(combinedActivities);
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast.error('Error al cargar el cronograma');
    } finally {
      setLoading(false);
    }
  };

  const updateActivityStatus = async (activityId: string, newStatus: string) => {
    try {
      const activity = activities.find(a => a.id === activityId);
      if (!activity) return;

      const updateData: any = {
        project_id: projectId,
        client_id: clientId,
        activity_name: activity.activity_name,
        activity_reference: activityId,
        status: newStatus,
        progress_percentage: newStatus === 'completed' ? 100 : progressPercentage,
        planned_start_date: activity.planned_start_date,
        planned_end_date: activity.planned_end_date,
      };

      if (newStatus === 'in_progress' && !activity.actual_start_date) {
        updateData.actual_start_date = new Date().toISOString().split('T')[0];
      }

      if (newStatus === 'completed') {
        updateData.actual_end_date = new Date().toISOString().split('T')[0];
        updateData.progress_percentage = 100;
      }

      if (notes) updateData.notes = notes;
      if (delayReason) updateData.delay_reason = delayReason;

      const { error } = await supabase
        .from('gantt_activity_log')
        .upsert(updateData);

      if (error) throw error;

      toast.success('Estado de actividad actualizado');
      fetchActivities();
      setNotes('');
      setDelayReason('');
      setProgressPercentage(0);
    } catch (error) {
      console.error('Error updating activity status:', error);
      toast.error('Error al actualizar estado');
    }
  };

  const addActivityNote = async (activityId: string) => {
    if (!notes.trim()) return;

    try {
      const activity = activities.find(a => a.id === activityId);
      if (!activity) return;

      const { error } = await supabase
        .from('gantt_activity_log')
        .upsert({
          project_id: projectId,
          client_id: clientId,
          activity_name: activity.activity_name,
          activity_reference: activityId,
          status: activity.status,
          progress_percentage: activity.progress_percentage,
          planned_start_date: activity.planned_start_date,
          planned_end_date: activity.planned_end_date,
          notes: notes,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      toast.success('Nota agregada');
      setNotes('');
      fetchActivities();
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Error al agregar nota');
    }
  };

  const markAsCompleted = async (activityId: string) => {
    await updateActivityStatus(activityId, 'completed');
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
  const getDelayDays = (activity: GanttActivity) => {
    if (activity.status === 'completed' && activity.actual_end_date) {
      const planned = new Date(activity.planned_end_date);
      const actual = new Date(activity.actual_end_date);
      return Math.ceil((actual.getTime() - planned.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    if (activity.status === 'in_progress') {
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
                        className={`${statusConfig[activity.status as keyof typeof statusConfig]?.color} ${statusConfig[activity.status as keyof typeof statusConfig]?.textColor}`}
                      >
                        {StatusIcon && <StatusIcon className="h-3 w-3 mr-1" />}
                        {statusConfig[activity.status as keyof typeof statusConfig]?.label}
                      </Badge>
                      
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

                              {/* Porcentaje de progreso */}
                              {selectedActivity.status === 'in_progress' && (
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Actualizar Progreso (%)</label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={progressPercentage}
                                    onChange={(e) => setProgressPercentage(Number(e.target.value))}
                                    placeholder="0-100"
                                  />
                                </div>
                              )}

                              {/* Causa de retraso */}
                              {getDelayDays(selectedActivity) > 0 && (
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-red-600">Causa del Retraso</label>
                                  <Textarea
                                    placeholder="Describir la causa del retraso..."
                                    value={delayReason}
                                    onChange={(e) => setDelayReason(e.target.value)}
                                  />
                                </div>
                              )}

                              {/* Notas */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Notas de Campo</label>
                                <Textarea
                                  placeholder="Agregar observaciones..."
                                  value={notes}
                                  onChange={(e) => setNotes(e.target.value)}
                                />
                                <Button 
                                  onClick={() => addActivityNote(selectedActivity.id)}
                                  disabled={!notes.trim()}
                                  size="sm"
                                >
                                  Agregar Nota
                                </Button>
                              </div>

                              {/* Acciones rápidas */}
                              <div className="space-y-2">
                                <h4 className="font-medium">Acciones Rápidas</h4>
                                <div className="grid grid-cols-2 gap-2">
                                  {selectedActivity.status !== 'completed' && (
                                    <Button 
                                      onClick={() => markAsCompleted(selectedActivity.id)}
                                      className="w-full"
                                      variant="default"
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Marcar Terminada
                                    </Button>
                                  )}
                                  <Button 
                                    variant="outline"
                                    className="w-full"
                                  >
                                    <Camera className="h-4 w-4 mr-2" />
                                    Subir Evidencia
                                  </Button>
                                </div>
                              </div>

                              {/* Notas existentes */}
                              {selectedActivity.notes && (
                                <div className="space-y-2">
                                  <h4 className="font-medium">Notas Existentes</h4>
                                  <div className="p-3 border rounded-lg bg-muted/50">
                                    <p className="text-sm">{selectedActivity.notes}</p>
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
                      <span>Progreso</span>
                      <span>{activity.progress_percentage}%</span>
                    </div>
                    <Progress value={activity.progress_percentage} className="h-2" />
                  </div>

                  {/* Notas si existen */}
                  {activity.notes && (
                    <div className="text-sm text-muted-foreground border-l-2 border-primary pl-3">
                      <strong>Notas:</strong> {activity.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};