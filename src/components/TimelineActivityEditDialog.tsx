import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";

const editActivitySchema = z.object({
  activity_name: z.string().min(1, "El nombre de la actividad es requerido"),
  activity_code: z.string().optional(),
  activity_type: z.string().min(1, "El tipo de actividad es requerido"),
  priority: z.string().min(1, "La prioridad es requerida"),
  phase_id: z.string().optional(),
  estimated_start_date: z.date({
    required_error: "La fecha de inicio estimada es requerida",
  }),
  estimated_end_date: z.date({
    required_error: "La fecha de fin estimada es requerida",
  }),
  actual_start_date: z.date().optional(),
  actual_end_date: z.date().optional(),
  estimated_duration_days: z.number().min(1, "La duración debe ser mayor a 0"),
  actual_duration_days: z.number().optional(),
  progress_percentage: z.number().min(0).max(100),
  status: z.string().min(1, "El estado es requerido"),
  cost_budget: z.number().min(0, "El costo presupuestado debe ser mayor o igual a 0"),
  cost_actual: z.number().min(0, "El costo actual debe ser mayor o igual a 0"),
  critical_path: z.boolean().default(false),
  acceptance_criteria: z.string().optional(),
  notes: z.string().optional(),
}).refine((data) => data.estimated_end_date >= data.estimated_start_date, {
  message: "La fecha de fin debe ser posterior a la fecha de inicio",
  path: ["estimated_end_date"],
}).refine((data) => !data.actual_end_date || !data.actual_start_date || data.actual_end_date >= data.actual_start_date, {
  message: "La fecha de fin real debe ser posterior a la fecha de inicio real",
  path: ["actual_end_date"],
});

type EditActivityFormData = z.infer<typeof editActivitySchema>;

interface TimelineActivityEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: any;
  onUpdate?: () => void;
}

