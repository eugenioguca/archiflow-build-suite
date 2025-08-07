import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PaymentInstallment {
  id: string;
  payment_plan_id: string;
  installment_number: number;
  description: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paid_date?: string;
  paid_by?: string;
  payment_reference?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Relations
  payer?: { full_name: string };
}

export const usePaymentInstallments = (paymentPlanId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query for fetching installments
  const installmentsQuery = useQuery({
    queryKey: ['payment-installments', paymentPlanId],
    queryFn: async () => {
      if (!paymentPlanId) return [];

      const { data, error } = await supabase
        .from('payment_installments')
        .select(`
          *,
          payer:profiles!paid_by(full_name)
        `)
        .eq('payment_plan_id', paymentPlanId)
        .order('installment_number');
      
      if (error) throw error;
      return data as PaymentInstallment[];
    },
    enabled: !!paymentPlanId,
  });

  // Mutation for creating installment
  const createInstallment = useMutation({
    mutationFn: async (data: Omit<PaymentInstallment, 'id' | 'created_at' | 'updated_at' | 'payer'>) => {
      const { data: result, error } = await supabase
        .from('payment_installments')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-installments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-plans'] }); // Refresh plans too
      toast({
        title: "Parcialidad creada",
        description: "La parcialidad se ha creado exitosamente.",
      });
    },
    onError: (error) => {
      console.error('Error creating installment:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la parcialidad.",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating installment
  const updateInstallment = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PaymentInstallment> }) => {
      const { data: result, error } = await supabase
        .from('payment_installments')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-installments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-plans'] });
      toast({
        title: "Parcialidad actualizada",
        description: "La parcialidad se ha actualizado exitosamente.",
      });
    },
    onError: (error) => {
      console.error('Error updating installment:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la parcialidad.",
        variant: "destructive",
      });
    },
  });

  // Mutation for marking installment as paid
  const markAsPaid = useMutation({
    mutationFn: async ({ 
      installmentId, 
      paymentReference, 
      notes 
    }: { 
      installmentId: string; 
      paymentReference?: string; 
      notes?: string;
    }) => {
      // Get current user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { data: result, error } = await supabase
        .from('payment_installments')
        .update({ 
          status: 'paid',
          paid_date: new Date().toISOString(),
          paid_by: profile.id,
          payment_reference: paymentReference,
          notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', installmentId)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-installments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-plans'] });
      queryClient.invalidateQueries({ queryKey: ['client-projects'] }); // May trigger status changes
      toast({
        title: "Pago confirmado",
        description: "La parcialidad ha sido marcada como pagada.",
      });
    },
    onError: (error) => {
      console.error('Error marking as paid:', error);
      toast({
        title: "Error",
        description: "No se pudo confirmar el pago.",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting installment
  const deleteInstallment = useMutation({
    mutationFn: async (installmentId: string) => {
      const { error } = await supabase
        .from('payment_installments')
        .delete()
        .eq('id', installmentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-installments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-plans'] });
      toast({
        title: "Parcialidad eliminada",
        description: "La parcialidad se ha eliminado.",
      });
    },
    onError: (error) => {
      console.error('Error deleting installment:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la parcialidad.",
        variant: "destructive",
      });
    },
  });

  // Helper function to check for overdue installments
  const checkOverdueInstallments = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return installmentsQuery.data?.filter(installment => {
      const dueDate = new Date(installment.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return installment.status === 'pending' && dueDate < today;
    }) || [];
  };

  // Helper function to get payment summary
  const getPaymentSummary = () => {
    const installments = installmentsQuery.data || [];
    const totalAmount = installments.reduce((sum, inst) => sum + inst.amount, 0);
    const paidAmount = installments
      .filter(inst => inst.status === 'paid')
      .reduce((sum, inst) => sum + inst.amount, 0);
    const pendingAmount = totalAmount - paidAmount;
    const overdueAmount = checkOverdueInstallments()
      .reduce((sum, inst) => sum + inst.amount, 0);

    return {
      totalAmount,
      paidAmount,
      pendingAmount,
      overdueAmount,
      completionPercentage: totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0,
    };
  };

  return {
    installments: installmentsQuery.data || [],
    isLoading: installmentsQuery.isLoading,
    isError: installmentsQuery.isError,
    error: installmentsQuery.error,
    createInstallment,
    updateInstallment,
    markAsPaid,
    deleteInstallment,
    checkOverdueInstallments,
    getPaymentSummary,
    refetch: installmentsQuery.refetch,
  };
};