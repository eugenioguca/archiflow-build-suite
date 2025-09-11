import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PresupuestoParametrico {
  id: string;
  cliente_id: string;
  proyecto_id: string;
  departamento: string;
  mayor_id: string;
  partida_id: string;
  cantidad_requerida: number;
  precio_unitario: number;
  monto_total: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Relations
  mayor?: { codigo: string; nombre: string };
  partida?: { codigo: string; nombre: string };
}

export const usePresupuestoParametrico = (clienteId?: string, proyectoId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query for fetching presupuesto parametrico
  const presupuestoQuery = useQuery({
    queryKey: ['presupuesto-parametrico', clienteId, proyectoId],
    queryFn: async () => {
      let query = supabase
        .from('presupuesto_parametrico')
        .select(`
          *,
          mayor:chart_of_accounts_mayor(codigo, nombre),
          partida:chart_of_accounts_partidas(codigo, nombre)
        `)
        .order('created_at', { ascending: true });

      if (clienteId) {
        query = query.eq('cliente_id', clienteId);
      }
      
      if (proyectoId) {
        query = query.eq('proyecto_id', proyectoId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as PresupuestoParametrico[];
    },
    enabled: true,
  });

  // Mutation for creating presupuesto parametrico
  const createPresupuesto = useMutation({
    mutationFn: async (data: Omit<PresupuestoParametrico, 'id' | 'created_at' | 'updated_at' | 'monto_total' | 'created_by' | 'mayor' | 'partida'>) => {
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
        .from('presupuesto_parametrico')
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
      queryClient.invalidateQueries({ queryKey: ['presupuesto-parametrico'] });
      toast({
        title: "Partida creada",
        description: "La partida del presupuesto se ha creado exitosamente.",
      });
    },
    onError: (error) => {
      console.error('Error creating presupuesto parametrico:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la partida del presupuesto.",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating presupuesto parametrico
  const updatePresupuesto = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PresupuestoParametrico> }) => {
      const { data: result, error } = await supabase
        .from('presupuesto_parametrico')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presupuesto-parametrico'] });
      toast({
        title: "Partida actualizada",
        description: "La partida del presupuesto se ha actualizado exitosamente.",
      });
    },
    onError: (error) => {
      console.error('Error updating presupuesto parametrico:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la partida del presupuesto.",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting presupuesto parametrico
  const deletePresupuesto = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('presupuesto_parametrico')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presupuesto-parametrico'] });
      toast({
        title: "Partida eliminada",
        description: "La partida del presupuesto se ha eliminado.",
      });
    },
    onError: (error) => {
      console.error('Error deleting presupuesto parametrico:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la partida del presupuesto.",
        variant: "destructive",
      });
    },
  });

  // Trigger sync to Gantt when parametric data changes
  const triggerGanttSync = async () => {
    if (!clienteId || !proyectoId) return;
    
    // Trigger sync via a custom event that the Gantt can listen to
    window.dispatchEvent(new CustomEvent('parametric-budget-changed', {
      detail: { clienteId, proyectoId }
    }));
  };

  return {
    presupuestos: presupuestoQuery.data || [],
    isLoading: presupuestoQuery.isLoading,
    isError: presupuestoQuery.isError,
    error: presupuestoQuery.error,
    createPresupuesto: {
      ...createPresupuesto,
      mutateAsync: async (data: any) => {
        const result = await createPresupuesto.mutateAsync(data);
        triggerGanttSync();
        return result;
      }
    },
    updatePresupuesto: {
      ...updatePresupuesto,
      mutateAsync: async (params: any) => {
        const result = await updatePresupuesto.mutateAsync(params);
        triggerGanttSync();
        return result;
      }
    },
    deletePresupuesto: {
      ...deletePresupuesto,
      mutateAsync: async (id: string) => {
        const result = await deletePresupuesto.mutateAsync(id);
        triggerGanttSync();
        return result;
      }
    },
    refetch: presupuestoQuery.refetch,
  };
};