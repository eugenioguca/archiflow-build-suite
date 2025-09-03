import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PresupuestoEjecutivo {
  id: string;
  cliente_id: string;
  proyecto_id: string;
  presupuesto_parametrico_id: string;
  departamento: string;
  mayor_id: string;
  partida_id: string;
  subpartida_id: string;
  unidad: string;
  cantidad_requerida: number;
  precio_unitario: number;
  monto_total: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Relations
  mayor?: { codigo: string; nombre: string };
  partida?: { codigo: string; nombre: string };
  subpartida?: { codigo: string; nombre: string };
}

export const usePresupuestoEjecutivo = (clienteId?: string, proyectoId?: string, presupuestoParametricoId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query for fetching presupuesto ejecutivo
  const presupuestoEjecutivoQuery = useQuery({
    queryKey: ['presupuesto-ejecutivo', clienteId, proyectoId, presupuestoParametricoId],
    queryFn: async () => {
      let query = supabase
        .from('presupuesto_ejecutivo')
        .select(`
          *,
          mayor:chart_of_accounts_mayor(codigo, nombre),
          partida:chart_of_accounts_partidas(codigo, nombre),
          subpartida:chart_of_accounts_subpartidas(codigo, nombre)
        `)
        .order('created_at', { ascending: true });

      if (clienteId) {
        query = query.eq('cliente_id', clienteId);
      }
      
      if (proyectoId) {
        query = query.eq('proyecto_id', proyectoId);
      }

      if (presupuestoParametricoId) {
        query = query.eq('presupuesto_parametrico_id', presupuestoParametricoId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as PresupuestoEjecutivo[];
    },
    enabled: true,
  });

  // Mutation for creating presupuesto ejecutivo
  const createPresupuestoEjecutivo = useMutation({
    mutationFn: async (data: Omit<PresupuestoEjecutivo, 'id' | 'created_at' | 'updated_at' | 'monto_total' | 'created_by' | 'mayor' | 'partida' | 'subpartida'>) => {
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
          ...data,
          created_by: profile.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presupuesto-ejecutivo'] });
      toast({
        title: "Subpartida creada",
        description: "La subpartida del presupuesto ejecutivo se ha creado exitosamente.",
      });
    },
    onError: (error) => {
      console.error('Error creating presupuesto ejecutivo:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la subpartida del presupuesto ejecutivo.",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating presupuesto ejecutivo
  const updatePresupuestoEjecutivo = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PresupuestoEjecutivo> }) => {
      const { data: result, error } = await supabase
        .from('presupuesto_ejecutivo')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presupuesto-ejecutivo'] });
      toast({
        title: "Subpartida actualizada",
        description: "La subpartida del presupuesto ejecutivo se ha actualizado exitosamente.",
      });
    },
    onError: (error) => {
      console.error('Error updating presupuesto ejecutivo:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la subpartida del presupuesto ejecutivo.",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting presupuesto ejecutivo
  const deletePresupuestoEjecutivo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('presupuesto_ejecutivo')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presupuesto-ejecutivo'] });
      toast({
        title: "Subpartida eliminada",
        description: "La subpartida del presupuesto ejecutivo se ha eliminado.",
      });
    },
    onError: (error) => {
      console.error('Error deleting presupuesto ejecutivo:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la subpartida del presupuesto ejecutivo.",
        variant: "destructive",
      });
    },
  });

  return {
    presupuestosEjecutivo: presupuestoEjecutivoQuery.data || [],
    isLoading: presupuestoEjecutivoQuery.isLoading,
    isError: presupuestoEjecutivoQuery.isError,
    error: presupuestoEjecutivoQuery.error,
    createPresupuestoEjecutivo,
    updatePresupuestoEjecutivo,
    deletePresupuestoEjecutivo,
    refetch: presupuestoEjecutivoQuery.refetch,
  };
};