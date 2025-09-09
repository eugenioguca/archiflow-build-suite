import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PresupuestoEjecutivo {
  id: string;
  cliente_id: string;
  proyecto_id: string;
  partida_ejecutivo_id: string;
  subpartida_id: string;
  nombre_snapshot: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  importe: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Relations
  subpartida?: { codigo: string; nombre: string };
  partida_ejecutivo?: {
    id: string;
    parametrico?: {
      mayor_id: string;
      partida_id: string;
      mayor?: { codigo: string; nombre: string };
      partida?: { codigo: string; nombre: string };
    };
  };
}

// Fix circular reference by simplifying type
export const usePresupuestoEjecutivo = (clienteId?: string, proyectoId?: string, presupuestoParametricoId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query for fetching presupuesto ejecutivo
  const presupuestoEjecutivoQuery = useQuery({
    queryKey: ['presupuesto-ejecutivo', clienteId, proyectoId, presupuestoParametricoId],
    queryFn: async () => {
      let query = supabase
        .from('presupuesto_ejecutivo_subpartida')
        .select(`
          *,
          subpartida:chart_of_accounts_subpartidas(codigo, nombre),
          partida_ejecutivo:presupuesto_ejecutivo_partida(
            id,
            parametrico:presupuesto_parametrico(
              mayor_id,
              partida_id,
              mayor:chart_of_accounts_mayor(codigo, nombre),
              partida:chart_of_accounts_partidas(codigo, nombre)
            )
          )
        `)
        .order('created_at', { ascending: true });

      if (clienteId) {
        query = query.eq('cliente_id', clienteId);
      }
      
      if (proyectoId) {
        query = query.eq('proyecto_id', proyectoId);
      }

      if (presupuestoParametricoId) {
        // This filter is not applicable for the new structure
        // query = query.eq('presupuesto_parametrico_id', presupuestoParametricoId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
    enabled: true,
  });

  // Mutation for creating presupuesto ejecutivo subpartida
  const createPresupuestoEjecutivo = useMutation({
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
        .from('presupuesto_ejecutivo_subpartida')
        .insert({
          ...data,
          importe: data.cantidad * data.precio_unitario,
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

  // Mutation for updating presupuesto ejecutivo subpartida
  const updatePresupuestoEjecutivo = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const updateData = { 
        ...data, 
        updated_at: new Date().toISOString() 
      };
      
      // Recalculate importe if cantidad or precio_unitario changed
      if (data.cantidad !== undefined || data.precio_unitario !== undefined) {
        const { data: current } = await supabase
          .from('presupuesto_ejecutivo_subpartida')
          .select('cantidad, precio_unitario')
          .eq('id', id)
          .single();
        
        if (current) {
          const cantidad = data.cantidad ?? current.cantidad;
          const precio = data.precio_unitario ?? current.precio_unitario;
          updateData.importe = cantidad * precio;
        }
      }
      
      const { data: result, error } = await supabase
        .from('presupuesto_ejecutivo_subpartida')
        .update(updateData)
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

  // Mutation for deleting presupuesto ejecutivo subpartida
  const deletePresupuestoEjecutivo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('presupuesto_ejecutivo_subpartida')
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