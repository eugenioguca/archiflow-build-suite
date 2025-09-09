import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useExecutivePartidas } from './useExecutivePartidas';
import type { PresupuestoEjecutivo } from '@/hooks/usePresupuestoEjecutivo';

export function useExecutiveBudget(clientId?: string, projectId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Hook para partidas ejecutivas (padre)
  const { executivePartidas, upsertExecutivePartida } = useExecutivePartidas(clientId, projectId);

  // Query for fetching executive budget items
  const executiveQuery = useQuery({
    queryKey: ['executive-budget', clientId, projectId],
    queryFn: async () => {
      if (!clientId || !projectId) return [];

      let query = supabase
        .from('presupuesto_ejecutivo')
        .select(`
          *,
          subpartida:chart_of_accounts_subpartidas(codigo, nombre)
        `)
        .eq('cliente_id', clientId)
        .eq('proyecto_id', projectId)
        .order('created_at', { ascending: true });

      const { data, error } = await query;
      
      if (error) throw error;
      return data as PresupuestoEjecutivo[];
    },
    enabled: Boolean(clientId && projectId),
  });

  // Mutation for creating executive budget item - temporarily use old structure
  const createExecutiveItem = useMutation({
    mutationFn: async (data: any) => {
      console.log('Creating executive item with data:', data);
      
      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Calculate total
      const monto_total = (data.cantidad || data.cantidad_requerida || 0) * (data.precio_unitario || 0);

      // Use old structure for now - will be updated after types regeneration
      const insertData = {
        cliente_id: clientId,
        proyecto_id: projectId,
        presupuesto_parametrico_id: data.presupuesto_parametrico_id,
        departamento: 'CONSTRUCCIÓN',
        mayor_id: data.mayor_id,
        partida_id: data.partida_id,
        subpartida_id: data.subpartida_id,
        unidad: data.unidad || 'PZA',
        cantidad_requerida: data.cantidad || data.cantidad_requerida || 1,
        precio_unitario: data.precio_unitario || 0,
        monto_total,
        created_by: profile.id
      };

      console.log('Inserting with data:', insertData);

      const { data: result, error } = await supabase
        .from('presupuesto_ejecutivo')
        .insert(insertData)
        .select(`
          *,
          mayor:chart_of_accounts_mayor(codigo, nombre),
          partida:chart_of_accounts_partidas(codigo, nombre),
          subpartida:chart_of_accounts_subpartidas(codigo, nombre)
        `)
        .single();
      
      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }
      
      console.log('Successfully created executive item:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['executive-budget'] });
      queryClient.invalidateQueries({ queryKey: ['executive-partidas'] });
      queryClient.invalidateQueries({ queryKey: ['executive-rollups'] });
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

  // Mutation for updating executive budget item
  const updateExecutiveItem = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const importe = (data.cantidad || 0) * (data.precio_unitario || 0);
      
      const { data: result, error } = await supabase
        .from('presupuesto_ejecutivo')
        .update({
          subpartida_id: data.subpartida_id,
          nombre_subpartida_snapshot: data.nombre_subpartida,
          unidad: data.unidad,
          cantidad: data.cantidad,
          precio_unitario: data.precio_unitario,
          importe,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          subpartida:chart_of_accounts_subpartidas(codigo, nombre)
        `)
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['executive-budget'] });
      queryClient.invalidateQueries({ queryKey: ['executive-partidas'] });
      queryClient.invalidateQueries({ queryKey: ['executive-rollups'] });
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

  // Mutation for deleting executive budget item
  const deleteExecutiveItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('presupuesto_ejecutivo')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['executive-budget'] });
      queryClient.invalidateQueries({ queryKey: ['executive-partidas'] });
      queryClient.invalidateQueries({ queryKey: ['executive-rollups'] });
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