import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/DatePicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const milestoneSchema = z.object({
  milestone_name: z.string().min(1, "El nombre del hito es requerido"),
  description: z.string().optional(),
  target_date: z.date({ required_error: "La fecha objetivo es requerida" }),
  phase_id: z.string({ required_error: "Debe seleccionar una fase" }),
  milestone_code: z.string().optional(),
  is_critical: z.boolean().default(false),
  verification_criteria: z.string().optional(),
});

type MilestoneFormData = z.infer<typeof milestoneSchema>;

interface ConstructionMilestoneFormProps {
  projectId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface Phase {
  id: string;
  phase_name: string;
}

export function ConstructionMilestoneForm({ projectId, onSuccess, onCancel }: ConstructionMilestoneFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loadingPhases, setLoadingPhases] = useState(true);

  const form = useForm<MilestoneFormData>({
    resolver: zodResolver(milestoneSchema),
    defaultValues: {
      milestone_name: "",
      description: "",
      milestone_code: "",
      is_critical: false,
      verification_criteria: "",
    },
  });

  useEffect(() => {
    fetchPhases();
  }, [projectId]);

  const fetchPhases = async () => {
    try {
      const { data, error } = await supabase
        .from("construction_phases")
        .select("id, phase_name")
        .eq("project_id", projectId)
        .order("phase_order");

      if (error) {
        console.error("Error fetching phases:", error);
        toast.error("Error al cargar las fases");
        return;
      }

      setPhases(data || []);
    } catch (error) {
      console.error("Error fetching phases:", error);
      toast.error("Error al cargar las fases");
    } finally {
      setLoadingPhases(false);
    }
  };

  const onSubmit = async (data: MilestoneFormData) => {
    try {
      setIsSubmitting(true);

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

      // Get the next milestone order
      const { data: existingMilestones } = await supabase
        .from("construction_milestones")
        .select("milestone_order")
        .eq("project_id", projectId)
        .order("milestone_order", { ascending: false })
        .limit(1);

      const nextOrder = existingMilestones && existingMilestones.length > 0 
        ? (existingMilestones[0].milestone_order || 0) + 1 
        : 1;

      // Create the milestone
      const { error } = await supabase
        .from("construction_milestones")
        .insert({
          project_id: projectId,
          phase_id: data.phase_id,
          milestone_name: data.milestone_name,
          description: data.description,
          target_date: data.target_date.toISOString().split('T')[0],
          milestone_code: data.milestone_code,
          is_critical: data.is_critical,
          verification_criteria: data.verification_criteria,
          milestone_order: nextOrder,
          status: 'pending',
          created_by: profile.id,
        });

      if (error) {
        console.error("Error creating milestone:", error);
        toast.error("Error al crear el hito");
        return;
      }

      toast.success("Hito creado exitosamente");
      onSuccess();
    } catch (error) {
      console.error("Error in milestone creation:", error);
      toast.error("Error al crear el hito");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="milestone_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del Hito *</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Finalización de Cimentación" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="milestone_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código del Hito</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: H-CIM-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phase_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fase *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingPhases ? "Cargando fases..." : "Seleccionar fase"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {phases.map((phase) => (
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

          <FormField
            control={form.control}
            name="target_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha Objetivo *</FormLabel>
                <FormControl>
                  <DatePicker
                    date={field.value}
                    onDateChange={field.onChange}
                    placeholder="Seleccionar fecha"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe qué se debe lograr en este hito..."
                  rows={3}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="verification_criteria"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Criterios de Verificación</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Especifica cómo se verificará que el hito se ha completado..."
                  rows={2}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_critical"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Hito Crítico</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Marcar si este hito es crítico para el cronograma del proyecto
                </p>
              </div>
            </FormItem>
          )}
        />

        {phases.length === 0 && !loadingPhases && (
          <div className="text-center text-muted-foreground py-4 bg-muted/50 rounded-lg">
            <p>No hay fases disponibles. Primero crea una fase de construcción.</p>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting || phases.length === 0}>
            {isSubmitting ? "Guardando..." : "Crear Hito"}
          </Button>
        </div>
      </form>
    </Form>
  );
}