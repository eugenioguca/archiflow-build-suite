import { useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const phaseSchema = z.object({
  phase_name: z.string().min(1, "El nombre de la fase es requerido"),
  description: z.string().optional(),
  estimated_start_date: z.date().optional(),
  estimated_end_date: z.date().optional(),
  estimated_duration_days: z.number().min(1, "La duración debe ser mayor a 0").optional(),
  phase_code: z.string().optional(),
});

type PhaseFormData = z.infer<typeof phaseSchema>;

interface ConstructionPhaseFormProps {
  projectId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ConstructionPhaseForm({ projectId, onSuccess, onCancel }: ConstructionPhaseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PhaseFormData>({
    resolver: zodResolver(phaseSchema),
    defaultValues: {
      phase_name: "",
      description: "",
      phase_code: "",
    },
  });

  const onSubmit = async (data: PhaseFormData) => {
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

      // Get the next phase order
      const { data: existingPhases } = await supabase
        .from("construction_phases")
        .select("phase_order")
        .eq("project_id", projectId)
        .order("phase_order", { ascending: false })
        .limit(1);

      const nextOrder = existingPhases && existingPhases.length > 0 
        ? (existingPhases[0].phase_order || 0) + 1 
        : 1;

      // Create the phase
      const { error } = await supabase
        .from("construction_phases")
        .insert({
          project_id: projectId,
          phase_name: data.phase_name,
          description: data.description,
          estimated_start_date: data.estimated_start_date?.toISOString().split('T')[0],
          estimated_end_date: data.estimated_end_date?.toISOString().split('T')[0],
          estimated_duration_days: data.estimated_duration_days,
          phase_code: data.phase_code,
          phase_order: nextOrder,
          status: 'pending',
          created_by: profile.id,
        });

      if (error) {
        console.error("Error creating phase:", error);
        toast.error("Error al crear la fase");
        return;
      }

      toast.success("Fase creada exitosamente");
      onSuccess();
    } catch (error) {
      console.error("Error in phase creation:", error);
      toast.error("Error al crear la fase");
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
            name="phase_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre de la Fase *</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Cimentación" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phase_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código de Fase</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: CIM-001" {...field} />
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
                  placeholder="Describe los trabajos que incluye esta fase..."
                  rows={3}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="estimated_start_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de Inicio Estimada</FormLabel>
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

          <FormField
            control={form.control}
            name="estimated_end_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de Fin Estimada</FormLabel>
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
                    placeholder="30"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Crear Fase"}
          </Button>
        </div>
      </form>
    </Form>
  );
}