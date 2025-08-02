import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Plus, Filter, Download, Link, AlertTriangle, BarChart3, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TimelineActivityForm } from "@/components/forms/TimelineActivityForm";
import { toast } from "sonner";

interface TimelineActivity {
  id: string;
  activity_name: string;
  activity_code: string;
  activity_type: string;
  estimated_start_date: string | null;
  estimated_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  estimated_duration_days: number;
  actual_duration_days: number;
  progress_percentage: number;
  critical_path: boolean;
  status: string;
  priority: string;
  phase_id: string | null;
  assigned_team_id: string | null;
  predecessor_activities: any[];
  successor_activities: any[];
  total_float_days: number;
  free_float_days: number;
  resource_requirements: any;
  cost_budget: number;
  cost_actual: number;
  notes: string | null;
}

interface ConstructionGanttAdvancedProps {
  projectId: string;
}

export function ConstructionGanttAdvanced({ projectId }: ConstructionGanttAdvancedProps) {
  const [activities, setActivities] = useState<TimelineActivity[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'days' | 'weeks' | 'months'>('weeks');
  const [showCriticalPath, setShowCriticalPath] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<TimelineActivity | null>(null);
  const [draggedActivity, setDraggedActivity] = useState<string | null>(null);
  const ganttRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from("construction_timeline")
        .select("*")
        .eq("project_id", projectId)
        .order("activity_order");

      if (activitiesError) throw activitiesError;

      // Fetch teams
      const { data: teamsData, error: teamsError } = await supabase
        .from("construction_teams")
        .select("*")
        .eq("project_id", projectId);

      if (teamsError) throw teamsError;

      setActivities((activitiesData || []) as any);
      setTeams((teamsData || []) as any);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error al cargar los datos del cronograma");
    } finally {
      setLoading(false);
    }
  };

  const calculateCriticalPath = () => {
    // Simplified critical path calculation
    const criticalActivities = activities.filter(activity => 
      activity.total_float_days <= 0 || activity.critical_path
    );
    return criticalActivities;
  };

  const generateDateRange = () => {
    if (activities.length === 0) return [];

    const startDates = activities
      .map(a => a.estimated_start_date)
      .filter(Boolean)
      .map(d => new Date(d!));
    
    const endDates = activities
      .map(a => a.estimated_end_date)
      .filter(Boolean)
      .map(d => new Date(d!));

    if (startDates.length === 0 || endDates.length === 0) return [];

    const minDate = new Date(Math.min(...startDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...endDates.map(d => d.getTime())));

    const dates = [];
    const current = new Date(minDate);
    
    while (current <= maxDate) {
      dates.push(new Date(current));
      if (viewMode === 'days') {
        current.setDate(current.getDate() + 1);
      } else if (viewMode === 'weeks') {
        current.setDate(current.getDate() + 7);
      } else {
        current.setMonth(current.getMonth() + 1);
      }
    }

    return dates;
  };

  const getActivityPosition = (activity: TimelineActivity, dateRange: Date[]) => {
    if (!activity.estimated_start_date || !activity.estimated_end_date || dateRange.length === 0) {
      return { left: 0, width: 0 };
    }

    const startDate = new Date(activity.estimated_start_date);
    const endDate = new Date(activity.estimated_end_date);
    const rangeStart = dateRange[0];
    const rangeEnd = dateRange[dateRange.length - 1];

    const totalDays = Math.max(1, (rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
    const activityStartDays = Math.max(0, (startDate.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
    const activityDuration = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    const left = (activityStartDays / totalDays) * 100;
    const width = (activityDuration / totalDays) * 100;

    return { left: Math.max(0, left), width: Math.min(100 - left, width) };
  };

  const handleDragStart = (activityId: string) => {
    setDraggedActivity(activityId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetActivityId: string) => {
    e.preventDefault();
    
    if (!draggedActivity || draggedActivity === targetActivityId) {
      setDraggedActivity(null);
      return;
    }

    try {
      // Add dependency logic here
      const draggedActivityData = activities.find(a => a.id === draggedActivity);
      const targetActivityData = activities.find(a => a.id === targetActivityId);

      if (draggedActivityData && targetActivityData) {
        // Update predecessor/successor relationships
        const updatedPredecessors = [...(targetActivityData.predecessor_activities || []), draggedActivity];
        const updatedSuccessors = [...(draggedActivityData.successor_activities || []), targetActivityId];

        await supabase
          .from("construction_timeline")
          .update({
            predecessor_activities: updatedPredecessors
          })
          .eq("id", targetActivityId);

        await supabase
          .from("construction_timeline")
          .update({
            successor_activities: updatedSuccessors
          })
          .eq("id", draggedActivity);

        toast.success("Dependencia creada exitosamente");
        fetchData();
      }
    } catch (error) {
      console.error("Error creating dependency:", error);
      toast.error("Error al crear la dependencia");
    }

    setDraggedActivity(null);
  };

  const formatDate = (date: Date) => {
    if (viewMode === 'days') {
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    } else if (viewMode === 'weeks') {
      return `S${Math.ceil(date.getDate() / 7)} ${date.toLocaleDateString('es-ES', { month: 'short' })}`;
    } else {
      return date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
    }
  };

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return "Sin asignar";
    const team = teams.find(t => t.id === teamId);
    return team ? team.team_name : "Equipo no encontrado";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const dateRange = generateDateRange();
  const criticalActivities = calculateCriticalPath();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando cronograma avanzado...</p>
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
                <BarChart3 className="h-5 w-5" />
                Cronograma Avanzado de Construcción
              </CardTitle>
              <CardDescription>
                Gestión completa de cronograma con dependencias y ruta crítica
              </CardDescription>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <div className="flex rounded-lg border">
                <Button
                  variant={viewMode === 'days' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('days')}
                  className="rounded-r-none"
                >
                  Días
                </Button>
                <Button
                  variant={viewMode === 'weeks' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('weeks')}
                  className="rounded-none"
                >
                  Semanas
                </Button>
                <Button
                  variant={viewMode === 'months' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('months')}
                  className="rounded-l-none"
                >
                  Meses
                </Button>
              </div>
              
              <Button
                variant={showCriticalPath ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowCriticalPath(!showCriticalPath)}
              >
                <Zap className="h-4 w-4 mr-2" />
                Ruta Crítica
              </Button>
              
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filtrar
              </Button>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Actividad
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Nueva Actividad</DialogTitle>
                    <DialogDescription>
                      Agregar una nueva actividad al cronograma avanzado
                    </DialogDescription>
                  </DialogHeader>
                  <TimelineActivityForm
                    projectId={projectId}
                    onSuccess={() => {
                      fetchData();
                    }}
                    onCancel={() => {}}
                  />
                </DialogContent>
              </Dialog>
              
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{activities.length}</div>
            <div className="text-sm text-muted-foreground">Total Actividades</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{criticalActivities.length}</div>
            <div className="text-sm text-muted-foreground">Ruta Crítica</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {activities.filter(a => a.status === 'completed').length}
            </div>
            <div className="text-sm text-muted-foreground">Completadas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {activities.filter(a => a.status === 'in_progress').length}
            </div>
            <div className="text-sm text-muted-foreground">En Progreso</div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Gantt Chart */}
      <Card>
        <CardContent className="p-0">
          {activities.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No hay actividades programadas</p>
              <p className="text-muted-foreground">Agrega actividades para visualizar el cronograma avanzado</p>
            </div>
          ) : (
            <div className="overflow-x-auto" ref={ganttRef}>
              {/* Header */}
              <div className="flex border-b bg-muted/50">
                <div className="w-96 p-4 font-medium border-r">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <span>Actividad</span>
                    <span>Equipo</span>
                    <span>Prioridad</span>
                  </div>
                </div>
                <div className="flex-1 relative">
                  <div className="flex h-16">
                    {dateRange.map((date, index) => (
                      <div
                        key={index}
                        className="flex-1 min-w-[60px] p-2 text-center text-xs border-r last:border-r-0"
                      >
                        <div className="font-medium">{formatDate(date)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Activities */}
              <div className="max-h-96 overflow-y-auto">
                {activities.map((activity) => {
                  const position = getActivityPosition(activity, dateRange);
                  const isCritical = showCriticalPath && activity.critical_path;
                  
                  return (
                    <div 
                      key={activity.id} 
                      className={`flex border-b hover:bg-muted/30 ${
                        isCritical ? 'bg-red-50 border-red-200' : ''
                      }`}
                      draggable
                      onDragStart={() => handleDragStart(activity.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, activity.id)}
                    >
                      <div className="w-96 p-4 border-r">
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <div className="font-medium text-sm truncate" title={activity.activity_name}>
                              {activity.activity_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {activity.activity_code}
                            </div>
                            <div className="flex gap-1 mt-1">
                              {isCritical && (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Crítica
                                </Badge>
                              )}
                              {activity.predecessor_activities?.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  <Link className="h-3 w-3" />
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-xs">
                            <div className="truncate" title={getTeamName(activity.assigned_team_id)}>
                              {getTeamName(activity.assigned_team_id)}
                            </div>
                            <div className="text-muted-foreground">
                              Float: {activity.total_float_days}d
                            </div>
                          </div>
                          <div className="text-xs">
                            <div className={`font-medium ${getPriorityColor(activity.priority)}`}>
                              {activity.priority === 'high' ? 'Alta' : 
                               activity.priority === 'medium' ? 'Media' : 'Baja'}
                            </div>
                            <Badge 
                              variant={
                                activity.status === 'completed' ? 'default' :
                                activity.status === 'in_progress' ? 'secondary' :
                                'outline'
                              }
                              className="text-xs"
                            >
                              {activity.status === 'completed' ? 'Completada' :
                               activity.status === 'in_progress' ? 'En Progreso' :
                               activity.status === 'on_hold' ? 'En Pausa' : 'Pendiente'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-1 relative h-16 flex items-center">
                        {dateRange.map((date, index) => (
                          <div
                            key={index}
                            className="flex-1 min-w-[60px] h-full border-r last:border-r-0"
                          />
                        ))}
                        
                        {/* Activity bar */}
                        {position.width > 0 && (
                          <div
                            className={`absolute h-8 rounded flex items-center justify-center text-white text-xs font-medium cursor-pointer transition-all hover:h-10 ${
                              isCritical ? 'ring-2 ring-red-400 ring-offset-1' : ''
                            }`}
                            style={{
                              left: `${position.left}%`,
                              width: `${position.width}%`,
                              backgroundColor: isCritical
                                ? '#dc2626' 
                                : activity.status === 'completed'
                                ? '#059669'
                                : activity.status === 'in_progress'
                                ? '#2563eb'
                                : '#6b7280'
                            }}
                            onClick={() => setSelectedActivity(activity)}
                          >
                            {/* Progress overlay */}
                            {activity.progress_percentage > 0 && (
                              <div
                                className="absolute left-0 top-0 h-full bg-white/30 rounded"
                                style={{ width: `${activity.progress_percentage}%` }}
                              />
                            )}
                            <span className="relative z-10 px-2 truncate">
                              {activity.estimated_duration_days}d ({activity.progress_percentage}%)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Leyenda y Controles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Estados de Actividad</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-600 rounded"></div>
                  <span>Ruta Crítica</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-600 rounded"></div>
                  <span>Completada</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-600 rounded"></div>
                  <span>En Progreso</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-500 rounded"></div>
                  <span>Pendiente</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3">Características Avanzadas</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  <span>Arrastra actividades para crear dependencias</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Ruta crítica marcada con borde rojo</span>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>Clic en barras para ver detalles</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Details Dialog */}
      {selectedActivity && (
        <Dialog open={!!selectedActivity} onOpenChange={() => setSelectedActivity(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedActivity.activity_name}</DialogTitle>
              <DialogDescription>Detalles de la actividad</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Código:</strong> {selectedActivity.activity_code}
                </div>
                <div>
                  <strong>Tipo:</strong> {selectedActivity.activity_type}
                </div>
                <div>
                  <strong>Duración estimada:</strong> {selectedActivity.estimated_duration_days} días
                </div>
                <div>
                  <strong>Progreso:</strong> {selectedActivity.progress_percentage}%
                </div>
                <div>
                  <strong>Equipo asignado:</strong> {getTeamName(selectedActivity.assigned_team_id)}
                </div>
                <div>
                  <strong>Float total:</strong> {selectedActivity.total_float_days} días
                </div>
              </div>
              
              {selectedActivity.notes && (
                <div>
                  <strong>Notas:</strong>
                  <p className="text-sm text-muted-foreground mt-1">{selectedActivity.notes}</p>
                </div>
              )}
              
              <div className="flex justify-end">
                <Button onClick={() => setSelectedActivity(null)}>Cerrar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}