import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CronogramaGantt {
  id: string;
  cliente_id: string;
  proyecto_id: string;
  departamento: string;
  mayor_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  duracion: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Relations
  mayor?: { codigo: string; nombre: string };
}

export const useCronogramaGantt = (clienteId?: string, proyectoId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query for fetching cronograma gantt
  const cronogramaQuery = useQuery({
    queryKey: ['cronograma-gantt', clienteId, proyectoId],
    queryFn: async () => {
      let query = supabase
        .from('cronograma_gantt')
        .select(`
          *,
          mayor:chart_of_accounts_mayor(codigo, nombre)
        `)
        .order('fecha_inicio', { ascending: true });

      if (clienteId) {
        query = query.eq('cliente_id', clienteId);
      }
      
      if (proyectoId) {
        query = query.eq('proyecto_id', proyectoId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as CronogramaGantt[];
    },
    enabled: true,
  });

  // Mutation for creating cronograma gantt
  const createCronograma = useMutation({
    mutationFn: async (data: Omit<CronogramaGantt, 'id' | 'created_at' | 'updated_at' | 'duracion' | 'created_by' | 'mayor'>) => {
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
        .from('cronograma_gantt')
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
      queryClient.invalidateQueries({ queryKey: ['cronograma-gantt'] });
      toast({
        title: "Actividad creada",
        description: "La actividad del cronograma se ha creado exitosamente.",
      });
    },
    onError: (error) => {
      console.error('Error creating cronograma gantt:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la actividad del cronograma.",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating cronograma gantt
  const updateCronograma = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CronogramaGantt> }) => {
      const { data: result, error } = await supabase
        .from('cronograma_gantt')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cronograma-gantt'] });
      toast({
        title: "Actividad actualizada",
        description: "La actividad del cronograma se ha actualizado exitosamente.",
      });
    },
    onError: (error) => {
      console.error('Error updating cronograma gantt:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la actividad del cronograma.",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting cronograma gantt
  const deleteCronograma = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cronograma_gantt')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cronograma-gantt'] });
      toast({
        title: "Actividad eliminada",
        description: "La actividad del cronograma se ha eliminado.",
      });
    },
    onError: (error) => {
      console.error('Error deleting cronograma gantt:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la actividad del cronograma.",
        variant: "destructive",
      });
    },
  });

  return {
    cronogramas: cronogramaQuery.data || [],
    isLoading: cronogramaQuery.isLoading,
    isError: cronogramaQuery.isError,
    error: cronogramaQuery.error,
    createCronograma,
    updateCronograma,
    deleteCronograma,
    refetch: cronogramaQuery.refetch,
  };
};