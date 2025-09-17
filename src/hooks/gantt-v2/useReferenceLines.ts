import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ReferenceLine {
  id: string;
  plan_id: string;
  position_month: string;
  position_week: number;
  label: string;
  color: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useReferenceLines(planId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch reference lines for the plan
  const referenceLinesQuery = useQuery({
    queryKey: ['reference-lines', planId],
    queryFn: async () => {
      if (!planId) return [];
      
      const { data, error } = await supabase
        .from('cronograma_gantt_reference_lines')
        .select('*')
        .eq('plan_id', planId)
        .order('position_month', { ascending: true })
        .order('position_week', { ascending: true });

      if (error) {
        console.error('Error fetching reference lines:', error);
        throw error;
      }

      return data as ReferenceLine[];
    },
    enabled: !!planId
  });

  // Create reference line mutation
  const createReferenceLine = useMutation({
    mutationFn: async (data: {
      plan_id: string;
      position_month: string;
      position_week: number;
      label?: string;
      color?: string;
    }) => {
      // Get current user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile) throw new Error('User profile not found');

      const { data: result, error } = await supabase
        .from('cronograma_gantt_reference_lines')
        .insert({
          plan_id: data.plan_id,
          position_month: data.position_month,
          position_week: data.position_week,
          label: data.label || 'Línea de Referencia',
          color: data.color || '#ef4444',
          created_by: profile.id
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reference-lines', planId] });
      toast({
        title: 'Línea agregada',
        description: 'La línea de referencia ha sido agregada correctamente'
      });
    },
    onError: (error: any) => {
      console.error('Error creating reference line:', error);
      toast({
        title: 'Error',
        description: 'No se pudo agregar la línea de referencia',
        variant: 'destructive'
      });
    }
  });

  // Update reference line mutation
  const updateReferenceLine = useMutation({
    mutationFn: async (data: {
      id: string;
      position_month?: string;
      position_week?: number;
      label?: string;
      color?: string;
    }) => {
      const { data: result, error } = await supabase
        .from('cronograma_gantt_reference_lines')
        .update({
          position_month: data.position_month,
          position_week: data.position_week,
          label: data.label,
          color: data.color,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reference-lines', planId] });
      toast({
        title: 'Línea actualizada',
        description: 'La línea de referencia ha sido actualizada correctamente'
      });
    },
    onError: (error: any) => {
      console.error('Error updating reference line:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la línea de referencia',
        variant: 'destructive'
      });
    }
  });

  // Delete reference line mutation
  const deleteReferenceLine = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cronograma_gantt_reference_lines')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reference-lines', planId] });
      toast({
        title: 'Línea eliminada',
        description: 'La línea de referencia ha sido eliminada correctamente'
      });
    },
    onError: (error: any) => {
      console.error('Error deleting reference line:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la línea de referencia',
        variant: 'destructive'
      });
    }
  });

  return {
    referenceLines: referenceLinesQuery.data || [],
    isLoading: referenceLinesQuery.isLoading,
    error: referenceLinesQuery.error,
    createReferenceLine,
    updateReferenceLine,
    deleteReferenceLine,
    refetch: referenceLinesQuery.refetch
  };
}