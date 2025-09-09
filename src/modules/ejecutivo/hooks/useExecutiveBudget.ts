import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useExecutivePartidas } from './useExecutivePartidas';
import { toNumber, validateMonetaryInput } from '@/utils/monetaryUtils';
import type { PresupuestoEjecutivo } from '@/hooks/usePresupuestoEjecutivo';

export function useExecutiveBudget(clientId?: string, projectId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Hook para partidas ejecutivas (padre)
  const { executivePartidas, upsertExecutivePartida } = useExecutivePartidas(clientId, projectId);

  // Query for fetching executive subpartidas
  const executiveQuery = useQuery({
    queryKey: ['executive-subpartidas', clientId, projectId],
    queryFn: async () => {
      if (!clientId || !projectId) return [];

      const { data, error } = await supabase
        .from('presupuesto_ejecutivo_subpartida')
        .select(`
          *,
          subpartida:chart_of_accounts_subpartidas(codigo, nombre),
           partida_ejecutivo:presupuesto_ejecutivo_partida(
             id,
             parametrico_id,
             parametrico:presupuesto_parametrico(
               id,
               mayor_id,
               partida_id,
               mayor:chart_of_accounts_mayor(codigo, nombre),
               partida:chart_of_accounts_partidas(codigo, nombre)
             )
           )
        `)
        .eq('cliente_id', clientId)
        .eq('proyecto_id', projectId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(clientId && projectId),
  });

  // Mutation for creating executive subpartida using two-step process
  const createExecutiveItem = useMutation({
    mutationFn: async (data: any) => {
      console.log('Creating executive subpartida with data:', data);
      
      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Parse and validate monetary values
      const sanitizedCant = toNumber(data.cantidad || 1);
      const sanitizedPU = toNumber(data.precio_unitario || 0);
      
      const validation = validateMonetaryInput(sanitizedCant, sanitizedPU);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      const importe = sanitizedCant * sanitizedPU;

      // Step 1: Upsert parent (presupuesto_ejecutivo_partida)
      const { data: pep, error: upsertError } = await supabase
        .from('presupuesto_ejecutivo_partida')
        .upsert({
          cliente_id: clientId,
          proyecto_id: projectId,
          parametrico_id: data.presupuesto_parametrico_id,
          created_by: profile.id
        }, { 
          onConflict: 'cliente_id,proyecto_id,parametrico_id',
          ignoreDuplicates: false 
        })
        .select('id')
        .single();

      if (upsertError) {
        console.error('Parent upsert error:', upsertError);
        throw upsertError;
      }

      console.log('Parent partida upserted:', pep);

      // Get subpartida data for snapshot
      const { data: subpartidaData } = await supabase
        .from('chart_of_accounts_subpartidas')
        .select('codigo, nombre')
        .eq('id', data.subpartida_id)
        .single();

      // Step 2: Insert child (presupuesto_ejecutivo_subpartida)
      const { data: result, error: insertError } = await supabase
        .from('presupuesto_ejecutivo_subpartida')
        .insert({
          cliente_id: clientId,
          proyecto_id: projectId,
          partida_ejecutivo_id: pep.id,
          subpartida_id: data.subpartida_id,
          nombre_snapshot: subpartidaData?.nombre || data.nombre_subpartida || 'Subpartida',
          codigo_snapshot: subpartidaData?.codigo || '',
          unidad: data.unidad || 'PZA',
          cantidad: sanitizedCant,
          precio_unitario: sanitizedPU,
          importe,
          created_by: profile.id
        })
        .select(`
          *,
          subpartida:chart_of_accounts_subpartidas(codigo, nombre),
          partida_ejecutivo:presupuesto_ejecutivo_partida(
            id,
            parametrico_id,
            parametrico:presupuesto_parametrico(
              id,
              mayor_id,
              partida_id,
              mayor:chart_of_accounts_mayor(codigo, nombre),
              partida:chart_of_accounts_partidas(codigo, nombre)
            )
          )
        `)
        .single();
      
      if (insertError) {
        console.error('Child insert error:', insertError);
        throw insertError;
      }

      // Step 3: Recalculate parent total (trigger should handle this automatically)
      console.log('Successfully created executive subpartida:', result);
      return result;
    },
    onSuccess: (newItem) => {
      // Invalidate queries with exact matching keys
      queryClient.invalidateQueries({ queryKey: ['executive-subpartidas', clientId, projectId] });
      queryClient.invalidateQueries({ queryKey: ['executive-partidas', clientId, projectId] });
      queryClient.invalidateQueries({ queryKey: ['executive-rollups', clientId, projectId] });
      
      // Log success for debugging
      console.log('Subpartida created successfully:', {
        id: newItem.id,
        partida_ejecutivo_id: newItem.partida_ejecutivo_id,
        nombre: newItem.nombre_snapshot
      });
      
      toast({
        title: "Subpartida creada",
        description: "La subpartida se ha agregado exitosamente.",
      });
    },
    onError: (error: any) => {
      console.error('Error creating executive item:', error);
      const errorMessage = error?.message || 'Error desconocido';
      toast({
        title: "Error",
        description: `No se pudo crear la subpartida: ${errorMessage}`,
        variant: "destructive",
      });
    },
  });

  // Mutation for updating executive subpartida
  const updateExecutiveItem = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      // Parse and validate monetary values
      const sanitizedCant = toNumber(data.cantidad || 1);
      const sanitizedPU = toNumber(data.precio_unitario || 0);
      
      const validation = validateMonetaryInput(sanitizedCant, sanitizedPU);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      const importe = sanitizedCant * sanitizedPU;
      
      // Get subpartida data for snapshot if updating subpartida_id
      let nombre_snapshot = data.nombre_subpartida || 'Subpartida';
      let codigo_snapshot = '';
      
      if (data.subpartida_id) {
        const { data: subpartidaData } = await supabase
          .from('chart_of_accounts_subpartidas')
          .select('codigo, nombre')
          .eq('id', data.subpartida_id)
          .single();
        
        if (subpartidaData) {
          nombre_snapshot = subpartidaData.nombre;
          codigo_snapshot = subpartidaData.codigo;
        }
      }

      const { data: result, error } = await supabase
        .from('presupuesto_ejecutivo_subpartida')
        .update({
          subpartida_id: data.subpartida_id,
          nombre_snapshot,
          codigo_snapshot,
          unidad: data.unidad,
          cantidad: sanitizedCant,
          precio_unitario: sanitizedPU,
          importe,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          subpartida:chart_of_accounts_subpartidas(codigo, nombre),
          partida_ejecutivo:presupuesto_ejecutivo_partida(
            id,
            parametrico_id,
            parametrico:presupuesto_parametrico(
              id,
              mayor_id,
              partida_id,
              mayor:chart_of_accounts_mayor(codigo, nombre),
              partida:chart_of_accounts_partidas(codigo, nombre)
            )
          )
        `)
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['executive-subpartidas', clientId, projectId] });
      queryClient.invalidateQueries({ queryKey: ['executive-partidas', clientId, projectId] });
      queryClient.invalidateQueries({ queryKey: ['executive-rollups', clientId, projectId] });
      toast({
        title: "Subpartida actualizada",
        description: "Los cambios se han guardado exitosamente.",
      });
    },
    onError: (error) => {
      console.error('Error updating executive item:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la subpartida.",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting executive subpartida
  const deleteExecutiveItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('presupuesto_ejecutivo_subpartida')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['executive-subpartidas', clientId, projectId] });
      queryClient.invalidateQueries({ queryKey: ['executive-partidas', clientId, projectId] });
      queryClient.invalidateQueries({ queryKey: ['executive-rollups', clientId, projectId] });
      toast({
        title: "Subpartida eliminada",
        description: "La subpartida se ha eliminado correctamente.",
      });
    },
    onError: (error) => {
      console.error('Error deleting executive item:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la subpartida.",
        variant: "destructive",
      });
    },
  });

  return {
    executiveItems: executiveQuery.data || [],
    executivePartidas: executivePartidas || [],
    isLoading: executiveQuery.isLoading,
    isError: executiveQuery.isError,
    error: executiveQuery.error,
    createExecutiveItem,
    updateExecutiveItem,
    deleteExecutiveItem,
    refetch: executiveQuery.refetch,
  };
}