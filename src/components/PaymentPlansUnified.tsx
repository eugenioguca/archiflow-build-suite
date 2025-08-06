import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, DollarSign, Eye, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PaymentPlan {
  id: string;
  plan_name: string;
  total_amount: number;
  currency: string;
  status: string;
  client_name: string;
  project_name: string;
  client_id: string;
  client_project_id: string;
  plan_type?: 'sales_to_design' | 'design_to_construction';
}

interface PaymentInstallment {
  id: string;
  payment_plan_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  status: string;
  paid_date?: string;
  description?: string;
}

interface PaymentPlansUnifiedProps {
  selectedClientId?: string;
  selectedProjectId?: string;
  mode: 'sales' | 'finance' | 'design';
  planType?: 'sales_to_design' | 'design_to_construction' | 'all';
  onPaymentUpdate?: () => void;
}

export const PaymentPlansUnified: React.FC<PaymentPlansUnifiedProps> = ({
  selectedClientId,
  selectedProjectId,
  mode = 'finance',
  planType = 'all',
  onPaymentUpdate
}) => {
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  const [installments, setInstallments] = useState<PaymentInstallment[]>([]);
  const [allInstallments, setAllInstallments] = useState<Record<string, PaymentInstallment[]>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchPaymentPlans();
  }, [selectedClientId, selectedProjectId]);

  const fetchPaymentPlans = async () => {
    try {
      setLoading(true);
      
      // Build query parameters for the payment_plans_with_sales view
      const params: any = {
        status: 'in.(active,draft)',
        order: 'created_at.desc'
      };

      // Apply plan_type filters
      if (planType && planType !== 'all') {
        params.plan_type = `eq.${planType}`;
      } else if (mode === 'sales') {
        params.plan_type = 'in.(sales_to_design,design_to_construction)';
      } else if (mode === 'design') {
        params.plan_type = 'eq.design_to_construction';
      }

      // Apply client/project filters
      if (selectedProjectId) {
        params.client_project_id = `eq.${selectedProjectId}`;
      } else if (selectedClientId) {
        params.client_id = `eq.${selectedClientId}`;
      }

      // Simple query approach to avoid TypeScript recursion
      const { data, error } = await supabase
        .from('payment_plans_with_sales')
        .select('*')
        .in('status', ['active', 'draft'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Apply filters in JavaScript instead of SQL to avoid TypeScript issues
      let filteredData = data || [];
      
      // Note: payment_plans_with_sales view doesn't have plan_type, so skip those filters for now
      
      // Apply client/project filters
      if (selectedProjectId) {
        filteredData = filteredData.filter(plan => plan.client_project_id === selectedProjectId);
      } else if (selectedClientId) {
        filteredData = filteredData.filter(plan => plan.client_id === selectedClientId);
      }

      const mappedPlans: PaymentPlan[] = filteredData.map((plan: any) => ({
        id: plan.id,
        plan_name: plan.plan_name,
        total_amount: plan.total_amount,
        currency: plan.currency,
        status: plan.status,
        client_project_id: plan.client_project_id,
        client_id: plan.client_id,
        client_name: plan.client_name || 'Cliente desconocido',
        project_name: plan.project_name || 'Proyecto desconocido',
        plan_type: undefined // Will be handled by fallback logic in getPlanCategoryBadge
      }));

      setPaymentPlans(mappedPlans);

      // Fetch installments for all plans to calculate progress and total paid
      if (mappedPlans.length > 0) {
        await fetchAllInstallments(mappedPlans.map(p => p.id));
      }
    } catch (error) {
      console.error('Error fetching payment plans:', error);
      toast.error('Error al cargar planes de pago');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllInstallments = async (planIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('payment_installments')
        .select('*')
        .in('payment_plan_id', planIds)
        .order('installment_number');

      if (error) throw error;

      // Group installments by payment plan id
      const installmentsByPlan: Record<string, PaymentInstallment[]> = {};
      (data || []).forEach((installment: PaymentInstallment) => {
        const planId = installment.payment_plan_id;
        if (!installmentsByPlan[planId]) {
          installmentsByPlan[planId] = [];
        }
        installmentsByPlan[planId].push(installment);
      });

      setAllInstallments(installmentsByPlan);
    } catch (error) {
      console.error('Error fetching installments:', error);
      toast.error('Error al cargar cuotas');
    }
  };

  const fetchInstallments = async (planId: string) => {
    try {
      const { data, error } = await supabase
        .from('payment_installments')
        .select('*')
        .eq('payment_plan_id', planId)
        .order('installment_number');

      if (error) throw error;

      setInstallments(data || []);
    } catch (error) {
      console.error('Error fetching installments:', error);
      toast.error('Error al cargar cuotas');
    }
  };

  const handleViewDetails = async (plan: PaymentPlan) => {
    setSelectedPlan(plan);
    await fetchInstallments(plan.id);
    setDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendiente', variant: 'secondary' as const },
      paid: { label: 'Pagado', variant: 'default' as const },
      overdue: { label: 'Vencido', variant: 'destructive' as const },
      partial: { label: 'Parcial', variant: 'outline' as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPlanCategoryBadge = (plan: PaymentPlan) => {
    // Use plan_type to determine badge, fallback to plan name analysis
    let config = { label: 'General', color: 'bg-gray-500/10 text-gray-700' };
    
    if (plan.plan_type === 'sales_to_design') {
      config = { label: 'Ventas', color: 'bg-blue-500/10 text-blue-700' };
    } else if (plan.plan_type === 'design_to_construction') {
      config = { label: 'Construcción', color: 'bg-green-500/10 text-green-700' };
    } else {
      // Fallback to name analysis for existing plans without plan_type
      const lowerName = plan.plan_name.toLowerCase();
      if (lowerName.includes('diseño') || lowerName.includes('design')) {
        config = { label: 'Diseño', color: 'bg-blue-500/10 text-blue-700' };
      } else if (lowerName.includes('construcción') || lowerName.includes('construction')) {
        config = { label: 'Construcción', color: 'bg-green-500/10 text-green-700' };
      }
    }
    
    return (
      <Badge variant="outline" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const calculateProgress = (installments: PaymentInstallment[]) => {
    if (installments.length === 0) return 0;
    const paidCount = installments.filter(i => i.status === 'paid').length;
    return (paidCount / installments.length) * 100;
  };

  const calculateTotalPaid = (installments: PaymentInstallment[]) => {
    return installments
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + i.amount, 0);
  };

  const formatCurrency = (amount: number, currency: string = 'MXN') => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const handleInformativeAction = () => {
    if (mode === 'sales') {
      toast.info('Para marcar pagos, dirígete al módulo de Finanzas → Planes de Pago');
    }
  };

  const handleMarkPaid = async (installmentId: string, planId: string) => {
    if (mode === 'sales') {
      handleInformativeAction();
      return;
    }
    
    try {
      // Update payment installment status to paid (like PaymentPlansFinance)
      const { error: updateError } = await supabase
        .from('payment_installments')
        .update({
          status: 'paid',
          paid_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', installmentId);

      if (updateError) throw updateError;

      // Get current user profile for created_by
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Get installment details
      const { data: installmentData } = await supabase
        .from('payment_installments')
        .select('*')
        .eq('id', installmentId)
        .single();

      if (!installmentData) throw new Error('Installment not found');

      // Get payment plan details to get client and project IDs
      const { data: planData } = await supabase
        .from('payment_plans')
        .select('client_project_id, plan_name')
        .eq('id', planId)
        .single();

      if (!planData) throw new Error('Payment plan not found');

      // Get project details to get client_id
      const { data: projectData } = await supabase
        .from('client_projects')
        .select('client_id')
        .eq('id', planData.client_project_id)
        .single();

      if (!projectData) throw new Error('Project not found');

      // Create automatic income entry when installment is marked as paid (like PaymentPlansFinance)
      const { error: incomeError } = await supabase
        .from('incomes')
        .insert({
          client_id: projectData.client_id,
          project_id: planData.client_project_id,
          category: 'construction_service',
          amount: installmentData.amount,
          description: `Pago de cuota ${installmentData.installment_number} - Plan: ${planData.plan_name}`,
          expense_date: new Date().toISOString().split('T')[0],
          created_by: profile.id
        });

      if (incomeError) throw incomeError;

      // Show immediate success feedback
      toast.success('Cuota marcada como pagada e ingreso registrado correctamente');

      // Update local state optimistically
      setInstallments(prevInstallments => 
        prevInstallments.map(inst => 
          inst.id === installmentId 
            ? { ...inst, status: 'paid', paid_date: new Date().toISOString().split('T')[0] }
            : inst
        )
      );

      // Update allInstallments state
      setAllInstallments(prevAll => {
        const updated = { ...prevAll };
        if (updated[planId]) {
          updated[planId] = updated[planId].map(inst => 
            inst.id === installmentId 
              ? { ...inst, status: 'paid', paid_date: new Date().toISOString().split('T')[0] }
              : inst
          );
        }
        return updated;
      });

      // Trigger callback immediately
      onPaymentUpdate?.();

      // Refresh data in background
      setTimeout(() => {
        fetchPaymentPlans().catch(console.error);
      }, 500);

    } catch (error) {
      console.error('Error marking payment as paid:', error);
      toast.error('Error al marcar el pago como pagado');
    }
  };

  const handleMarkPlanAsPaid = async (planId: string) => {
    if (mode === 'sales') {
      handleInformativeAction();
      return;
    }

    try {
      // Get all installments for this plan
      const { data: planInstallments, error: fetchError } = await supabase
        .from('payment_installments')
        .select('*')
        .eq('payment_plan_id', planId)
        .neq('status', 'paid');

      if (fetchError) throw fetchError;

      if (!planInstallments || planInstallments.length === 0) {
        toast.info('Todas las cuotas de este plan ya están marcadas como pagadas');
        return;
      }

      // Get current user profile for created_by
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Update all unpaid installments to paid
      const { error: updateError } = await supabase
        .from('payment_installments')
        .update({ 
          status: 'paid',
          paid_date: new Date().toISOString().split('T')[0]
        })
        .eq('payment_plan_id', planId)
        .neq('status', 'paid');

      if (updateError) throw updateError;

      // Get payment plan details
      const { data: planData } = await supabase
        .from('payment_plans')
        .select('client_project_id, plan_name')
        .eq('id', planId)
        .single();

      if (!planData) throw new Error('Payment plan not found');

      // Get project details to get client_id
      const { data: projectData } = await supabase
        .from('client_projects')
        .select('client_id')
        .eq('id', planData.client_project_id)
        .single();

      if (!projectData) throw new Error('Project not found');

      // Create income entries for all unpaid installments (one by one to avoid bulk insert issues)
      for (const installment of planInstallments) {
        const { error: incomeError } = await supabase
          .from('incomes')
          .insert({
            client_id: projectData.client_id,
            project_id: planData.client_project_id,
            category: 'construction_service',
            amount: installment.amount,
            description: `Pago de cuota ${installment.installment_number} - Plan: ${planData.plan_name}`,
            expense_date: new Date().toISOString().split('T')[0],
            created_by: profile.id
          });
        
        if (incomeError) throw incomeError;
      }

      // Show immediate success feedback
      toast.success(`Plan completo marcado como pagado (${planInstallments.length} cuotas actualizadas)`);

      // Update local state optimistically
      const currentDate = new Date().toISOString().split('T')[0];
      
      setInstallments(prevInstallments => 
        prevInstallments.map(inst => 
          inst.status !== 'paid' 
            ? { ...inst, status: 'paid', paid_date: currentDate }
            : inst
        )
      );

      // Update allInstallments state
      setAllInstallments(prevAll => {
        const updated = { ...prevAll };
        if (updated[planId]) {
          updated[planId] = updated[planId].map(inst => 
            inst.status !== 'paid' 
              ? { ...inst, status: 'paid', paid_date: currentDate }
              : inst
          );
        }
        return updated;
      });

      // Trigger callback immediately
      onPaymentUpdate?.();

      // Refresh data in background
      setTimeout(() => {
        fetchPaymentPlans().catch(console.error);
        if (selectedPlan) {
          fetchInstallments(planId).catch(console.error);
        }
      }, 500);

    } catch (error) {
      console.error('Error marking plan as paid:', error);
      toast.error('Error al marcar el plan como pagado');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cargando planes de pago...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {paymentPlans.map((plan) => {
        // Calculate real progress and total paid using installments
        const planInstallments = allInstallments[plan.id] || [];
        const progress = calculateProgress(planInstallments);
        const totalPaid = calculateTotalPaid(planInstallments);
        
        return (
          <Card key={plan.id} className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{plan.plan_name}</CardTitle>
                    {getPlanCategoryBadge(plan)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {plan.client_name} - {plan.project_name}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-lg font-semibold">
                    {formatCurrency(plan.total_amount, plan.currency)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Pagado: {formatCurrency(totalPaid, plan.currency)}
                  </p>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progreso de pagos</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Installments disponibles</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>Ver detalles para estado</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewDetails(plan)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalles
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                          <span>Detalles del Plan: {selectedPlan?.plan_name}</span>
                          {mode === 'finance' && selectedPlan && (
                            <Button 
                              variant="default"
                              size="sm"
                              onClick={() => handleMarkPlanAsPaid(selectedPlan.id)}
                              className="ml-4"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Marcar Plan Completo como Pagado
                            </Button>
                          )}
                        </DialogTitle>
                      </DialogHeader>
                      
                      {selectedPlan && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                            <div>
                              <p className="text-sm text-muted-foreground">Cliente</p>
                              <p className="font-medium">{selectedPlan.client_name}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Proyecto</p>
                              <p className="font-medium">{selectedPlan.project_name}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Total del Plan</p>
                              <p className="font-medium">{formatCurrency(selectedPlan.total_amount, selectedPlan.currency)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Categoría</p>
                              <div className="mt-1">{getPlanCategoryBadge(selectedPlan)}</div>
                            </div>
                          </div>
                          
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Cuota</TableHead>
                                <TableHead>Monto</TableHead>
                                <TableHead>Fecha Vencimiento</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Fecha Pago</TableHead>
                                {mode === 'finance' && <TableHead>Acciones</TableHead>}
                                {mode === 'sales' && <TableHead>Acción</TableHead>}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {installments.map((installment) => (
                                <TableRow key={installment.id}>
                                  <TableCell>#{installment.installment_number}</TableCell>
                                  <TableCell>{formatCurrency(installment.amount)}</TableCell>
                                  <TableCell>{new Date(installment.due_date).toLocaleDateString()}</TableCell>
                                  <TableCell>{getStatusBadge(installment.status)}</TableCell>
                                   <TableCell>
                                     {installment.paid_date 
                                       ? new Date(installment.paid_date).toLocaleDateString()
                                       : '-'
                                     }
                                   </TableCell>
                                   {mode === 'finance' && (
                                     <TableCell>
                                       {installment.status !== 'paid' ? (
                                         <Button 
                                           variant="outline" 
                                           size="sm"
                                           onClick={() => handleMarkPaid(installment.id, plan.id)}
                                         >
                                           <DollarSign className="h-4 w-4 mr-1" />
                                           Marcar Pagado
                                         </Button>
                                       ) : (
                                         <Badge variant="default">Pagado</Badge>
                                       )}
                                     </TableCell>
                                   )}
                                   {mode === 'sales' && (
                                     <TableCell>
                                       {installment.status !== 'paid' && (
                                         <Button 
                                           variant="outline" 
                                           size="sm"
                                           onClick={handleInformativeAction}
                                         >
                                           <DollarSign className="h-4 w-4 mr-1" />
                                           Marcar Pagado
                                         </Button>
                                       )}
                                     </TableCell>
                                   )}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                  
                  {mode === 'finance' && (
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => handleMarkPlanAsPaid(plan.id)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Marcar Plan Pagado
                    </Button>
                  )}
                  
                  {mode === 'sales' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleInformativeAction}
                    >
                      <DollarSign className="h-4 w-4 mr-1" />
                      Gestionar Pagos
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      
      {paymentPlans.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No se encontraron planes de pago activos</p>
            {selectedClientId || selectedProjectId ? (
              <p className="text-sm text-muted-foreground mt-2">
                Aplicando filtros: {selectedClientId ? 'Cliente específico' : ''} 
                {selectedProjectId ? 'Proyecto específico' : ''}
              </p>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
};