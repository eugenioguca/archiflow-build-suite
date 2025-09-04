import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface GanttActivity {
  id: string;
  cliente_id: string;
  proyecto_id: string;
  departamento: string;
  mayor_id: string;
  start_month: number;
  start_week: number;
  end_month: number;
  end_week: number;
  duration_weeks: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Relations
  mayor?: { id: string; codigo: string; nombre: string };
}

export interface ExpandedCell {
  month: number;
  week: number;
}

export const useCronogramaGantt = (clienteId?: string, proyectoId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch activities from cronograma_gantt table
  const activitiesQuery = useQuery({
    queryKey: ['cronograma-gantt-activities', clienteId, proyectoId],
    queryFn: async () => {
      if (!clienteId || !proyectoId) return [];

      const { data, error } = await supabase
        .from('cronograma_gantt')
        .select(`
          *,
          mayor:chart_of_accounts_mayor(id, codigo, nombre)
        `)
        .eq('cliente_id', clienteId)
        .eq('proyecto_id', proyectoId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as GanttActivity[];
    },
    enabled: !!clienteId && !!proyectoId,
  });

  // Fetch mayores for construction department
  const mayoresQuery = useQuery({
    queryKey: ['mayores-construccion'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chart_of_accounts_mayor')
        .select('id, nombre, codigo, departamento')
        .eq('departamento', 'Construcción')
        .eq('activo', true)
        .order('codigo');

      if (error) throw error;
      return data || [];
    },
  });

  // Create activity mutation
  const createActivity = useMutation({
    mutationFn: async (activityData: Omit<GanttActivity, 'id' | 'created_at' | 'updated_at'>) => {
      // Calculate dates based on months and weeks (simplified)
      const startDate = new Date();
      startDate.setMonth(activityData.start_month - 1);
      startDate.setDate(1 + (activityData.start_week - 1) * 7);
      
      const endDate = new Date();
      endDate.setMonth(activityData.end_month - 1);
      endDate.setDate(1 + (activityData.end_week - 1) * 7 + 6);

      const { data, error } = await supabase
        .from('cronograma_gantt')
        .insert([{
          cliente_id: activityData.cliente_id,
          proyecto_id: activityData.proyecto_id,
          departamento: 'CONSTRUCCIÓN',
          mayor_id: activityData.mayor_id,
          start_month: activityData.start_month,
          start_week: activityData.start_week,
          end_month: activityData.end_month,
          end_week: activityData.end_week,
          duration_weeks: activityData.duration_weeks,
          fecha_inicio: startDate.toISOString().split('T')[0],
          fecha_fin: endDate.toISOString().split('T')[0],
          duracion: activityData.duration_weeks * 7,
          created_by: activityData.created_by
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cronograma-gantt-activities'] });
      toast({
        title: "Actividad creada",
        description: "La actividad se ha agregado al cronograma."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo crear la actividad.",
        variant: "destructive"
      });
      console.error('Error creating activity:', error);
    }
  });

  // Update activity mutation
  const updateActivity = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<GanttActivity> }) => {
      const { error } = await supabase
        .from('cronograma_gantt')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cronograma-gantt-activities'] });
      toast({
        title: "Actividad actualizada",
        description: "Los cambios se han guardado."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la actividad.",
        variant: "destructive"
      });
      console.error('Error updating activity:', error);
    }
  });

  // Delete activity mutation
  const deleteActivity = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cronograma_gantt')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cronograma-gantt-activities'] });
      toast({
        title: "Actividad eliminada",
        description: "La actividad se ha removido del cronograma."
      });
    },
    onError: (error) => {
      toast({
        title: "Error", 
        description: "No se pudo eliminar la actividad.",
        variant: "destructive"
      });
      console.error('Error deleting activity:', error);
    }
  });

  // Refetch function
  const refetch = () => {
    activitiesQuery.refetch();
  };

  return {
    activities: activitiesQuery.data || [],
    mayores: mayoresQuery.data || [],
    isLoading: activitiesQuery.isLoading || mayoresQuery.isLoading,
    error: activitiesQuery.error || mayoresQuery.error,
    createActivity,
    updateActivity,
    deleteActivity,
    refetch
  };
};