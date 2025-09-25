import React, { useState, useEffect } from 'react';
import { Play, CheckCircle, AlertTriangle, Calendar, Clock, User, Camera, Package, Wrench, Filter, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getGanttByProject, getGanttConstructionStatus } from '@/services/planning/getGanttByProject';

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
  duration_days?: number;
}

interface ConstructionScheduleProps {
  projectId: string;
  clientId: string;
}

const statusConfig = {
  no_iniciado: { label: 'No iniciado', icon: Calendar, color: 'bg-gray-100 text-gray-700', badgeVariant: 'secondary' as const },
  en_proceso: { label: 'En proceso', icon: Play, color: 'bg-blue-100 text-blue-700', badgeVariant: 'default' as const },
  bloqueado: { label: 'Bloqueado', icon: AlertTriangle, color: 'bg-red-100 text-red-700', badgeVariant: 'destructive' as const },
  terminado: { label: 'Terminado', icon: CheckCircle, color: 'bg-green-100 text-green-700', badgeVariant: 'default' as const },
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
  const [filterMayor, setFilterMayor] = useState<string>('all');
  const [materialAlerts, setMaterialAlerts] = useState<any[]>([]);

  useEffect(() => {
    fetchActivities();
  }, [projectId]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      
      // Get planning gantt activities from the new VIEW
      const planningActivities = await getGanttByProject(projectId, clientId);
      
      // Get construction status for each activity
      const constructionStatus = await getGanttConstructionStatus(projectId);
      
      // Get material readiness (simplified for now)
      const materialReadiness: Record<string, 'solicitado' | 'listo' | 'pendiente'> = {};
      
      // Combine planning data with construction status
      const constructionActivities: ConstructionActivity[] = planningActivities.map(activity => {
        const status = constructionStatus[activity.id];
        const readiness = materialReadiness[activity.mayor_id] || 'pendiente';
        
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
          material_readiness: readiness,
          duration_days: activity.start_date_plan && activity.end_date_plan ? 
            Math.ceil((new Date(activity.end_date_plan).getTime() - new Date(activity.start_date_plan).getTime()) / (1000 * 60 * 60 * 24)) : 0
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

  const checkMaterialAlerts = async (activities: ConstructionActivity[]) => {
    const today = new Date();
    const alertThreshold = new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000); // +4 days

    const alerts = activities.filter(activity => {
      const startDate = new Date(activity.planned_start_date);
      return startDate <= alertThreshold && startDate > today && activity.material_readiness === 'pendiente';
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
      const { error } = await (supabase as any)
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

  // Filtros
  const filteredActivities = activities.filter(activity => {
    const matchesStatus = filterStatus === 'all' || activity.status === filterStatus;
    const matchesMayor = filterMayor === 'all' || activity.mayor_id === filterMayor;
    return matchesStatus && matchesMayor;
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

  // Obtener mayores únicos para filtro
  const uniqueMayores = Array.from(new Set(activities.map(a => a.mayor_id)))
    .map(mayorId => activities.find(a => a.mayor_id === mayorId))
    .filter(Boolean);

  // Métricas
  const metrics = {
    no_iniciado: activities.filter(a => a.status === 'no_iniciado').length,
    en_proceso: activities.filter(a => a.status === 'en_proceso').length,
    bloqueado: activities.filter(a => a.status === 'bloqueado').length,
    terminado: activities.filter(a => a.status === 'terminado').length,
    retraso: activities.filter(a => getDelayDays(a) > 0).length,
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

      {/* Barra superior con filtros y métricas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Cronograma de Construcción
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="flex gap-4 items-center">
            <Filter className="h-4 w-4 text-muted-foreground" />
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
            
            <Select value={filterMayor} onValueChange={setFilterMayor}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por mayor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los mayores</SelectItem>
                {uniqueMayores.map((activity) => (
                  <SelectItem key={activity!.mayor_id} value={activity!.mayor_id}>
                    {activity!.mayor_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-5 gap-4">
            {Object.entries(statusConfig).map(([status, config]) => {
              const count = metrics[status as keyof typeof metrics];
              const StatusIcon = config.icon;
              return (
                <div key={status} className="flex items-center gap-2 p-3 border rounded-lg">
                  <div className={`p-2 rounded ${config.color}`}>
                    <StatusIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{count}</p>
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <div className="p-2 rounded bg-orange-100 text-orange-700">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">{metrics.retraso}</p>
                <p className="text-xs text-muted-foreground">Con retraso</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla plana + mini-Gantt */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0">
                <TableRow>
                  <TableHead className="w-[200px]">Actividad</TableHead>
                  <TableHead className="w-[150px]">Mayor</TableHead>
                  <TableHead className="w-[120px]">Inicio Plan</TableHead>
                  <TableHead className="w-[120px]">Fin Plan</TableHead>
                  <TableHead className="w-[120px]">Inicio Real</TableHead>
                  <TableHead className="w-[120px]">Fin Real</TableHead>
                  <TableHead className="w-[100px]">% Avance</TableHead>
                  <TableHead className="w-[80px]">Δ días</TableHead>
                  <TableHead className="w-[120px]">Estado</TableHead>
                  <TableHead className="w-[120px]">Materiales</TableHead>
                  <TableHead className="w-[200px]">Acciones</TableHead>
                  <TableHead className="w-[300px]">Timeline</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActivities.map((activity) => {
                  const StatusIcon = statusConfig[activity.status]?.icon;
                  const delayDays = getDelayDays(activity);
                  const MaterialIcon = materialReadinessConfig[activity.material_readiness || 'pendiente']?.icon;
                  
                  return (
                    <TableRow key={activity.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{activity.activity_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {activity.duration_days} días
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{activity.mayor_name}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">
                          {format(new Date(activity.planned_start_date), 'dd/MM/yy', { locale: es })}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">
                          {format(new Date(activity.planned_end_date), 'dd/MM/yy', { locale: es })}
                        </p>
                      </TableCell>
                      <TableCell>
                        {activity.actual_start_date && (
                          <p className="text-sm">
                            {format(new Date(activity.actual_start_date), 'dd/MM/yy', { locale: es })}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {activity.actual_end_date && (
                          <p className="text-sm">
                            {format(new Date(activity.actual_end_date), 'dd/MM/yy', { locale: es })}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={activity.progress_percentage} className="w-12 h-2" />
                          <span className="text-xs text-muted-foreground">
                            {activity.progress_percentage}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {delayDays > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            +{delayDays}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={statusConfig[activity.status]?.badgeVariant}
                          className="text-xs"
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig[activity.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${materialReadinessConfig[activity.material_readiness || 'pendiente']?.color}`}
                        >
                          <MaterialIcon className="h-3 w-3 mr-1" />
                          {materialReadinessConfig[activity.material_readiness || 'pendiente']?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {activity.status === 'no_iniciado' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updateActivityStatus(activity.id, 'en_proceso')}
                              className="text-xs h-7"
                            >
                              Iniciar
                            </Button>
                          )}
                          {activity.status === 'en_proceso' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updateActivityStatus(activity.id, 'terminado')}
                              className="text-xs h-7"
                            >
                              Terminar
                            </Button>
                          )}
                          <Sheet>
                            <SheetTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setSelectedActivity(activity)}
                                className="text-xs h-7"
                              >
                                Control
                              </Button>
                            </SheetTrigger>
                            <SheetContent className="w-[600px] sm:w-[600px]">
                              <SheetHeader>
                                <SheetTitle>Control de Actividad</SheetTitle>
                              </SheetHeader>
                              
                              {selectedActivity && (
                                <div className="mt-6">
                                  <Tabs defaultValue="execution" className="w-full">
                                    <TabsList className="grid w-full grid-cols-4">
                                      <TabsTrigger value="execution">Ejecución</TabsTrigger>
                                      <TabsTrigger value="materials">Materiales</TabsTrigger>
                                      <TabsTrigger value="risks">Riesgos</TabsTrigger>
                                      <TabsTrigger value="relations">Relaciones</TabsTrigger>
                                    </TabsList>
                                    
                                    <TabsContent value="execution" className="space-y-4 mt-4">
                                      <div>
                                        <h4 className="font-medium">{selectedActivity.activity_name}</h4>
                                        <p className="text-sm text-muted-foreground">Mayor: {selectedActivity.mayor_name}</p>
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

                                      <div>
                                        <label className="text-sm font-medium block mb-2">% Avance Real</label>
                                        <Input
                                          type="number"
                                          min="0"
                                          max="100"
                                          value={progressPercentage}
                                          onChange={(e) => setProgressPercentage(Number(e.target.value))}
                                          placeholder="0"
                                        />
                                      </div>

                                      <div>
                                        <label className="text-sm font-medium block mb-2">Causa de Retraso</label>
                                        <Select value={delayReason} onValueChange={setDelayReason}>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar causa" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="materiales">Falta de materiales</SelectItem>
                                            <SelectItem value="clima">Condiciones climáticas</SelectItem>
                                            <SelectItem value="personal">Falta de personal</SelectItem>
                                            <SelectItem value="equipos">Falta de equipos</SelectItem>
                                            <SelectItem value="permisos">Permisos pendientes</SelectItem>
                                            <SelectItem value="otros">Otros</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      <div>
                                        <label className="text-sm font-medium block mb-2">Notas</label>
                                        <Textarea
                                          value={notes}
                                          onChange={(e) => setNotes(e.target.value)}
                                          placeholder="Agregar notas de la actividad..."
                                          rows={3}
                                        />
                                      </div>

                                      <div className="flex gap-2 pt-4">
                                        <Button 
                                          onClick={() => updateActivityStatus(selectedActivity.id, 'en_proceso')}
                                          disabled={selectedActivity.status === 'en_proceso'}
                                        >
                                          Iniciar
                                        </Button>
                                        <Button 
                                          onClick={() => updateActivityStatus(selectedActivity.id, 'terminado')}
                                          disabled={selectedActivity.status === 'terminado'}
                                        >
                                          Terminar
                                        </Button>
                                        <Button 
                                          variant="destructive"
                                          onClick={() => updateActivityStatus(selectedActivity.id, 'bloqueado')}
                                        >
                                          Bloquear
                                        </Button>
                                      </div>
                                    </TabsContent>
                                    
                                    <TabsContent value="materials" className="space-y-4 mt-4">
                                      <p className="text-sm text-muted-foreground">
                                        Control de materiales para el mayor: {selectedActivity.mayor_name}
                                      </p>
                                      <div className="p-4 border rounded">
                                        <p className="text-sm">Readiness: {materialReadinessConfig[selectedActivity.material_readiness || 'pendiente']?.label}</p>
                                        <Button className="mt-2 w-full">
                                          Solicitar Material
                                        </Button>
                                      </div>
                                    </TabsContent>
                                    
                                    <TabsContent value="risks" className="space-y-4 mt-4">
                                      <p className="text-sm text-muted-foreground">
                                        Gestión de riesgos para la actividad
                                      </p>
                                      {/* Risk management UI */}
                                    </TabsContent>
                                    
                                    <TabsContent value="relations" className="space-y-4 mt-4">
                                      <div className="space-y-2">
                                        <p><strong>Mayor:</strong> {selectedActivity.mayor_name}</p>
                                        <p><strong>Importe:</strong> ${selectedActivity.amount.toLocaleString()}</p>
                                        <p><strong>Duración:</strong> {selectedActivity.duration_days} días</p>
                                      </div>
                                    </TabsContent>
                                  </Tabs>
                                </div>
                              )}
                            </SheetContent>
                          </Sheet>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="relative h-8 bg-gray-100 rounded">
                          {/* Timeline visualization placeholder */}
                          <div className="absolute inset-0 flex items-center">
                            <div className="h-2 bg-gray-300 rounded-full flex-1 mr-2"></div>
                            {activity.status !== 'no_iniciado' && (
                              <div className="h-2 bg-blue-500 rounded-full" style={{width: `${activity.progress_percentage}%`}}></div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};