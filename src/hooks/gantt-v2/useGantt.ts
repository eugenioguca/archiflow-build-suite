import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getCurrentMonth } from '@/utils/gantt-v2/monthRange';

export interface GanttPlan {
  id: string;
  cliente_id: string;
  proyecto_id: string;
  start_month: string;
  months_count: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface GanttLine {
  id: string;
  plan_id: string;
  line_no: number;
  mayor_id?: string;
  label?: string;
  is_discount: boolean;
  amount: number;
  percent?: number;
  order_index: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  // Relations
  mayor?: { id: string; codigo: string; nombre: string } | null;
  activities?: GanttActivity[];
}

export interface GanttActivity {
  id: string;
  line_id: string;
  start_month: string;
  start_week: number;
  end_month: string;
  end_week: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export const useGantt = (clientId?: string, projectId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch or create plan
  const planQuery = useQuery({
    queryKey: ['gantt-plan', clientId, projectId],
    queryFn: async () => {
      if (!clientId || !projectId) return null;

      console.log('[GANTT] Fetching/creating plan for:', { clientId, projectId });

      // Try to get existing plan
      const { data: existingPlan, error: planError } = await supabase
        .from('cronograma_gantt_plan')
        .select('*')
        .eq('cliente_id', clientId)
        .eq('proyecto_id', projectId)
        .maybeSingle();

      if (planError) {
        console.error('[GANTT] Error fetching plan:', planError);
        throw planError;
      }

      if (existingPlan) {
        console.log('[GANTT] Found existing plan:', existingPlan.id);
        return existingPlan as GanttPlan;
      }

      console.log('[GANTT] Creating new plan');
      // Create new plan with current month
      const { data: newPlan, error: createError } = await supabase
        .from('cronograma_gantt_plan')
        .insert([{
          cliente_id: clientId,
          proyecto_id: projectId,
          start_month: getCurrentMonth(),
          months_count: 12
        }])
        .select()
        .single();

      if (createError) {
        console.error('[GANTT] Error creating plan:', createError);
        throw createError;
      }
      
      console.log('[GANTT] Created new plan:', newPlan.id);
      return newPlan as GanttPlan;
    },
    enabled: !!clientId && !!projectId,
    staleTime: 60_000, // 1 minute
  });

  // Fetch lines with activities
  const linesQuery = useQuery({
    queryKey: ['gantt-lines', planQuery.data?.id],
    queryFn: async () => {
      if (!planQuery.data?.id) return [];

      console.log('[GANTT] Fetching lines for plan:', planQuery.data.id);

      const { data, error } = await supabase
        .from('cronograma_gantt_line')
        .select(`
          *,
          mayor:chart_of_accounts_mayor(id, codigo, nombre),
          activities:cronograma_gantt_activity(*)
        `)
        .eq('plan_id', planQuery.data.id)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('[GANTT] Error fetching lines:', error);
        throw error;
      }
      
      console.log('[GANTT] Fetched lines:', data?.length || 0);
      return data || [];
    },
    enabled: !!planQuery.data?.id,
    staleTime: 5_000, // 5 seconds
  });

