import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ConstructionBudgetItem {
  budget_item_id: string;
  project_id: string;
  source_budget_item_id: string;
  item_name: string;
  mayor: string;
  partida: string;
  subpartida: string;
  unidad: string;
  cantidad_base: number;
  precio_base: number;
  total_base: number;
  comprado_qty: number;
  comprado_total: number;
  precio_prom_ponderado: number;
  saldo_qty: number;
  eac_unit_price: number;
  eac_total: number;
  variacion_total: number;
  variacion_pct: number;
  completion_percentage: number;
  supply_status: string;
  current_eac_method: string;
  manual_eac_price: number | null;
  is_baseline_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConstructionBudgetExecutive {
  id: string;
  cliente_id: string;
  proyecto_id: string;
  partida_ejecutivo_id: string;
  subpartida_id: string;
  nombre_snapshot: string;
  codigo_snapshot: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  importe: number;
  created_at: string;
  updated_at: string;
  subpartida: {
    codigo: string;
    nombre: string;
  } | null;
  partida_ejecutivo: {
    id: string;
    parametrico_id: string;
    parametrico: {
      id: string;
      mayor_id: string;
      partida_id: string;
      mayor: {
        codigo: string;
        nombre: string;
      } | null;
      partida: {
        codigo: string;
        nombre: string;
      } | null;
    } | null;
  } | null;
}

export const useConstructionBudget = (projectId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Sync snapshot from Planeación
  const syncSnapshot = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase.rpc('sync_construction_budget_snapshot', {
        project_id_param: projectId
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['construction-budget-executive'] });
      queryClient.invalidateQueries({ queryKey: ['construction-budget-rollup'] });
      toast({
        title: "Presupuesto sincronizado",
        description: "El presupuesto ejecutivo se ha sincronizado desde Planeación.",
      });
    },
    onError: (error) => {
      console.error('Error syncing budget snapshot:', error);
      toast({
        title: "Error",
        description: "No se pudo sincronizar el presupuesto ejecutivo.",
        variant: "destructive",
      });
    },
  });

  // Get executive budget (from Planning - same data source)
  const executiveBudgetQuery = useQuery({
    queryKey: ['construction-budget-executive', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      // First get the project's client_id
      const { data: project, error: projectError } = await supabase
        .from('client_projects')
        .select('client_id')
        .eq('id', projectId)
        .single();
        
      if (projectError || !project) {
        console.error('Error fetching project:', projectError);
        return [];
      }
      
      // Use the same query as Planning module for consistency
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
        .eq('cliente_id', project.client_id)
        .eq('proyecto_id', projectId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Get rollup budget (with comparisons)
  const rollupBudgetQuery = useQuery({
    queryKey: ['construction-budget-rollup', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('v_construction_budget_rollup')
        .select('*')
        .eq('project_id', projectId)
        .order('mayor, partida, subpartida');
      
      if (error) throw error;
      return data as ConstructionBudgetItem[];
    },
    enabled: !!projectId,
  });

  // Update EAC method and manual price
  const updateEAC = useMutation({
    mutationFn: async ({ 
      budgetItemId, 
      eacMethod, 
      manualPrice 
    }: { 
      budgetItemId: string; 
      eacMethod: string; 
      manualPrice?: number 
    }) => {
      const updateData: any = {
        current_eac_method: eacMethod,
        updated_at: new Date().toISOString()
      };
      
      if (eacMethod === 'manual' && manualPrice !== undefined) {
        updateData.manual_eac_price = manualPrice;
      }
      
      const { error } = await supabase
        .from('construction_budget_items')
        .update(updateData)
        .eq('id', budgetItemId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['construction-budget-rollup'] });
      toast({
        title: "EAC actualizado",
        description: "El método EAC se ha actualizado correctamente.",
      });
    },
    onError: (error) => {
      console.error('Error updating EAC:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el método EAC.",
        variant: "destructive",
      });
    },
  });

  // Create material request (transaction)
  const createMaterialRequest = useMutation({
    mutationFn: async ({
      budgetItemId,
      projectId,
      description,
      quantity,
      unitPrice,
      unit,
      department = 'construccion'
    }: {
      budgetItemId: string;
      projectId: string;
      description: string;
      quantity: number;
      unitPrice: number;
      unit: string;
      department?: string;
    }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Perfil no encontrado');

      // Create transaction in unified_financial_transactions
      const { data: transaction, error: transactionError } = await supabase
        .from('unified_financial_transactions')
        .insert({
          empresa_proyecto_id: projectId,
          tipo_movimiento: 'gasto',
          departamento: department,
          descripcion: description,
          monto_total: quantity * unitPrice,
          cantidad_requerida: quantity,
          precio_unitario: unitPrice,
          unidad: unit,
          referencia_unica: `MAT-${Date.now()}`,
          fecha: new Date().toISOString().split('T')[0],
          tiene_factura: false,
          created_by: profile.id
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Create allocation record
      const { error: allocationError } = await supabase
        .from('transaction_allocations')
        .insert({
          unified_transaction_id: transaction.id,
          budget_item_id: budgetItemId,
          allocated_quantity: quantity,
          allocated_amount: quantity * unitPrice,
          created_by: profile.id
        });

      if (allocationError) throw allocationError;

      // Update supply status
      const { error: statusError } = await supabase
        .from('budget_supply_status')
        .upsert({
          budget_item_id: budgetItemId,
          status: 'solicitado',
          updated_by: profile.id
        }, {
          onConflict: 'budget_item_id'
        });

      if (statusError) throw statusError;

      return transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['construction-budget-rollup'] });
      toast({
        title: "Solicitud creada",
        description: "La solicitud de material se ha creado exitosamente.",
      });
    },
    onError: (error) => {
      console.error('Error creating material request:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la solicitud de material.",
        variant: "destructive",
      });
    },
  });

  // Allocate existing transaction to budget item
  const allocateTransaction = useMutation({
    mutationFn: async ({
      transactionId,
      budgetItemId,
      allocatedQuantity,
      allocatedAmount
    }: {
      transactionId: string;
      budgetItemId: string;
      allocatedQuantity: number;
      allocatedAmount: number;
    }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Perfil no encontrado');

      const { error } = await supabase
        .from('transaction_allocations')
        .insert({
          unified_transaction_id: transactionId,
          budget_item_id: budgetItemId,
          allocated_quantity: allocatedQuantity,
          allocated_amount: allocatedAmount,
          created_by: profile.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['construction-budget-rollup'] });
      toast({
        title: "Transacción asignada",
        description: "La transacción se ha asignado correctamente a la partida.",
      });
    },
    onError: (error) => {
      console.error('Error allocating transaction:', error);
      toast({
        title: "Error",
        description: "No se pudo asignar la transacción.",
        variant: "destructive",
      });
    },
  });

  return {
    // Queries
    executiveBudget: executiveBudgetQuery.data || [],
    rollupBudget: rollupBudgetQuery.data || [],
    isLoadingExecutive: executiveBudgetQuery.isLoading,
    isLoadingRollup: rollupBudgetQuery.isLoading,
    errorExecutive: executiveBudgetQuery.error,
    errorRollup: rollupBudgetQuery.error,
    
    // Mutations
    syncSnapshot,
    updateEAC,
    createMaterialRequest,
    allocateTransaction,
    
    // Refetch functions
    refetchExecutive: executiveBudgetQuery.refetch,
    refetchRollup: rollupBudgetQuery.refetch,
  };
};