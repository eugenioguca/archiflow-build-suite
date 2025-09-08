import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { PresupuestoEjecutivo } from '@/hooks/usePresupuestoEjecutivo';

export function useExecutiveBudget(clientId?: string, projectId?: string, parametricId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query for fetching executive budget items
  const executiveQuery = useQuery({
    queryKey: ['executive-budget', clientId, projectId, parametricId],
    queryFn: async () => {
      if (!clientId || !projectId || !parametricId) return [];

      let query = supabase
        .from('presupuesto_ejecutivo')
        .select(`
          *,
          mayor:chart_of_accounts_mayor(codigo, nombre),
          partida:chart_of_accounts_partidas(codigo, nombre),
          subpartida:chart_of_accounts_subpartidas(codigo, nombre)
        `)
        .eq('cliente_id', clientId)
        .eq('proyecto_id', projectId)
        .eq('presupuesto_parametrico_id', parametricId)
        .order('created_at', { ascending: true });

      const { data, error } = await query;
      
      if (error) throw error;
      return data as PresupuestoEjecutivo[];
    },
    enabled: Boolean(clientId && projectId && parametricId),
  });

  // Mutation for creating executive budget item
  const createExecutiveItem = useMutation({
    mutationFn: async (data: any) => {
      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { data: result, error } = await supabase
        .from('presupuesto_ejecutivo')
        .insert({
          cliente_id: clientId,
          proyecto_id: projectId,
          presupuesto_parametrico_id: parametricId,
          departamento: data.departamento,
          mayor_id: data.mayor_id,
          partida_id: data.partida_id,
          subpartida_id: data.subpartida_id,
          unidad: data.unidad,
          cantidad_requerida: data.cantidad_requerida,
          precio_unitario: data.precio_unitario,
          monto_total: data.cantidad_requerida * data.precio_unitario,
          created_by: profile.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['executive-budget'] });
      queryClient.invalidateQueries({ queryKey: ['executive-rollups'] });
      toast({
        title: "Subpartida creada",
        description: "La subpartida se ha agregado exitosamente.",
      });
    },
    onError: (error) => {
      console.error('Error creating executive item:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la subpartida.",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating executive budget item
  const updateExecutiveItem = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: result, error } = await supabase
        .from('presupuesto_ejecutivo')
        .update({
          ...data,
          monto_total: data.cantidad_requerida * data.precio_unitario,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['executive-budget'] });
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
    isLoading: executiveQuery.isLoading,
    isError: executiveQuery.isError,
    error: executiveQuery.error,
    createExecutiveItem,
    updateExecutiveItem,
    deleteExecutiveItem,
    refetch: executiveQuery.refetch,
  };
}