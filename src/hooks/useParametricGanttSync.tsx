import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ParametricTotal {
  cliente_id: string;
  proyecto_id: string;
  mayor_id: string;
  mayor_codigo: string;
  mayor_nombre: string;
  total_mayor: number;
  orden_minimo: number;
}

export interface SyncLink {
  id: string;
  cliente_id: string;
  proyecto_id: string;
  mayor_id: string;
  cronograma_line_id: string;
  source: 'parametrico';
  override_importe: boolean;
  last_synced_total: number;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
}

export const useParametricGanttSync = (clientId?: string, projectId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch parametric budget totals by mayor
  const parametricTotalsQuery = useQuery({
    queryKey: ['parametric-totals', clientId, projectId],
    queryFn: async () => {
      if (!clientId || !projectId) return [];

      const { data, error } = await supabase.rpc('get_parametric_budget_totals', {
        cliente_id_param: clientId,
        proyecto_id_param: projectId
      });

      if (error) throw error;
      return (data || []) as ParametricTotal[];
    },
    enabled: !!clientId && !!projectId,
    staleTime: 30_000, // 30 seconds
  });

  // Fetch existing sync links
  const syncLinksQuery = useQuery({
    queryKey: ['sync-links', clientId, projectId],
    queryFn: async () => {
      if (!clientId || !projectId) return [];

      const { data, error } = await supabase
        .from('cronograma_vinculos_parametrico')
        .select('*')
        .eq('cliente_id', clientId)
        .eq('proyecto_id', projectId)
        .eq('source', 'parametrico');

      if (error) throw error;
      return (data || []) as SyncLink[];
    },
    enabled: !!clientId && !!projectId,
    staleTime: 30_000,
  });

  // Main synchronization mutation
  const syncFromParametric = useMutation({
    mutationFn: async () => {
      if (!clientId || !projectId) throw new Error('Client and Project IDs required');

      console.log('[SYNC] Starting sync from parametric to Gantt:', { clientId, projectId });

      // Get current totals and existing links
      const totals = parametricTotalsQuery.data || [];
      const existingLinks = syncLinksQuery.data || [];

      let newImports = 0;
      let updatedImports = 0;
      let outOfSyncLines = 0;

      // Process each parametric total
      for (const total of totals) {
        const existingLink = existingLinks.find(link => link.mayor_id === total.mayor_id);

        if (!existingLink) {
          // Create new imported line in Gantt
          await createImportedGanttLine(total);
          newImports++;
        } else {
          // Update existing imported line
          await updateImportedGanttLine(existingLink, total);
          updatedImports++;
        }
      }

      // Handle lines that no longer exist in parametric
      const currentMayorIds = totals.map(t => t.mayor_id);
      const linksToMarkOutOfSync = existingLinks.filter(
        link => !currentMayorIds.includes(link.mayor_id)
      );

      for (const link of linksToMarkOutOfSync) {
        await markLineOutOfSync(link.cronograma_line_id);
        outOfSyncLines++;
      }

      console.log('[SYNC] Completed:', { newImports, updatedImports, outOfSyncLines });

      return {
        success: true, 
        newImports, 
        updatedImports, 
        outOfSyncLines,
        message: `Sincronización completada: ${newImports} nuevos, ${updatedImports} actualizados, ${outOfSyncLines} fuera de sync.`
      };
    },
    onSuccess: (result) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['gantt-lines'] });
      queryClient.invalidateQueries({ queryKey: ['sync-links'] });
      
      toast({
        title: "Sincronización exitosa",
        description: result.message,
      });
    },
    onError: (error) => {
      console.error('[SYNC] Error:', error);
      toast({
        title: "Error de sincronización",
        description: "No se pudo sincronizar desde el Presupuesto Paramétrico.",
        variant: "destructive",
      });
    }
  });

  // Helper function to create new imported Gantt line
  const createImportedGanttLine = async (total: ParametricTotal) => {
    console.log('[SYNC] Creating new line for mayor:', total.mayor_id);

    // First get the Gantt plan
    const { data: plan } = await supabase
      .from('cronograma_gantt_plan')
      .select('id')
      .eq('cliente_id', clientId)
      .eq('proyecto_id', projectId)
      .single();

    if (!plan) throw new Error('No Gantt plan found');

    // Get next line number
    const { data: existingLines } = await supabase
      .from('cronograma_gantt_line')
      .select('line_no')
      .eq('plan_id', plan.id)
      .order('line_no', { ascending: false })
      .limit(1);

    const nextLineNo = existingLines && existingLines.length > 0 ? existingLines[0].line_no + 1 : 1;

    // Create the Gantt line with correct order from parametric
    const { data: newLine, error: lineError } = await supabase
      .from('cronograma_gantt_line')
      .insert({
        plan_id: plan.id,
        line_no: nextLineNo,
        mayor_id: total.mayor_id,
        amount: total.total_mayor,
        is_discount: false,
        order_index: total.orden_minimo, // Use parametric order
        es_importado: true,
        estado_sync: 'pendiente_fechas' // Pending dates until user sets them
      })
      .select('id')
      .single();

    if (lineError) throw lineError;

    // Create the sync link
    const { error: linkError } = await supabase
      .from('cronograma_vinculos_parametrico')
      .insert({
        cliente_id: clientId,
        proyecto_id: projectId,
        mayor_id: total.mayor_id,
        cronograma_line_id: newLine.id,
        source: 'parametrico',
        last_synced_total: total.total_mayor,
        last_synced_at: new Date().toISOString()
      });

    if (linkError) throw linkError;

    toast({
      title: "Mayor importado",
      description: `Se importó "${total.mayor_nombre}" desde Presupuesto Paramétrico. Selecciona fechas para completar.`,
    });
  };

  // Helper function to update existing imported line
  const updateImportedGanttLine = async (link: SyncLink, total: ParametricTotal) => {
    if (link.override_importe) {
      console.log('[SYNC] Skipping update due to override flag:', link.mayor_id);
      return;
    }

    if (link.last_synced_total === total.total_mayor) {
      console.log('[SYNC] No change in amount, skipping:', link.mayor_id);
      return;
    }

    console.log('[SYNC] Updating line amount:', link.mayor_id, link.last_synced_total, '->', total.total_mayor);

    // Update the Gantt line amount
    const { error: lineError } = await supabase
      .from('cronograma_gantt_line')
      .update({
        amount: total.total_mayor
      })
      .eq('id', link.cronograma_line_id);

    if (lineError) throw lineError;

    // Update the sync link
    const { error: linkError } = await supabase
      .from('cronograma_vinculos_parametrico')
      .update({
        last_synced_total: total.total_mayor,
        last_synced_at: new Date().toISOString()
      })
      .eq('id', link.id);

    if (linkError) throw linkError;

    toast({
      title: "Importe actualizado",
      description: `Se actualizó el importe de "${total.mayor_nombre}" desde Presupuesto Paramétrico.`,
    });
  };

  // Helper function to mark line as out of sync
  const markLineOutOfSync = async (lineId: string) => {
    console.log('[SYNC] Marking line out of sync:', lineId);

    const { error } = await supabase
      .from('cronograma_gantt_line')
      .update({
        estado_sync: 'fuera_de_sync'
      })
      .eq('id', lineId);

    if (error) throw error;
  };

  // Toggle override import flag
  const toggleOverrideImporte = useMutation({
    mutationFn: async ({ linkId, override }: { linkId: string; override: boolean }) => {
      const { error } = await supabase
        .from('cronograma_vinculos_parametrico')
        .update({ override_importe: override })
        .eq('id', linkId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-links'] });
      toast({
        title: "Override actualizado",
        description: "Se ha actualizado la configuración de sobrescritura."
      });
    },
    onError: (error) => {
      console.error('Error toggling override:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la configuración.",
        variant: "destructive"
      });
    }
  });

  return {
    parametricTotals: parametricTotalsQuery.data || [],
    syncLinks: syncLinksQuery.data || [],
    isLoadingTotals: parametricTotalsQuery.isLoading,
    isLoadingLinks: syncLinksQuery.isLoading,
    isSyncing: syncFromParametric.isPending,
    syncFromParametric,
    toggleOverrideImporte,
    refetch: () => {
      parametricTotalsQuery.refetch();
      syncLinksQuery.refetch();
    }
  };
};