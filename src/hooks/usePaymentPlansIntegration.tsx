import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PaymentPlanIntegration {
  id: string;
  client_project_id: string;
  plan_type: 'design_payment' | 'construction_payment';
  plan_name: string;
  total_amount: number;
  status: 'pending' | 'approved' | 'active' | 'completed' | 'cancelled';
  created_by: string;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  plan_sequence: number;
  is_current_plan: boolean;
}

export const usePaymentPlansIntegration = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Función para obtener el perfil del usuario actual
  const getCurrentUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, role, user_id')
      .eq('user_id', user.id)
      .single();

    if (error || !profile) throw new Error('Profile not found');
    return profile;
  };

  // Validar permisos por módulo
  const validateModulePermissions = async (
    planType: 'design_payment' | 'construction_payment',
    module: 'sales' | 'design' | 'finances' | 'client_portal'
  ) => {
    const profile = await getCurrentUserProfile();
    
    // Solo admin y employee pueden crear/editar
    if (module !== 'client_portal' && !['admin', 'employee'].includes(profile.role)) {
      throw new Error('Sin permisos para esta operación');
    }

    // Validaciones específicas por módulo
    switch (module) {
      case 'sales':
        if (planType !== 'design_payment') {
          throw new Error('Solo se pueden crear planes de diseño desde el módulo de ventas');
        }
        break;
      case 'design':
        if (planType !== 'construction_payment') {
          throw new Error('Solo se pueden crear planes de construcción desde el módulo de diseño');
        }
        break;
      case 'client_portal':
        throw new Error('El portal del cliente es solo de lectura');
    }

    return profile;
  };

  // Crear plan de pago con validaciones completas
  const createPaymentPlanIntegrated = useMutation({
    mutationFn: async ({ 
      planData, 
      installments, 
      module 
    }: { 
      planData: Omit<PaymentPlanIntegration, 'id' | 'created_at' | 'updated_at' | 'plan_sequence' | 'is_current_plan'>;
      installments?: Array<{
        installment_number: number;
        description: string;
        amount: number;
        due_days: number;
      }>;
      module: 'sales' | 'design' | 'finances';
    }) => {
      // Validar permisos
      const profile = await validateModulePermissions(planData.plan_type, module);

      // Validaciones de negocio específicas
      if (planData.plan_type === 'construction_payment') {
        const { data: project, error: projectError } = await supabase
          .from('client_projects')
          .select('construction_budget, status')
          .eq('id', planData.client_project_id)
          .single();

        if (projectError) throw new Error('Proyecto no encontrado');
        
        if (!project.construction_budget || project.construction_budget <= 0) {
          throw new Error('Debe existir un presupuesto de construcción aprobado');
        }

        if (!['design', 'construction'].includes(project.status)) {
          throw new Error('Los planes de construcción solo pueden crearse en proyectos de diseño completado');
        }
      }

      // Crear el plan
      const { data: newPlan, error: planError } = await supabase
        .from('payment_plans')
        .insert({
          ...planData,
          created_by: profile.id
        })
        .select()
        .single();

      if (planError) throw planError;

      // Crear installments si se proporcionan
      if (installments && installments.length > 0) {
        const installmentsData = installments.map((inst, index) => ({
          payment_plan_id: newPlan.id,
          installment_number: index + 1,
          description: inst.description,
          amount: inst.amount,
          due_date: new Date(Date.now() + (inst.due_days * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
          status: 'pending' as const
        }));

        const { error: installmentsError } = await supabase
          .from('payment_installments')
          .insert(installmentsData);

        if (installmentsError) {
          console.error('Error creating installments:', installmentsError);
          // No fallar completamente si hay error en installments
        }
      }

      return { plan: newPlan, installmentsCreated: installments?.length || 0 };
    },
    onSuccess: ({ plan, installmentsCreated }) => {
      queryClient.invalidateQueries({ queryKey: ['payment-plans'] });
      queryClient.invalidateQueries({ queryKey: ['payment-installments'] });
      
      toast({
        title: "Plan creado exitosamente",
        description: installmentsCreated > 0 
          ? `Plan creado con ${installmentsCreated} parcialidades automáticas`
          : "Plan de pago creado correctamente"
      });
    },
    onError: (error: Error) => {
      console.error('Error creating payment plan:', error);
      toast({
        title: "Error al crear plan",
        description: error.message || "No se pudo crear el plan de pago",
        variant: "destructive"
      });
    }
  });

  // Marcar installment como pagado con transiciones automáticas
  const markInstallmentAsPaid = useMutation({
    mutationFn: async ({
      installmentId,
      paymentData,
      module
    }: {
      installmentId: string;
      paymentData: {
        payment_method: string;
        payment_reference?: string;
        payment_date: string;
        notes?: string;
      };
      module: 'finances' | 'design';
    }) => {
      // Validar permisos
      await validateModulePermissions('design_payment', module); // Tipo no importa para pago

      const { data: result, error } = await supabase
        .from('payment_installments')
        .update({
          status: 'paid',
          payment_date: paymentData.payment_date,
          payment_method: paymentData.payment_method,
          payment_reference: paymentData.payment_reference,
          notes: paymentData.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', installmentId)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-plans'] });
      queryClient.invalidateQueries({ queryKey: ['payment-installments'] });
      queryClient.invalidateQueries({ queryKey: ['client-projects'] });
      
      toast({
        title: "Pago registrado",
        description: "El pago se ha registrado correctamente y se han aplicado las transiciones automáticas"
      });
    },
    onError: (error: Error) => {
      console.error('Error marking payment:', error);
      toast({
        title: "Error al registrar pago",
        description: error.message || "No se pudo registrar el pago",
        variant: "destructive"
      });
    }
  });

  return {
    createPaymentPlanIntegrated,
    markInstallmentAsPaid,
    getCurrentUserProfile,
    validateModulePermissions
  };
};