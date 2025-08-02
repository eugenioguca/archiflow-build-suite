import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calendar, Clock, AlertTriangle, CheckCircle, Plus } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface TimelineActivity {
  id: string;
  activity_name: string;
  description: string;
  planned_start_date: string;
  planned_end_date: string;
  actual_start_date?: string;
  actual_end_date?: string;
  progress_percentage: number;
  is_critical_path: boolean;
  phase?: {
    phase_name: string;
    phase_type: string;
  };
}

interface ConstructionTimelineProps {
  constructionProjectId: string;
}

export function ConstructionTimeline({ constructionProjectId }: ConstructionTimelineProps) {
  const [activities, setActivities] = useState<TimelineActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("construction_timelines")
        .select(`
          *,
          phase:construction_phases(phase_name, phase_type)
        `)
        .eq("construction_project_id", constructionProjectId)
        .order("planned_start_date", { ascending: true });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error("Error fetching timeline activities:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (constructionProjectId) {
      fetchActivities();
    }
  }, [constructionProjectId]);

  const getStatusColor = (activity: TimelineActivity) => {
    if (activity.progress_percentage === 100) return "bg-green-100 text-green-800";
    if (activity.progress_percentage > 0) return "bg-blue-100 text-blue-800";
    if (new Date(activity.planned_start_date) < new Date()) return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  const getStatusText = (activity: TimelineActivity) => {
    if (activity.progress_percentage === 100) return "Completado";
    if (activity.progress_percentage > 0) return "En Progreso";
    if (new Date(activity.planned_start_date) < new Date()) return "Retrasado";
    return "Programado";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Timeline de Construcción</h2>
          <p className="text-muted-foreground">Cronograma detallado de actividades</p>
        </div>
        <TimelineActivityDialog 
          constructionProjectId={constructionProjectId}
          onSave={fetchActivities}
        />
      </div>

      {/* Timeline Visual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Cronograma Visual
          </CardTitle>
          <CardDescription>Vista de Gantt simplificada</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {activity.is_critical_path && (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="font-medium">{activity.activity_name}</span>
                    </div>
                    <Badge className={getStatusColor(activity)}>
                      {getStatusText(activity)}
                    </Badge>
                    {activity.phase && (
                      <Badge variant="outline">{activity.phase.phase_name}</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(activity.planned_start_date), "dd MMM", { locale: es })} - 
                    {format(new Date(activity.planned_end_date), "dd MMM", { locale: es })}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Progress value={activity.progress_percentage} className="flex-1" />
                  <span className="text-sm font-medium">{activity.progress_percentage}%</span>
                </div>
                {activity.description && (
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activities List */}
      <div className="grid gap-4">
        {activities.map((activity) => (
          <Card key={activity.id} className={activity.is_critical_path ? "border-red-200" : ""}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{activity.activity_name}</h3>
                    {activity.is_critical_path && (
                      <Badge variant="destructive" className="text-xs">
                        Ruta Crítica
                      </Badge>
                    )}
                  </div>
                  {activity.description && (
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                  )}
                </div>
                <Badge className={getStatusColor(activity)}>
                  {getStatusText(activity)}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Inicio Planificado</p>
                  <p className="text-sm font-medium">
                    {format(new Date(activity.planned_start_date), "dd/MM/yyyy", { locale: es })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fin Planificado</p>
                  <p className="text-sm font-medium">
                    {format(new Date(activity.planned_end_date), "dd/MM/yyyy", { locale: es })}
                  </p>
                </div>
                {activity.actual_start_date && (
                  <div>
                    <p className="text-xs text-muted-foreground">Inicio Real</p>
                    <p className="text-sm font-medium">
                      {format(new Date(activity.actual_start_date), "dd/MM/yyyy", { locale: es })}
                    </p>
                  </div>
                )}
                {activity.actual_end_date && (
                  <div>
                    <p className="text-xs text-muted-foreground">Fin Real</p>
                    <p className="text-sm font-medium">
                      {format(new Date(activity.actual_end_date), "dd/MM/yyyy", { locale: es })}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Progress value={activity.progress_percentage} className="w-32" />
                  <span className="text-sm font-medium">{activity.progress_percentage}%</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Clock className="h-3 w-3 mr-1" />
                    Actualizar
                  </Button>
                  {activity.progress_percentage === 100 && (
                    <Button variant="outline" size="sm" className="text-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Completado
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {activities.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay actividades programadas</h3>
            <p className="text-muted-foreground text-center">
              Comienza agregando actividades al cronograma de construcción.
            </p>
            <Button className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Primera Actividad
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}