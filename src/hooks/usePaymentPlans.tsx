import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PaymentPlan {
  id: string;
  client_project_id: string;
  plan_type: 'design_payment' | 'construction_payment';
  plan_sequence: number;
  is_current_plan: boolean;
  plan_name: string;
  total_amount: number;
  status: 'pending' | 'approved' | 'active' | 'completed' | 'cancelled';
  created_by: string;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Relations
  creator?: { full_name: string };
  approver?: { full_name: string };
  client_project?: { 
    project_name: string; 
    client?: { full_name: string } 
  };
}

export const usePaymentPlans = (clientProjectId?: string, planType?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query for fetching payment plans
  const paymentPlansQuery = useQuery({
    queryKey: ['payment-plans', clientProjectId, planType],
    queryFn: async () => {
      let query = supabase
        .from('payment_plans')
        .select(`
          *,
          creator:profiles!created_by(full_name),
          approver:profiles!approved_by(full_name),
          client_project:client_projects(
            project_name,
            client:clients(full_name)
          )
        `)
        .order('created_at', { ascending: false });

      if (clientProjectId) {
        query = query.eq('client_project_id', clientProjectId);
      }
      
      if (planType) {
        query = query.eq('plan_type', planType);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as PaymentPlan[];
    },
    enabled: true,
  });

  // Mutation for creating payment plan
  const createPaymentPlan = useMutation({
    mutationFn: async (data: Omit<PaymentPlan, 'id' | 'created_at' | 'updated_at' | 'plan_sequence' | 'is_current_plan' | 'creator' | 'approver' | 'client_project'>) => {
      const { data: result, error } = await supabase
        .from('payment_plans')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-plans'] });
      toast({
        title: "Plan de pago creado",
        description: "El plan de pago se ha creado exitosamente.",
      });
    },
    onError: (error) => {
      console.error('Error creating payment plan:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el plan de pago.",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating payment plan
  const updatePaymentPlan = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PaymentPlan> }) => {
      const { data: result, error } = await supabase
        .from('payment_plans')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-plans'] });
      toast({
        title: "Plan actualizado",
        description: "El plan de pago se ha actualizado exitosamente.",
      });
    },
    onError: (error) => {
      console.error('Error updating payment plan:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el plan de pago.",
        variant: "destructive",
      });
    },
  });

  // Mutation for approving payment plan
  const approvePaymentPlan = useMutation({
    mutationFn: async (planId: string) => {
      // Get current user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { data: result, error } = await supabase
        .from('payment_plans')
        .update({ 
          status: 'approved',
          approved_by: profile.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', planId)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-plans'] });
      toast({
        title: "Plan aprobado",
        description: "El plan de pago ha sido aprobado.",
      });
    },
    onError: (error) => {
      console.error('Error approving payment plan:', error);
      toast({
        title: "Error",
        description: "No se pudo aprobar el plan de pago.",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting payment plan
  const deletePaymentPlan = useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase
        .from('payment_plans')
        .delete()
        .eq('id', planId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-plans'] });
      toast({
        title: "Plan eliminado",
        description: "El plan de pago se ha eliminado.",
      });
    },
    onError: (error) => {
      console.error('Error deleting payment plan:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el plan de pago.",
        variant: "destructive",
      });
    },
  });

  return {
    paymentPlans: paymentPlansQuery.data || [],
    isLoading: paymentPlansQuery.isLoading,
    isError: paymentPlansQuery.isError,
    error: paymentPlansQuery.error,
    createPaymentPlan,
    updatePaymentPlan,
    approvePaymentPlan,
    deletePaymentPlan,
    refetch: paymentPlansQuery.refetch,
  };
};