  // Update plan mutation
  const updatePlan = useMutation({
    mutationFn: async (updates: Partial<GanttPlan>) => {
      if (!planQuery.data?.id) throw new Error('No plan found');
      
      const { data, error } = await supabase
        .from('cronograma_gantt_plan')
        .update(updates)
        .eq('id', planQuery.data.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gantt-plan'] });
      toast({
        title: "Plan actualizado",
        description: "Los cambios se han guardado correctamente."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el plan.",
        variant: "destructive"
      });
      console.error('Error updating plan:', error);
    }
  });

  // Atomic line + activity creation
  const addLineWithActivity = useMutation({
    mutationFn: async (params: {
      mayor_id: string;
      amount: number;
      is_discount: boolean;
      start_month: string;
      start_week: number;
      end_month: string;
      end_week: number;
    }) => {
      if (!planQuery.data?.id) throw new Error('No plan found');

      console.log('[ADD-LINE] payload=', { plan_id: planQuery.data.id, ...params });

      // Get next line number
      const { data: existingLines } = await supabase
        .from('cronograma_gantt_line')
        .select('line_no')
        .eq('plan_id', planQuery.data.id)
        .order('line_no', { ascending: false })
        .limit(1);

      const nextLineNo = existingLines && existingLines.length > 0 ? existingLines[0].line_no + 1 : 1;

      // 1) Insert line
      const { data: lineRow, error: lineError, status: s1 } = await supabase
        .from('cronograma_gantt_line')
        .insert({
          plan_id: planQuery.data.id,
          line_no: nextLineNo,
          mayor_id: params.mayor_id,
          amount: params.amount,
          is_discount: params.is_discount,
          order_index: nextLineNo
        })
        .select('id, amount')
        .single();

      if (lineError) {
        console.error('[ADD-LINE] insert line failed', s1, lineError);
        throw new Error(`Insert line failed: ${lineError.message} ${lineError.details || ''}`);
      }

      // 2) Insert activity
      const { error: activityError, status: s2 } = await supabase
        .from('cronograma_gantt_activity')
        .insert({
          line_id: lineRow.id,
          start_month: params.start_month,
          start_week: params.start_week,
          end_month: params.end_month,
          end_week: params.end_week
        });

      if (activityError) {
        console.error('[ADD-LINE] insert activity failed', s2, activityError);
        // rollback manual si es necesario
        await supabase.from('cronograma_gantt_line').delete().eq('id', lineRow.id);
        throw new Error(`Insert activity failed: ${activityError.message} ${activityError.details || ''}`);
      }

      console.log('[ADD-LINE] success line_id=', lineRow.id);
      return lineRow.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gantt-lines'] });
      toast({
        title: "Línea creada",
        description: "Nueva línea agregada al cronograma."
      });
    },
    onError: (error: any) => {
      const errorMsg = error?.message || "No se pudo crear la línea.";
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive"
      });
      console.error('Error in addLineWithActivity:', error);
    }
  });

  // Create line mutation (legacy - for backward compatibility)
  const createLine = useMutation({
    mutationFn: async (lineData: Omit<GanttLine, 'id' | 'created_at' | 'updated_at'>) => {
      if (!planQuery.data?.id) throw new Error('No plan found');

      // Get next line number
      const { data: existingLines } = await supabase
        .from('cronograma_gantt_line')
        .select('line_no')
        .eq('plan_id', planQuery.data.id)
        .order('line_no', { ascending: false })
        .limit(1);

      const nextLineNo = existingLines && existingLines.length > 0 ? existingLines[0].line_no + 1 : 1;

      const { data, error } = await supabase
        .from('cronograma_gantt_line')
        .insert([{
          ...lineData,
          plan_id: planQuery.data.id,
          line_no: nextLineNo
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gantt-lines'] });
      toast({
        title: "Línea creada",
        description: "Nueva línea agregada al cronograma."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo crear la línea.",
        variant: "destructive"
      });
      console.error('Error creating line:', error);
    }
  });

  // Update line mutation
  const updateLine = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<GanttLine> }) => {
      const { error } = await supabase
        .from('cronograma_gantt_line')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gantt-lines'] });
      toast({
        title: "Línea actualizada",
        description: "Los cambios se han guardado."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la línea.",
        variant: "destructive"
      });
      console.error('Error updating line:', error);
    }
  });

  // Delete line mutation
  const deleteLine = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cronograma_gantt_line')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gantt-lines'] });
      toast({
        title: "Línea eliminada",
        description: "La línea se ha removido del cronograma."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la línea.",
        variant: "destructive"
      });
      console.error('Error deleting line:', error);
    }
  });

  // Create activity mutation
  const createActivity = useMutation({
    mutationFn: async (activityData: Omit<GanttActivity, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('cronograma_gantt_activity')
        .insert([activityData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gantt-lines'] });
      toast({
        title: "Actividad creada",
        description: "Nueva actividad agregada al cronograma."
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
        .from('cronograma_gantt_activity')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gantt-lines'] });
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
        .from('cronograma_gantt_activity')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gantt-lines'] });
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

  return {
    plan: planQuery.data,
    lines: linesQuery.data || [],
    isLoading: planQuery.isLoading || linesQuery.isLoading,
    isFetching: planQuery.isFetching || linesQuery.isFetching,
    error: planQuery.error || linesQuery.error,
    updatePlan,
    addLineWithActivity,
    createLine,
    updateLine,
    deleteLine,
    createActivity,
    updateActivity,
    deleteActivity,
    refetch: () => {
      planQuery.refetch();
      linesQuery.refetch();
    }
  };
};