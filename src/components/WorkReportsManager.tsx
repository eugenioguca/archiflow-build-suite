import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Calendar as CalendarIcon,
  Cloud,
  Sun,
  CloudRain,
  Users,
  AlertTriangle,
  CheckCircle,
  Star,
  Eye,
  Edit
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface WorkReport {
  id: string;
  project_id: string;
  report_date: string;
  shift: string;
  weather_conditions: string | null;
  temperature_celsius: number | null;
  humidity_percentage: number | null;
  wind_conditions: string | null;
  work_performed: any;
  equipment_used: any;
  materials_consumed: any;
  personnel_present: any;
  safety_incidents: any;
  quality_issues: any;
  delays_encountered: any;
  achievements: any;
  planned_next_day: any;
  photos: any;
  visitors: any;
  deliveries_received: any;
  inspections_conducted: any;
  overall_progress_notes: string | null;
  safety_compliance_rating: number;
  quality_compliance_rating: number;
  productivity_rating: number;
  supervisor_signature: string | null;
  client_signature: string | null;
  approved_by: string | null;
  approval_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface WorkReportsManagerProps {
  projectId: string;
}

export function WorkReportsManager({ projectId }: WorkReportsManagerProps) {
  const [reports, setReports] = useState<WorkReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [newReportDialog, setNewReportDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<WorkReport | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("all");

  const shiftOptions = [
    { value: "day", label: "Día" },
    { value: "night", label: "Noche" },
    { value: "both", label: "Ambos" }
  ];

  const weatherConditions = [
    { value: "sunny", label: "Soleado", icon: Sun },
    { value: "cloudy", label: "Nublado", icon: Cloud },
    { value: "rainy", label: "Lluvioso", icon: CloudRain },
    { value: "windy", label: "Ventoso", icon: Cloud }
  ];

  const form = useForm({
    defaultValues: {
      report_date: new Date().toISOString().split('T')[0],
      shift: "day",
      weather_conditions: "",
      temperature_celsius: "",
      humidity_percentage: "",
      wind_conditions: "",
      overall_progress_notes: "",
      safety_compliance_rating: 5,
      quality_compliance_rating: 5,
      productivity_rating: 3
    }
  });

  useEffect(() => {
    fetchReports();
  }, [projectId]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("work_reports")
        .select("*")
        .eq("project_id", projectId)
        .order("report_date", { ascending: false });

      if (error) {
        console.error("Error fetching work reports:", error);
        toast.error("Error al cargar los reportes");
        return;
      }

      setReports(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar los reportes");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = async (data: any) => {
    try {
      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuario no autenticado");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        toast.error("Perfil de usuario no encontrado");
        return;
      }

      const { error } = await supabase
        .from("work_reports")
        .insert({
          project_id: projectId,
          report_date: data.report_date,
          shift: data.shift,
          weather_conditions: data.weather_conditions || null,
          temperature_celsius: parseFloat(data.temperature_celsius) || null,
          humidity_percentage: parseFloat(data.humidity_percentage) || null,
          wind_conditions: data.wind_conditions || null,
          work_performed: [],
          equipment_used: [],
          materials_consumed: [],
          personnel_present: [],
          safety_incidents: [],
          quality_issues: [],
          delays_encountered: [],
          achievements: [],
          planned_next_day: [],
          photos: [],
          visitors: [],
          deliveries_received: [],
          inspections_conducted: [],
          overall_progress_notes: data.overall_progress_notes || null,
          safety_compliance_rating: parseInt(data.safety_compliance_rating) || 5,
          quality_compliance_rating: parseInt(data.quality_compliance_rating) || 5,
          productivity_rating: parseInt(data.productivity_rating) || 3,
          supervisor_signature: null,
          client_signature: null,
          created_by: profile.id
        });

      if (error) {
        console.error("Error creating work report:", error);
        toast.error("Error al crear el reporte");
        return;
      }

      toast.success("Reporte creado exitosamente");
      setNewReportDialog(false);
      form.reset();
      fetchReports();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al crear el reporte");
    }
  };

  const getWeatherIcon = (weather: string | null) => {
    if (!weather) return null;
    const condition = weatherConditions.find(w => w.value === weather);
    if (condition) {
      const Icon = condition.icon;
      return <Icon className="h-4 w-4" />;
    }
    return null;
  };

  const getRatingStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
          />
        ))}
      </div>
    );
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.overall_progress_notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         format(new Date(report.report_date), "PP", { locale: es }).includes(searchTerm.toLowerCase());
    
    const today = new Date();
    const reportDate = new Date(report.report_date);
    
    let matchesDate = true;
    if (dateFilter === "today") {
      matchesDate = reportDate.toDateString() === today.toDateString();
    } else if (dateFilter === "week") {
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      matchesDate = reportDate >= weekAgo;
    } else if (dateFilter === "month") {
      matchesDate = reportDate.getMonth() === today.getMonth() && reportDate.getFullYear() === today.getFullYear();
    }
    
    return matchesSearch && matchesDate;
  });

  const stats = {
    total: reports.length,
    thisWeek: reports.filter(r => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return new Date(r.report_date) >= weekAgo;
    }).length,
    thisMonth: reports.filter(r => {
      const today = new Date();
      const reportDate = new Date(r.report_date);
      return reportDate.getMonth() === today.getMonth() && reportDate.getFullYear() === today.getFullYear();
    }).length,
    avgSafety: reports.length > 0 
      ? (reports.reduce((sum, r) => sum + r.safety_compliance_rating, 0) / reports.length).toFixed(1)
      : "0",
    avgQuality: reports.length > 0 
      ? (reports.reduce((sum, r) => sum + r.quality_compliance_rating, 0) / reports.length).toFixed(1)
      : "0",
    avgProductivity: reports.length > 0 
      ? (reports.reduce((sum, r) => sum + r.productivity_rating, 0) / reports.length).toFixed(1)
      : "0"
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando reportes...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="h-8 w-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.thisWeek}</div>
            <div className="text-sm text-muted-foreground">Esta Semana</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.thisMonth}</div>
            <div className="text-sm text-muted-foreground">Este Mes</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.avgSafety}</div>
            <div className="text-sm text-muted-foreground">Seguridad</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.avgQuality}</div>
            <div className="text-sm text-muted-foreground">Calidad</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.avgProductivity}</div>
            <div className="text-sm text-muted-foreground">Productividad</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Reportes de Trabajo
              </CardTitle>
              <CardDescription>
                Reportes diarios de avance y actividades de construcción
              </CardDescription>
            </div>
            
            <Dialog open={newReportDialog} onOpenChange={setNewReportDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Reporte
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nuevo Reporte de Trabajo</DialogTitle>
                  <DialogDescription>
                    Crear un reporte diario de actividades y progreso
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleCreateReport)} className="space-y-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Información Básica</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="report_date"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Fecha del Reporte</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant={"outline"}
                                      className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                      )}
                                    >
                                      {field.value ? (
                                        format(new Date(field.value), "PPP", { locale: es })
                                      ) : (
                                        <span>Seleccionar fecha</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value ? new Date(field.value) : undefined}
                                    onSelect={(date) => field.onChange(date?.toISOString().split('T')[0])}
                                    disabled={(date) => date > new Date()}
                                    initialFocus
                                    className="pointer-events-auto"
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="shift"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Turno</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar turno" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {shiftOptions.map(shift => (
                                    <SelectItem key={shift.value} value={shift.value}>
                                      {shift.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Weather Conditions */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Condiciones Climáticas</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <FormField
                          control={form.control}
                          name="weather_conditions"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Clima General</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {weatherConditions.map(weather => (
                                    <SelectItem key={weather.value} value={weather.value}>
                                      {weather.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="temperature_celsius"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Temperatura (°C)</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="25" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="humidity_percentage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Humedad (%)</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" max="100" placeholder="60" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="wind_conditions"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Viento</FormLabel>
                              <FormControl>
                                <Input placeholder="Ligero, Moderado, Fuerte" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Progress Notes */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Notas de Progreso</h3>
                      
                      <FormField
                        control={form.control}
                        name="overall_progress_notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Resumen del Día</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describir el trabajo realizado, logros, problemas, etc..." 
                                className="min-h-[100px]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Rating Scores */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Evaluaciones</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="safety_compliance_rating"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cumplimiento de Seguridad (1-5)</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {[1, 2, 3, 4, 5].map(rating => (
                                    <SelectItem key={rating} value={rating.toString()}>
                                      {rating} - {rating === 5 ? 'Excelente' : rating === 4 ? 'Bueno' : rating === 3 ? 'Regular' : rating === 2 ? 'Malo' : 'Muy Malo'}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="quality_compliance_rating"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Calidad del Trabajo (1-5)</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {[1, 2, 3, 4, 5].map(rating => (
                                    <SelectItem key={rating} value={rating.toString()}>
                                      {rating} - {rating === 5 ? 'Excelente' : rating === 4 ? 'Bueno' : rating === 3 ? 'Regular' : rating === 2 ? 'Malo' : 'Muy Malo'}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="productivity_rating"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Productividad (1-5)</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {[1, 2, 3, 4, 5].map(rating => (
                                    <SelectItem key={rating} value={rating.toString()}>
                                      {rating} - {rating === 5 ? 'Excelente' : rating === 4 ? 'Bueno' : rating === 3 ? 'Regular' : rating === 2 ? 'Malo' : 'Muy Malo'}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setNewReportDialog(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit">Crear Reporte</Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar reportes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por fecha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las fechas</SelectItem>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="week">Esta semana</SelectItem>
                <SelectItem value="month">Este mes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredReports.map((report) => (
          <Card key={report.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">
                    Reporte - {format(new Date(report.report_date), "PPP", { locale: es })}
                  </CardTitle>
                  <CardDescription>
                    Turno: {shiftOptions.find(s => s.value === report.shift)?.label}
                    {report.weather_conditions && (
                      <span className="ml-2 inline-flex items-center gap-1">
                        {getWeatherIcon(report.weather_conditions)}
                        {weatherConditions.find(w => w.value === report.weather_conditions)?.label}
                      </span>
                    )}
                  </CardDescription>
                </div>
                <Badge variant="outline">
                  {format(new Date(report.created_at), "HH:mm")}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {report.temperature_celsius !== null && (
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Temperatura:</span>
                    <div className="font-medium">{report.temperature_celsius}°C</div>
                  </div>
                  {report.humidity_percentage !== null && (
                    <div>
                      <span className="text-muted-foreground">Humedad:</span>
                      <div className="font-medium">{report.humidity_percentage}%</div>
                    </div>
                  )}
                  {report.wind_conditions && (
                    <div>
                      <span className="text-muted-foreground">Viento:</span>
                      <div className="font-medium">{report.wind_conditions}</div>
                    </div>
                  )}
                </div>
              )}

              {report.overall_progress_notes && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Resumen:</div>
                  <div className="text-sm bg-muted p-3 rounded">
                    {report.overall_progress_notes}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Seguridad:</span>
                  {getRatingStars(report.safety_compliance_rating)}
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Calidad:</span>
                  {getRatingStars(report.quality_compliance_rating)}
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Productividad:</span>
                  {getRatingStars(report.productivity_rating)}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Completo
                </Button>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredReports.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">No se encontraron reportes</p>
            <p className="text-muted-foreground">
              {reports.length === 0 
                ? "Crea reportes diarios para documentar el progreso de la obra"
                : "Prueba ajustando los filtros de búsqueda"
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}