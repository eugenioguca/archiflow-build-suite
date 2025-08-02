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
  CheckCircle, 
  Plus, 
  Search, 
  Filter, 
  Calendar as CalendarIcon,
  AlertTriangle,
  Star,
  FileText,
  Camera,
  MapPin,
  Clock,
  User
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface QualityInspection {
  id: string;
  project_id: string;
  phase_id: string | null;
  milestone_id: string | null;
  budget_item_id: string | null;
  inspection_type: string;
  inspection_name: string;
  inspection_code: string | null;
  scheduled_date: string;
  actual_date: string | null;
  inspector_name: string;
  inspector_certification: string | null;
  status: string;
  overall_rating: number | null;
  inspection_criteria: any;
  results: any;
  deficiencies: any;
  corrective_actions: any;
  follow_up_required: boolean;
  follow_up_date: string | null;
  photos: any;
  documents: any;
  regulatory_compliance: any;
  certifications_issued: any;
  cost: number;
  duration_hours: number | null;
  weather_conditions: string | null;
  remarks: string | null;
  approved_by: string | null;
  approval_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface ConstructionPhase {
  id: string;
  phase_name: string;
}

interface QualityInspectionsProps {
  projectId: string;
}

export function QualityInspections({ projectId }: QualityInspectionsProps) {
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [phases, setPhases] = useState<ConstructionPhase[]>([]);
  const [loading, setLoading] = useState(true);
  const [newInspectionDialog, setNewInspectionDialog] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<QualityInspection | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const inspectionTypes = [
    { value: "quality", label: "Calidad", color: "bg-green-500" },
    { value: "safety", label: "Seguridad", color: "bg-red-500" },
    { value: "environmental", label: "Ambiental", color: "bg-blue-500" },
    { value: "regulatory", label: "Regulatoria", color: "bg-purple-500" },
    { value: "structural", label: "Estructural", color: "bg-orange-500" },
    { value: "electrical", label: "Eléctrica", color: "bg-yellow-500" },
    { value: "plumbing", label: "Plomería", color: "bg-cyan-500" },
    { value: "finishing", label: "Acabados", color: "bg-pink-500" }
  ];

  const statusOptions = [
    { value: "scheduled", label: "Programada", color: "blue" },
    { value: "in_progress", label: "En Progreso", color: "yellow" },
    { value: "passed", label: "Aprobada", color: "green" },
    { value: "failed", label: "Fallida", color: "red" },
    { value: "conditional", label: "Condicional", color: "orange" },
    { value: "cancelled", label: "Cancelada", color: "gray" }
  ];

  const form = useForm();

  useEffect(() => {
    Promise.all([fetchInspections(), fetchPhases()]);
  }, [projectId]);

  const fetchInspections = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("quality_inspections")
        .select("*")
        .eq("project_id", projectId)
        .order("scheduled_date", { ascending: false });

      if (error) {
        console.error("Error fetching inspections:", error);
        toast.error("Error al cargar las inspecciones");
        return;
      }

      setInspections(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar las inspecciones");
    } finally {
      setLoading(false);
    }
  };

  const fetchPhases = async () => {
    try {
      const { data, error } = await supabase
        .from("construction_phases")
        .select("id, phase_name")
        .eq("project_id", projectId)
        .order("phase_order");

      if (error) {
        console.error("Error fetching phases:", error);
        return;
      }

      setPhases(data || []);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleCreateInspection = async (data: any) => {
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
        .from("quality_inspections")
        .insert({
          project_id: projectId,
          phase_id: data.phase_id || null,
          inspection_type: data.inspection_type,
          inspection_name: data.inspection_name,
          inspection_code: data.inspection_code || null,
          scheduled_date: data.scheduled_date,
          inspector_name: data.inspector_name,
          inspector_certification: data.inspector_certification || null,
          status: "scheduled",
          inspection_criteria: data.inspection_criteria || [],
          results: {},
          deficiencies: [],
          corrective_actions: [],
          follow_up_required: false,
          photos: [],
          documents: [],
          regulatory_compliance: {},
          certifications_issued: [],
          cost: parseFloat(data.cost) || 0,
          duration_hours: parseFloat(data.duration_hours) || null,
          weather_conditions: null,
          remarks: data.remarks || null,
          created_by: profile.id
        });

      if (error) {
        console.error("Error creating inspection:", error);
        toast.error("Error al crear la inspección");
        return;
      }

      toast.success("Inspección creada exitosamente");
      setNewInspectionDialog(false);
      form.reset();
      fetchInspections();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al crear la inspección");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = statusOptions.find(s => s.value === status);
    return (
      <Badge 
        variant={
          status === 'passed' ? 'default' : 
          status === 'failed' ? 'destructive' : 
          status === 'in_progress' ? 'secondary' : 'outline'
        }
      >
        {statusConfig?.label || status}
      </Badge>
    );
  };

  const getTypeInfo = (type: string) => {
    return inspectionTypes.find(t => t.value === type) || { value: type, label: type, color: "bg-gray-500" };
  };

  const getRatingStars = (rating: number | null) => {
    if (!rating) return null;
    
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
          />
        ))}
        <span className="text-sm text-muted-foreground ml-1">({rating}/5)</span>
      </div>
    );
  };

  const isOverdue = (inspection: QualityInspection) => {
    if (inspection.status === 'passed' || inspection.status === 'cancelled') return false;
    return new Date(inspection.scheduled_date) < new Date() && !inspection.actual_date;
  };

  const filteredInspections = inspections.filter(inspection => {
    const matchesSearch = inspection.inspection_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inspection.inspector_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || inspection.status === statusFilter;
    const matchesType = typeFilter === "all" || inspection.inspection_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: inspections.length,
    scheduled: inspections.filter(i => i.status === 'scheduled').length,
    passed: inspections.filter(i => i.status === 'passed').length,
    failed: inspections.filter(i => i.status === 'failed').length,
    overdue: inspections.filter(i => isOverdue(i)).length,
    thisMonth: inspections.filter(i => {
      const thisMonth = new Date().getMonth();
      const inspectionMonth = new Date(i.scheduled_date).getMonth();
      return thisMonth === inspectionMonth;
    }).length
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando inspecciones...</p>
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
            <CheckCircle className="h-8 w-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
            <div className="text-sm text-muted-foreground">Programadas</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.passed}</div>
            <div className="text-sm text-muted-foreground">Aprobadas</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-sm text-muted-foreground">Fallidas</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.overdue}</div>
            <div className="text-sm text-muted-foreground">Vencidas</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.thisMonth}</div>
            <div className="text-sm text-muted-foreground">Este Mes</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Inspecciones de Calidad
              </CardTitle>
              <CardDescription>
                Control de calidad y cumplimiento regulatorio
              </CardDescription>
            </div>
            
            <Dialog open={newInspectionDialog} onOpenChange={setNewInspectionDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Inspección
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nueva Inspección de Calidad</DialogTitle>
                  <DialogDescription>
                    Programar una nueva inspección para el proyecto
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleCreateInspection)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="inspection_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre de la Inspección</FormLabel>
                            <FormControl>
                              <Input placeholder="Ej: Inspección estructural" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="inspection_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Código (Opcional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Ej: INS-001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="inspection_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Inspección</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {inspectionTypes.map(type => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
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
                        name="phase_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fase (Opcional)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar fase" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="">Sin fase específica</SelectItem>
                                {phases.map(phase => (
                                  <SelectItem key={phase.id} value={phase.id}>
                                    {phase.phase_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="inspector_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Inspector</FormLabel>
                            <FormControl>
                              <Input placeholder="Nombre del inspector" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="inspector_certification"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Certificación (Opcional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Número de certificación" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="scheduled_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Fecha Programada</FormLabel>
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
                                disabled={(date) => date < new Date()}
                                initialFocus
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="cost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Costo (Opcional)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="0.00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="duration_hours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duración (horas)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.5" placeholder="1.0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="remarks"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notas (Opcional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Observaciones adicionales..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setNewInspectionDialog(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit">Crear Inspección</Button>
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
                placeholder="Buscar inspecciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {statusOptions.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {inspectionTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Inspections List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredInspections.map((inspection) => {
          const typeInfo = getTypeInfo(inspection.inspection_type);
          const overdueFlag = isOverdue(inspection);
          
          return (
            <Card key={inspection.id} className={`relative ${overdueFlag ? 'border-red-200 bg-red-50' : ''}`}>
              {overdueFlag && (
                <div className="absolute top-2 right-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
              )}
              
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{inspection.inspection_name}</CardTitle>
                    <CardDescription>
                      {inspection.inspection_code && `${inspection.inspection_code} • `}
                      Inspector: {inspection.inspector_name}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-2">
                    {getStatusBadge(inspection.status)}
                    <Badge className={`${typeInfo.color} text-white text-xs`}>
                      {typeInfo.label}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarIcon className="h-4 w-4" />
                      <span>Programada:</span>
                    </div>
                    <div className="font-medium">
                      {format(new Date(inspection.scheduled_date), "PPP", { locale: es })}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Duración:</span>
                    </div>
                    <div className="font-medium">
                      {inspection.duration_hours ? `${inspection.duration_hours}h` : "No especificada"}
                    </div>
                  </div>
                </div>

                {inspection.actual_date && (
                  <div className="text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle className="h-4 w-4" />
                      <span>Realizada:</span>
                    </div>
                    <div className="font-medium">
                      {format(new Date(inspection.actual_date), "PPP", { locale: es })}
                    </div>
                  </div>
                )}

                {inspection.overall_rating && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Calificación:</div>
                    {getRatingStars(inspection.overall_rating)}
                  </div>
                )}

                {inspection.cost > 0 && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Costo: </span>
                    <span className="font-medium">${inspection.cost.toLocaleString()}</span>
                  </div>
                )}

                {inspection.remarks && (
                  <div className="text-sm">
                    <div className="text-muted-foreground mb-1">Observaciones:</div>
                    <div className="text-sm bg-muted p-2 rounded">
                      {inspection.remarks}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    Ver Detalles
                  </Button>
                  {inspection.status === 'scheduled' && (
                    <Button size="sm" className="flex-1">
                      Ejecutar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredInspections.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">No se encontraron inspecciones</p>
            <p className="text-muted-foreground">
              {inspections.length === 0 
                ? "Programa inspecciones para mantener la calidad del proyecto"
                : "Prueba ajustando los filtros de búsqueda"
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}