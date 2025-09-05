import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MatrixOverride {
  id: string;
  cliente_id: string;
  proyecto_id: string;
  mes: string; // YYYYMM format
  concepto: string;
  valor: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export const useMatrixOverrides = (clientId?: string, projectId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch matrix overrides
  const overridesQuery = useQuery({
    queryKey: ['matrix-overrides', clientId, projectId],
    queryFn: async () => {
      if (!clientId || !projectId) return [];

      const { data, error } = await supabase
        .from('cronograma_matriz_manual')
        .select('*')
        .eq('cliente_id', clientId)
        .eq('proyecto_id', projectId)
        .order('mes', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId && !!projectId,
  });

  // Save matrix override mutation
  const saveOverride = useMutation({
    mutationFn: async (overrideData: Omit<MatrixOverride, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('cronograma_matriz_manual')
        .upsert(overrideData, { 
          onConflict: 'cliente_id,proyecto_id,mes,concepto',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matrix-overrides'] });
      toast({
        title: "Override guardado",
        description: "El valor manual se ha actualizado en la matriz."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo guardar el override de la matriz.",
        variant: "destructive"
      });
      console.error('Error saving matrix override:', error);
    }
  });

  // Delete matrix override mutation
  const deleteOverride = useMutation({
    mutationFn: async ({ mes, concepto }: { mes: string; concepto: string }) => {
      if (!clientId || !projectId) throw new Error('Client and Project IDs required');
      
      const { error } = await supabase
        .from('cronograma_matriz_manual')
        .delete()
        .eq('cliente_id', clientId)
        .eq('proyecto_id', projectId)
        .eq('mes', mes)
        .eq('concepto', concepto);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matrix-overrides'] });
      toast({
        title: "Override eliminado",
        description: "El valor manual se ha removido de la matriz."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el override de la matriz.",
        variant: "destructive"
      });
      console.error('Error deleting matrix override:', error);
    }
  });

  return {
    overrides: overridesQuery.data || [],
    isLoading: overridesQuery.isLoading,
    error: overridesQuery.error,
    saveOverride,
    deleteOverride,
    refetch: overridesQuery.refetch
  };
};