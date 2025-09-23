import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Hook para obtener el rollup del presupuesto de construcción
export const useConstructionBudgetRollup = (projectId?: string) => {
  return useQuery({
    queryKey: ['construction-budget-rollup', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('construction_budget_items')
        .select(`
          *,
          transaction_allocations (
            id,
            allocated_quantity,
            allocated_amount,
            unit_price,
            unified_financial_transactions (
              id,
              reference_code,
              description,
              amount,
              status,
              created_at
            )
          ),
          budget_supply_status (
            status,
            last_updated_at
          ),
          budget_annotations (
            id,
            annotation_type,
            content,
            created_at
          )
        `)
        .eq('project_id', projectId)
        .order('item_order');

      if (error) throw error;

      // Calcular los rollups manualmente
      const rollupData = data?.map(item => {
        const allocations = item.transaction_allocations || [];
        const approved_allocations = allocations.filter(
          (a: any) => a.unified_financial_transactions?.status === 'approved'
        );
        
        const purchased_quantity = approved_allocations.reduce(
          (sum: number, a: any) => sum + (a.allocated_quantity || 0), 0
        );
        const purchased_amount = approved_allocations.reduce(
          (sum: number, a: any) => sum + (a.allocated_amount || 0), 0
        );
        const avg_unit_price = purchased_quantity > 0 ? purchased_amount / purchased_quantity : 0;
        
        const remaining_quantity = (item.baseline_quantity || 0) - purchased_quantity;
        
        // Calcular EAC según método
        let eac_total = item.baseline_total || 0;
        if (item.current_eac_method === 'manual' && item.manual_eac_price) {
          eac_total = item.manual_eac_price * (item.baseline_quantity || 0);
        } else if (item.current_eac_method === 'weighted_avg' && avg_unit_price > 0) {
          eac_total = avg_unit_price * (item.baseline_quantity || 0);
        }
        
        const cost_variance = eac_total - (item.baseline_total || 0);
        const completion_percentage = (item.baseline_quantity || 0) > 0 
          ? (purchased_quantity / (item.baseline_quantity || 0)) * 100 
          : 0;

        return {
          ...item,
          purchased_quantity,
          purchased_amount,
          avg_unit_price,
          remaining_quantity,
          eac_total,
          cost_variance,
          completion_percentage,
          supply_status: item.budget_supply_status?.[0]?.status || 'pendiente',
          allocated_transactions: approved_allocations
        };
      }) || [];

      return rollupData;
    },
    enabled: !!projectId
  });
};

// Hook para obtener alertas de materiales
export const useMaterialAlerts = (projectId?: string) => {
  return useQuery({
    queryKey: ['material-alerts', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      // Obtener items de presupuesto con saldo pendiente
      const { data, error } = await supabase
        .from('construction_budget_items')
        .select(`
          *,
          transaction_allocations (
            allocated_quantity,
            unified_financial_transactions (
              status
            )
          )
        `)
        .eq('project_id', projectId);

      if (error) throw error;

      // Calcular alertas manualmente
      const alertsMap = new Map();
      
      data?.forEach(item => {
        const allocations = item.transaction_allocations || [];
        const approved_allocations = allocations.filter(
          (a: any) => a.unified_financial_transactions?.status === 'approved'
        );
        
        const purchased_quantity = approved_allocations.reduce(
          (sum: number, a: any) => sum + (a.allocated_quantity || 0), 0
        );
        const remaining_quantity = (item.baseline_quantity || 0) - purchased_quantity;
        
        if (remaining_quantity > 0) {
          const key = item.category || 'General';
          if (!alertsMap.has(key)) {
            alertsMap.set(key, {
              mayor_nombre: key,
              items_pending: 0,
              total_pending_amount: 0,
              alert_priority: 'medium'
            });
          }
          
          const alert = alertsMap.get(key);
          alert.items_pending += 1;
          alert.total_pending_amount += remaining_quantity * (item.baseline_unit_price || 0);
        }
      });

      return Array.from(alertsMap.values());
    },
    enabled: !!projectId
  });
};

// Hook para crear asignación de transacción
export const useCreateTransactionAllocation = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      unified_transaction_id: string;
      budget_item_id: string;
      allocated_quantity: number;
      allocated_amount: number;
      unit_price: number;
      allocation_notes?: string;
    }) => {
      // Obtener el perfil del usuario actual
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile) throw new Error('No se pudo obtener el perfil del usuario');

      const { data: result, error } = await supabase
        .from('transaction_allocations')
        .insert({
          ...data,
          created_by: profile.id
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Transacción asignada",
        description: "La transacción ha sido asignada correctamente al presupuesto.",
      });
      queryClient.invalidateQueries({ queryKey: ['construction-budget-rollup'] });
      queryClient.invalidateQueries({ queryKey: ['material-alerts'] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Error al asignar transacción: ${error.message}`,
      });
    },
  });
};

// Hook para actualizar método EAC
export const useUpdateEACMethod = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      itemId: string;
      eac_method: string;
      manual_eac_price?: number;
    }) => {
      const { data: result, error } = await supabase
        .from('construction_budget_items')
        .update({
          current_eac_method: data.eac_method,
          manual_eac_price: data.manual_eac_price
        })
        .eq('id', data.itemId)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Método EAC actualizado",
        description: "El método de cálculo EAC ha sido actualizado correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: ['construction-budget-rollup'] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Error al actualizar método EAC: ${error.message}`,
      });
    },
  });
};

// Hook para gestionar anotaciones del presupuesto
export const useBudgetAnnotations = (budgetItemId?: string) => {
  return useQuery({
    queryKey: ['budget-annotations', budgetItemId],
    queryFn: async () => {
      if (!budgetItemId) return [];
      
      const { data, error } = await supabase
        .from('budget_annotations')
        .select(`
          *,
          profiles (
            full_name
          )
        `)
        .eq('budget_item_id', budgetItemId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!budgetItemId
  });
};

// Hook para crear anotación
export const useCreateBudgetAnnotation = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      budget_item_id: string;
      annotation_type: string;
      content: string;
    }) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile) throw new Error('No se pudo obtener el perfil del usuario');

      const { data: result, error } = await supabase
        .from('budget_annotations')
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
      toast({
        title: "Anotación agregada",
        description: "La anotación ha sido guardada correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: ['budget-annotations'] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Error al agregar anotación: ${error.message}`,
      });
    },
  });
};