export function TimelineActivityEditDialog({ 
  open, 
  onOpenChange, 
  activity, 
  onUpdate 
}: TimelineActivityEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [phases, setPhases] = useState<any[]>([]);
  
  const form = useForm<EditActivityFormData>({
    resolver: zodResolver(editActivitySchema),
    defaultValues: {
      activity_name: activity?.activity_name || "",
      activity_code: activity?.activity_code || "",
      activity_type: activity?.activity_type || "task",
      priority: activity?.priority || "medium",
      phase_id: activity?.phase_id || "",
      estimated_start_date: activity?.estimated_start_date ? new Date(activity.estimated_start_date) : new Date(),
      estimated_end_date: activity?.estimated_end_date ? new Date(activity.estimated_end_date) : new Date(),
      actual_start_date: activity?.actual_start_date ? new Date(activity.actual_start_date) : undefined,
      actual_end_date: activity?.actual_end_date ? new Date(activity.actual_end_date) : undefined,
      estimated_duration_days: activity?.estimated_duration_days || 1,
      actual_duration_days: activity?.actual_duration_days || 0,
      progress_percentage: activity?.progress_percentage || 0,
      status: activity?.status || "not_started",
      cost_budget: activity?.cost_budget || 0,
      cost_actual: activity?.cost_actual || 0,
      critical_path: activity?.critical_path || false,
      acceptance_criteria: activity?.acceptance_criteria || "",
      notes: activity?.notes || "",
    },
  });

  useEffect(() => {
    if (activity && open) {
      // Reset form with activity data when dialog opens
      form.reset({
        activity_name: activity.activity_name || "",
        activity_code: activity.activity_code || "",
        activity_type: activity.activity_type || "task",
        priority: activity.priority || "medium",
        phase_id: activity.phase_id || "",
        estimated_start_date: activity.estimated_start_date ? new Date(activity.estimated_start_date) : new Date(),
        estimated_end_date: activity.estimated_end_date ? new Date(activity.estimated_end_date) : new Date(),
        actual_start_date: activity.actual_start_date ? new Date(activity.actual_start_date) : undefined,
        actual_end_date: activity.actual_end_date ? new Date(activity.actual_end_date) : undefined,
        estimated_duration_days: activity.estimated_duration_days || 1,
        actual_duration_days: activity.actual_duration_days || 0,
        progress_percentage: activity.progress_percentage || 0,
        status: activity.status || "not_started",
        cost_budget: activity.cost_budget || 0,
        cost_actual: activity.cost_actual || 0,
        critical_path: activity.critical_path || false,
        acceptance_criteria: activity.acceptance_criteria || "",
        notes: activity.notes || "",
      });
      
      fetchPhases();
    }
  }, [activity, open, form]);

  // Watch start and end dates to auto-calculate duration
  const watchedStartDate = form.watch("estimated_start_date");
  const watchedEndDate = form.watch("estimated_end_date");

  useEffect(() => {
    if (watchedStartDate && watchedEndDate) {
      const timeDiff = watchedEndDate.getTime() - watchedStartDate.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
      if (daysDiff > 0) {
        form.setValue("estimated_duration_days", daysDiff);
      }
    }
  }, [watchedStartDate, watchedEndDate, form]);

  const fetchPhases = async () => {
    try {
      const { data, error } = await supabase
        .from("construction_phases")
        .select("*")
        .eq("project_id", activity.project_id)
        .order("phase_order");

      if (error) throw error;
      setPhases(data || []);
    } catch (error) {
      console.error("Error fetching phases:", error);
    }
  };

  const onSubmit = async (data: EditActivityFormData) => {
    try {
      setLoading(true);

      const updateData = {
        activity_name: data.activity_name,
        activity_code: data.activity_code,
        activity_type: data.activity_type,
        priority: data.priority,
        phase_id: data.phase_id || null,
        estimated_start_date: data.estimated_start_date.toISOString().split('T')[0],
        estimated_end_date: data.estimated_end_date.toISOString().split('T')[0],
        actual_start_date: data.actual_start_date?.toISOString().split('T')[0] || null,
        actual_end_date: data.actual_end_date?.toISOString().split('T')[0] || null,
        estimated_duration_days: data.estimated_duration_days,
        actual_duration_days: data.actual_duration_days || 0,
        progress_percentage: data.progress_percentage,
        status: data.status,
        cost_budget: data.cost_budget,
        cost_actual: data.cost_actual,
        critical_path: data.critical_path,
        acceptance_criteria: data.acceptance_criteria,
        notes: data.notes,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("construction_timeline")
        .update(updateData)
        .eq("id", activity.id);

      if (error) throw error;

      toast.success("Actividad actualizada correctamente");
      onOpenChange(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error updating activity:", error);
      toast.error("Error al actualizar la actividad");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Actividad</DialogTitle>
          <DialogDescription>
            Modifica los detalles de la actividad del cronograma
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="activity_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la Actividad</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre de la actividad" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="activity_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código de Actividad</FormLabel>
                    <FormControl>
                      <Input placeholder="Código único" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="activity_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Actividad</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="task">Tarea</SelectItem>
                        <SelectItem value="milestone">Hito</SelectItem>
                        <SelectItem value="summary">Resumen</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridad</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar prioridad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Baja</SelectItem>
                        <SelectItem value="medium">Media</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="critical">Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="not_started">No Iniciado</SelectItem>
                        <SelectItem value="in_progress">En Progreso</SelectItem>
                        <SelectItem value="completed">Completado</SelectItem>
                        <SelectItem value="on_hold">En Espera</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="progress_percentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Progreso: {field.value}%</FormLabel>
                  <FormControl>
                    <Slider
                      value={[field.value]}
                      onValueChange={(value) => field.onChange(value[0])}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="estimated_start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Inicio Estimada</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es })
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
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimated_end_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Fin Estimada</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es })
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
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="actual_start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Inicio Real</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es })
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
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="actual_end_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Fin Real</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es })
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
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cost_budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo Presupuestado</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cost_actual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo Real</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="acceptance_criteria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Criterios de Aceptación</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Criterios para considerar la actividad completada..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Comentarios adicionales..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}