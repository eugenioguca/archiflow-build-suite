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
      
      // Por ahora usaremos datos simulados hasta que esté la integración con cronograma
      const mockActivities: GanttActivity[] = [
        {
          id: '1',
          activity_name: 'Excavación y cimentación',
          planned_start_date: '2024-01-15',
          planned_end_date: '2024-01-30',
          status: 'completed',
          progress_percentage: 100,
          actual_start_date: '2024-01-15',
          actual_end_date: '2024-01-28',
          notes: 'Completado sin retrasos',
          evidence_photos: []
        },
        {
          id: '2',
          activity_name: 'Construcción de muros',
          planned_start_date: '2024-02-01',
          planned_end_date: '2024-02-20',
          status: 'in_progress',
          progress_percentage: 65,
          actual_start_date: '2024-02-01',
          notes: 'En progreso normal',
          evidence_photos: []
        },
        {
          id: '3',
          activity_name: 'Instalación eléctrica',
          planned_start_date: '2024-02-15',
          planned_end_date: '2024-03-05',
          status: 'not_started',
          progress_percentage: 0,
          evidence_photos: []
        }
      ];

      setActivities(mockActivities);
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast.error('Error al cargar el cronograma');
    } finally {
      setLoading(false);
    }
  };

  const updateActivityStatus = async (activityId: string, newStatus: string) => {
    try {
      // TODO: Implementar actualización real en base de datos
      const updatedActivities = activities.map(activity => {
        if (activity.id === activityId) {
          const updated = { ...activity, status: newStatus };
          
          if (newStatus === 'in_progress' && !activity.actual_start_date) {
            updated.actual_start_date = new Date().toISOString().split('T')[0];
          }
          
          if (newStatus === 'completed') {
            updated.actual_end_date = new Date().toISOString().split('T')[0];
            updated.progress_percentage = 100;
          }
          
          if (notes) updated.notes = notes;
          if (delayReason) updated.delay_reason = delayReason;
          
          return updated;
        }
        return activity;
      });
      
      setActivities(updatedActivities);
      toast.success('Estado de actividad actualizado');
      setNotes('');
      setDelayReason('');
      setProgressPercentage(0);
    } catch (error) {
      console.error('Error updating activity status:', error);
      toast.error('Error al actualizar estado');
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

                                {selectedActivity.status === 'blocked' && (
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

                                <div className="flex gap-2">
                                  {selectedActivity.status !== 'completed' && (
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