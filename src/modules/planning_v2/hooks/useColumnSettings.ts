import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ColumnSetting {
  key: string;
  label: string;
  type: 'input' | 'computed';
  visible: boolean;
  formula?: string;
}

export function useColumnSettings(budgetId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['planning-v2-column-settings', user?.id, budgetId],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('planning_v2_user_settings')
        .select('visible_columns')
        .eq('user_id', user.id)
        .eq('budget_id', budgetId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching column settings:', error);
        return null;
      }

      return (data?.visible_columns as unknown as ColumnSetting[]) || null;
    },
    enabled: !!user?.id && !!budgetId,
  });

  const saveMutation = useMutation({
    mutationFn: async (columns: ColumnSetting[]) => {
      if (!user?.id) throw new Error('Usuario no autenticado');

      const { error } = await supabase
        .from('planning_v2_user_settings' as any)
        .upsert({
          user_id: user.id,
          budget_id: budgetId,
          visible_columns: columns as any,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['planning-v2-column-settings', user?.id, budgetId] 
      });
      toast.success('Configuración de columnas guardada');
    },
    onError: (error) => {
      console.error('Error saving column settings:', error);
      toast.error('Error al guardar configuración de columnas');
    },
  });

  return {
    settings,
    isLoading,
    saveSettings: saveMutation.mutate,
    isSaving: saveMutation.isPending,
  };
}
