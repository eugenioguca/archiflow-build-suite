import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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

const activitySchema = z.object({
  activity_name: z.string().min(1, "El nombre de la actividad es requerido"),
  activity_code: z.string().optional(),
  activity_type: z.string().min(1, "El tipo de actividad es requerido"),
  priority: z.string().min(1, "La prioridad es requerida"),
  phase_id: z.string().optional(),
  estimated_start_date: z.date({
    required_error: "La fecha de inicio es requerida",
  }),
  estimated_end_date: z.date({
    required_error: "La fecha de fin es requerida",
  }),
  estimated_duration_days: z.number().min(1, "La duración debe ser mayor a 0"),
  critical_path: z.boolean().default(false),
  acceptance_criteria: z.string().optional(),
  notes: z.string().optional(),
}).refine((data) => data.estimated_end_date >= data.estimated_start_date, {
  message: "La fecha de fin debe ser posterior a la fecha de inicio",
  path: ["estimated_end_date"],
});

type ActivityFormData = z.infer<typeof activitySchema>;

interface TimelineActivityFormProps {
  projectId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TimelineActivityForm({ projectId, onSuccess, onCancel }: TimelineActivityFormProps) {
  const [loading, setLoading] = useState(false);
  const [phases, setPhases] = useState<any[]>([]);

  const activityTypes = [
    "task",
    "milestone", 
    "phase",
    "review",
    "approval"
  ];

  const activityTypeLabels = {
    task: "Tarea",
    milestone: "Hito",
    phase: "Fase",
    review: "Revisión",
    approval: "Aprobación"
  };

  const priorities = [
    { value: "low", label: "Baja" },
    { value: "medium", label: "Media" },
    { value: "high", label: "Alta" },
    { value: "critical", label: "Crítica" }
  ];

  const form = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      activity_name: "",
      activity_code: "",
      activity_type: "task",
      priority: "medium",
      phase_id: undefined,
      estimated_duration_days: 1,
      critical_path: false,
      acceptance_criteria: "",
      notes: "",
    },
  });

  useEffect(() => {
    fetchPhases();
  }, [projectId]);

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if ((name === "estimated_start_date" || name === "estimated_end_date") && 
          value.estimated_start_date && value.estimated_end_date) {
        const start = new Date(value.estimated_start_date);
        const end = new Date(value.estimated_end_date);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        form.setValue("estimated_duration_days", diffDays);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const fetchPhases = async () => {
    try {
      const { data, error } = await supabase
        .from("construction_phases")
        .select("*")
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

  const onSubmit = async (data: ActivityFormData) => {
    try {
      setLoading(true);

      // Get current user profile ID
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      // Get next activity order
      const { data: lastActivity } = await supabase
        .from("construction_timeline")
        .select("activity_order")
        .eq("project_id", projectId)
        .order("activity_order", { ascending: false })
        .limit(1)
        .single();

      const nextOrder = (lastActivity?.activity_order || 0) + 1;

      const activityData = {
        project_id: projectId,
        activity_name: data.activity_name,
        activity_code: data.activity_code || `ACT-${nextOrder}`,
        activity_type: data.activity_type,
        priority: data.priority,
        phase_id: data.phase_id || null,
        estimated_start_date: data.estimated_start_date.toISOString().split('T')[0],
        estimated_end_date: data.estimated_end_date.toISOString().split('T')[0],
        estimated_duration_days: data.estimated_duration_days,
        critical_path: data.critical_path,
        acceptance_criteria: data.acceptance_criteria || '',
        notes: data.notes || '',
        created_by: profile?.id || '',
        activity_order: nextOrder,
        level_depth: 0,
        parent_activity_id: null,
        status: 'not_started' as const,
        progress_percentage: 0,
        actual_duration_days: 0,
        total_float_days: 0,
        free_float_days: 0,
        wbs_code: null,
        predecessor_activities: [],
        successor_activities: [],
        resource_requirements: {},
        assigned_resources: [],
        resource_leveling: {},
        constraints: [],
        assumptions: [],
        risks: [],
        deliverables: [],
        quality_criteria: [],
        cost_budget: 0,
        cost_actual: 0,
        earned_value: 0,
      };

      const { error } = await supabase
        .from("construction_timeline")
        .insert(activityData);

      if (error) {
        console.error("Error creating activity:", error);
        toast.error("Error al crear la actividad");
        return;
      }

      toast.success("Actividad creada exitosamente");
      onSuccess();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al crear la actividad");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="activity_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre de la Actividad *</FormLabel>
                <FormControl>
                  <Input placeholder="Excavación de cimentación" {...field} />
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
                <FormLabel>Código (Opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="ACT-001" {...field} />
                </FormControl>
                <FormDescription>
                  Si no se especifica, se generará automáticamente
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="activity_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Actividad *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {activityTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {activityTypeLabels[type as keyof typeof activityTypeLabels]}
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
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prioridad *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar prioridad" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {priorities.map(priority => (
                      <SelectItem key={priority.value} value={priority.value}>
                        {priority.label}
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
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar fase" />
                    </SelectTrigger>
                  </FormControl>
                   <SelectContent>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="estimated_start_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha de Inicio *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "pl-3 text-left font-normal",
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
            name="estimated_end_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha de Fin *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "pl-3 text-left font-normal",
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
            name="estimated_duration_days"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duración (días)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="1"
                    {...field} 
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                  />
                </FormControl>
                <FormDescription>
                  Se calcula automáticamente con las fechas
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="critical_path"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel>Ruta Crítica</FormLabel>
                  <FormDescription>
                    Marcar si esta actividad es parte de la ruta crítica
                  </FormDescription>
                </div>
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="h-4 w-4"
                  />
                </FormControl>
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
                  placeholder="Criterios que deben cumplirse para considerar la actividad completada"
                  className="min-h-[80px]"
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
                  placeholder="Observaciones adicionales sobre la actividad"
                  className="min-h-[80px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-6 border-t bg-background sticky bottom-0">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creando..." : "Crear Actividad"}
          </Button>
        </div>
      </form>
    </Form>
  );
}