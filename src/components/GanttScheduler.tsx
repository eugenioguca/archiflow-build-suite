import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  Plus,
  Settings,
  ZoomIn,
  ZoomOut,
  Filter,
  Download
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface TimelineActivity {
  id: string;
  activity_name: string;
  description?: string;
  planned_start_date: string;
  planned_end_date: string;
  actual_start_date?: string;
  actual_end_date?: string;
  progress_percentage: number;
  duration_days: number;
  is_critical_path: boolean;
  depends_on: string[];
  phase_id?: string;
  assigned_team_id?: string;
  notes?: string;
  phase_name?: string;
  team_name?: string;
}

interface GanttSchedulerProps {
  constructionProjectId: string;
}

export function GanttScheduler({ constructionProjectId }: GanttSchedulerProps) {
  const [activities, setActivities] = useState<TimelineActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'days' | 'weeks' | 'months'>('weeks');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());

  useEffect(() => {
    fetchTimelineData();
  }, [constructionProjectId]);

  const fetchTimelineData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('construction_timelines')
        .select(`
          *,
          phase:construction_phases(phase_name),
          team:construction_teams(team_name)
        `)
        .eq('construction_project_id', constructionProjectId)
        .order('planned_start_date', { ascending: true });

      if (error) throw error;

      const activitiesData = (data || []).map((item: any) => ({
        ...item,
        phase_name: item.phase?.phase_name,
        team_name: item.team?.team_name
      }));

      setActivities(activitiesData);

      // Calculate project date range
      if (activitiesData.length > 0) {
        const dates = activitiesData.flatMap(activity => [
          new Date(activity.planned_start_date),
          new Date(activity.planned_end_date)
        ]);
        setStartDate(new Date(Math.min(...dates.map(d => d.getTime()))));
        setEndDate(new Date(Math.max(...dates.map(d => d.getTime()))));
      }
    } catch (error) {
      console.error('Error fetching timeline data:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información del cronograma",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    const range = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    
    while (current <= end) {
      range.push(new Date(current));
      
      if (viewMode === 'days') {
        current.setDate(current.getDate() + 1);
      } else if (viewMode === 'weeks') {
        current.setDate(current.getDate() + 7);
      } else {
        current.setMonth(current.getMonth() + 1);
      }
    }
    
    return range;
  };

  const getActivityPosition = (activity: TimelineActivity) => {
    const activityStart = new Date(activity.planned_start_date);
    const activityEnd = new Date(activity.planned_end_date);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const startOffset = Math.ceil((activityStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.ceil((activityEnd.getTime() - activityStart.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`
    };
  };

  const getActivityStatus = (activity: TimelineActivity) => {
    if (activity.actual_end_date) return 'completed';
    if (activity.actual_start_date) return 'in-progress';
    if (new Date(activity.planned_start_date) < new Date()) return 'delayed';
    return 'pending';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500';
      case 'in-progress': return 'bg-blue-500';
      case 'delayed': return 'bg-red-500';
      case 'pending': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getCriticalPathColor = (isCritical: boolean) => {
    return isCritical ? 'border-red-500 border-2' : '';
  };

  const formatDate = (date: Date) => {
    if (viewMode === 'days') {
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    } else if (viewMode === 'weeks') {
      return `Sem ${Math.ceil(date.getDate() / 7)}`;
    } else {
      return date.toLocaleDateString('es-ES', { month: 'short' });
    }
  };

  const calculateProjectStats = () => {
    const totalActivities = activities.length;
    const completedActivities = activities.filter(a => getActivityStatus(a) === 'completed').length;
    const inProgressActivities = activities.filter(a => getActivityStatus(a) === 'in-progress').length;
    const delayedActivities = activities.filter(a => getActivityStatus(a) === 'delayed').length;
    const criticalPathActivities = activities.filter(a => a.is_critical_path).length;
    
    const overallProgress = totalActivities > 0 
      ? Math.round((activities.reduce((sum, a) => sum + a.progress_percentage, 0) / totalActivities))
      : 0;

    return {
      totalActivities,
      completedActivities,
      inProgressActivities,
      delayedActivities,
      criticalPathActivities,
      overallProgress
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const dateRange = getDateRange();
  const stats = calculateProjectStats();

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{stats.totalActivities}</div>
            <div className="text-sm text-muted-foreground">Total Actividades</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-emerald-600">{stats.completedActivities}</div>
            <div className="text-sm text-muted-foreground">Completadas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.inProgressActivities}</div>
            <div className="text-sm text-muted-foreground">En Progreso</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.delayedActivities}</div>
            <div className="text-sm text-muted-foreground">Retrasadas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-600">{stats.overallProgress}%</div>
            <div className="text-sm text-muted-foreground">Progreso General</div>
            <Progress value={stats.overallProgress} className="h-2 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('days')}
              >
                Días
              </Button>
              <Button
                variant={viewMode === 'weeks' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('weeks')}
              >
                Semanas
              </Button>
              <Button
                variant={viewMode === 'months' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('months')}
              >
                Meses
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Actividad
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gantt Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Cronograma del Proyecto</CardTitle>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>Ruta Crítica</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                <span>Completado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>En Progreso</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-400 rounded"></div>
                <span>Pendiente</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {/* Timeline Header */}
            <div className="flex border-b">
              <div className="w-80 p-4 bg-muted font-medium border-r">
                Actividades
              </div>
              <div className="flex-1 grid grid-cols-12 min-w-[800px]">
                {dateRange.slice(0, 12).map((date, index) => (
                  <div key={index} className="p-2 text-center border-r text-sm font-medium">
                    {formatDate(date)}
                  </div>
                ))}
              </div>
            </div>

            {/* Activities */}
            <div className="max-h-96 overflow-y-auto">
              {activities.map((activity, index) => (
                <div key={activity.id} className="flex border-b hover:bg-muted/50">
                  <div className="w-80 p-4 border-r">
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{activity.activity_name}</div>
                      <div className="flex items-center gap-2">
                        {activity.phase_name && (
                          <Badge variant="outline" className="text-xs">
                            {activity.phase_name}
                          </Badge>
                        )}
                        {activity.is_critical_path && (
                          <Badge variant="destructive" className="text-xs">
                            Crítica
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {activity.team_name && `Equipo: ${activity.team_name}`}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Progress value={activity.progress_percentage} className="h-1 flex-1" />
                        <span>{activity.progress_percentage}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 relative min-w-[800px] p-4">
                    <div 
                      className={`absolute top-1/2 transform -translate-y-1/2 h-6 rounded ${getStatusColor(getActivityStatus(activity))} ${getCriticalPathColor(activity.is_critical_path)} opacity-80 hover:opacity-100 cursor-pointer`}
                      style={getActivityPosition(activity)}
                      onClick={() => setSelectedActivity(activity.id)}
                    >
                      <div className="p-1 text-white text-xs font-medium truncate">
                        {activity.activity_name}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critical Path Analysis */}
      {stats.criticalPathActivities > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Análisis de Ruta Crítica
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {stats.criticalPathActivities}
                  </div>
                  <div className="text-sm text-red-700">Actividades Críticas</div>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-lg">
                  <div className="text-2xl font-bold text-amber-600">
                    {activities.filter(a => a.is_critical_path && getActivityStatus(a) === 'delayed').length}
                  </div>
                  <div className="text-sm text-amber-700">Críticas Retrasadas</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.max(...activities.map(a => a.duration_days))}
                  </div>
                  <div className="text-sm text-blue-700">Duración Máxima (días)</div>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p>
                  Las actividades de la ruta crítica determinarán la duración total del proyecto. 
                  Cualquier retraso en estas actividades retrasará el proyecto completo.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}