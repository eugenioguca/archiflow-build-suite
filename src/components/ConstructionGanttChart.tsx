import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Plus, Filter, Download } from "lucide-react";
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
}

interface ConstructionGanttChartProps {
  projectId: string;
}

export function ConstructionGanttChart({ projectId }: ConstructionGanttChartProps) {
  const [activities, setActivities] = useState<TimelineActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'days' | 'weeks' | 'months'>('weeks');

  useEffect(() => {
    fetchTimelineActivities();
  }, [projectId]);

  const fetchTimelineActivities = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("construction_timeline")
        .select("*")
        .eq("project_id", projectId)
        .order("activity_order");

      if (error) {
        console.error("Error fetching timeline activities:", error);
        toast.error("Error al cargar las actividades del cronograma");
        return;
      }

      setActivities(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar el cronograma");
    } finally {
      setLoading(false);
    }
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

  const formatDate = (date: Date) => {
    if (viewMode === 'days') {
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    } else if (viewMode === 'weeks') {
      return `S${Math.ceil(date.getDate() / 7)} ${date.toLocaleDateString('es-ES', { month: 'short' })}`;
    } else {
      return date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
    }
  };

  const dateRange = generateDateRange();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando cronograma...</p>
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
                <Calendar className="h-5 w-5" />
                Cronograma de Construcción
              </CardTitle>
              <CardDescription>
                Diagrama de Gantt con cronograma detallado de actividades
              </CardDescription>
            </div>
            
            <div className="flex gap-2">
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
                      Agregar una nueva actividad al cronograma de construcción
                    </DialogDescription>
                  </DialogHeader>
                  <TimelineActivityForm
                    projectId={projectId}
                    onSuccess={() => {
                      fetchTimelineActivities();
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

      {/* Gantt Chart */}
      <Card>
        <CardContent className="p-0">
          {activities.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No hay actividades programadas</p>
              <p className="text-muted-foreground">Agrega actividades para visualizar el cronograma</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Header with dates */}
              <div className="flex border-b bg-muted/50">
                <div className="w-80 p-4 font-medium border-r">Actividad</div>
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
                  
                  return (
                    <div key={activity.id} className="flex border-b hover:bg-muted/30">
                      <div className="w-80 p-4 border-r">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-medium text-sm">{activity.activity_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {activity.activity_code}
                            </div>
                            <div className="flex gap-1 mt-1">
                              <Badge 
                                variant={activity.critical_path ? 'destructive' : 'outline'}
                                className="text-xs"
                              >
                                {activity.critical_path ? 'Crítica' : 'Normal'}
                              </Badge>
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
                            className="absolute h-6 rounded flex items-center justify-center text-white text-xs font-medium"
                            style={{
                              left: `${position.left}%`,
                              width: `${position.width}%`,
                              backgroundColor: activity.critical_path 
                                ? '#ef4444' 
                                : activity.status === 'completed'
                                ? '#10b981'
                                : activity.status === 'in_progress'
                                ? '#3b82f6'
                                : '#6b7280'
                            }}
                          >
                            {activity.progress_percentage > 0 && (
                              <div
                                className="absolute left-0 top-0 h-full bg-white/30 rounded"
                                style={{ width: `${activity.progress_percentage}%` }}
                              />
                            )}
                            <span className="relative z-10">
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
          <CardTitle className="text-sm">Leyenda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>Ruta Crítica</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>Completada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span>En Progreso</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-500 rounded"></div>
              <span>Pendiente</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}