import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, DollarSign, Eye, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface PaymentPlan {
  id: string;
  plan_name: string;
  total_amount: number;
  currency: string;
  status: string;
  created_at: string;
  client_project_id: string;
  project_name?: string;
  client_name?: string;
  client_id?: string;
  plan_type?: 'sales_to_design' | 'design_to_construction';
  client_projects?: {
    project_name: string;
    client_id: string;
    clients?: {
      full_name: string;
    }
  } | null;
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
  reference_number?: string;
}

interface PaymentDialogData {
  installment: PaymentInstallment;
  planName: string;
  clientName: string;
}

interface PaymentPlansUnifiedProps {
  selectedClientId?: string;
  selectedProjectId?: string;
  mode: 'sales' | 'finance' | 'design';
  planType?: 'sales_to_design' | 'design_to_construction' | 'all';
  onUpdate?: () => void;
}

export const PaymentPlansUnified: React.FC<PaymentPlansUnifiedProps> = ({
  selectedClientId,
  selectedProjectId,
  mode = 'finance',
  planType = 'all',
  onUpdate
}) => {
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  const [installments, setInstallments] = useState<PaymentInstallment[]>([]);
  const [allInstallments, setAllInstallments] = useState<Record<string, PaymentInstallment[]>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<PaymentDialogData | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    paid_date: '',
    payment_method: '',
    reference_number: '',
    notes: ''
  });

  useEffect(() => {
    fetchPaymentPlans();
  }, [selectedClientId, selectedProjectId]);

  const fetchPaymentPlans = async () => {
    try {
      setLoading(true);
      
      // Use the payment_plans_with_sales view like PaymentPlansFinance
      let query = supabase
        .from('payment_plans_with_sales')
        .select('*')
        .in('status', ['active', 'draft']);

      // Apply filters
      if (selectedProjectId) {
        query = query.eq('client_project_id', selectedProjectId);
      } else if (selectedClientId) {
        query = query.eq('client_id', selectedClientId);
      }

      const { data: plansData, error: plansError } = await query.order('created_at', { ascending: false });
      if (plansError) throw plansError;

      // Transform the data to match expected structure
      const transformedData = (plansData || []).map(plan => ({
        id: plan.id,
        client_project_id: plan.client_project_id,
        plan_name: plan.plan_name,
        total_amount: plan.total_amount,
        currency: plan.currency,
        status: plan.status,
        created_at: plan.created_at,
        project_name: plan.project_name,
        client_name: plan.client_name,
        client_id: plan.client_id,
        client_projects: {
          project_name: plan.project_name,
          client_id: plan.client_id,
          clients: {
            full_name: plan.client_name
          }
        }
      }));

      setPaymentPlans(transformedData);
      
      // Fetch all installments for the plans
      if (transformedData && transformedData.length > 0) {
        await fetchAllInstallments(transformedData.map(plan => plan.id));
      }
    } catch (error) {
      console.error('Error fetching payment plans:', error);
      toast.error("No se pudieron cargar los planes de pago");
      setPaymentPlans([]);
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

      // Group installments by plan ID
      const groupedInstallments = (data || []).reduce((acc, installment) => {
        if (!acc[installment.payment_plan_id]) {
          acc[installment.payment_plan_id] = [];
        }
        acc[installment.payment_plan_id].push(installment);
        return acc;
      }, {} as Record<string, PaymentInstallment[]>);

      setAllInstallments(groupedInstallments);
    } catch (error) {
      console.error('Error fetching installments:', error);
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
      toast.error("No se pudieron cargar las cuotas");
    }
  };

  const handleViewDetails = async (plan: PaymentPlan) => {
    setSelectedPlan(plan);
    setDialogOpen(true);
    await fetchInstallments(plan.id);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendiente', variant: 'secondary' as const },
      overdue: { label: 'Vencido', variant: 'destructive' as const },
      paid: { label: 'Pagado', variant: 'default' as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPlanCategoryBadge = (plan: PaymentPlan) => {
    // Logic for determining plan category based on context
    if (mode === 'sales') {
      return <Badge variant="outline">Ventas</Badge>;
    } else if (mode === 'design') {
      return <Badge variant="outline">Diseño</Badge>;
    } else {
      return <Badge variant="outline">Construcción</Badge>;
    }
  };

  const calculateProgress = (planId: string) => {
    const planInstallments = allInstallments[planId] || [];
    if (planInstallments.length === 0) return 0;
    
    const paidCount = planInstallments.filter(inst => inst.status === 'paid').length;
    return Math.round((paidCount / planInstallments.length) * 100);
  };

  const calculateTotalPaid = (planId: string) => {
    const planInstallments = allInstallments[planId] || [];
    return planInstallments
      .filter(inst => inst.status === 'paid')
      .reduce((sum, inst) => sum + inst.amount, 0);
  };

  const formatCurrency = (amount: number, currency: string = 'MXN') => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const handleInformativeAction = () => {
    if (mode === 'sales') {
      toast.info('Para marcar pagos, dirígete al módulo de Finanzas → Planes de Pago');
    }
  };

  const handleMarkAsPaid = async () => {
    if (!paymentDialog) return;

    try {
      // Update payment installment status
      const { error: updateError } = await supabase
        .from('payment_installments')
        .update({
          status: 'paid',
          paid_date: paymentForm.paid_date,
          reference_number: paymentForm.reference_number,
        })
        .eq('id', paymentDialog.installment.id);

      if (updateError) throw updateError;

      // Get current user profile for created_by
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Get payment plan details to get client and project IDs
      const { data: planData } = await supabase
        .from('payment_plans')
        .select('client_project_id')
        .eq('id', paymentDialog.installment.payment_plan_id)
        .single();

      if (!planData) throw new Error('Payment plan not found');

      // Get project details to get client_id
      const { data: projectData } = await supabase
        .from('client_projects')
        .select('client_id')
        .eq('id', planData.client_project_id)
        .single();

      if (!projectData) throw new Error('Project not found');

      // Create automatic income entry when installment is marked as paid
      const { error: incomeError } = await supabase
        .from('incomes')
        .insert([{
          client_id: projectData.client_id,
          project_id: planData.client_project_id,
          category: 'construction_service',
          amount: paymentDialog.installment.amount,
          description: `Pago de cuota ${paymentDialog.installment.installment_number} - Plan: ${paymentDialog.planName}`,
          expense_date: paymentForm.paid_date,
          reference_number: paymentForm.reference_number,
          created_by: profile.id
        }]);

      if (incomeError) throw incomeError;

      toast.success("Cuota marcada como pagada e ingreso registrado correctamente");

      // Refresh installments and payment plans
      if (selectedPlan) {
        await fetchInstallments(selectedPlan.id);
      }
      await fetchPaymentPlans(); // Refresh payment plans to update dashboard cards
      
      setPaymentDialog(null);
      setPaymentForm({
        paid_date: '',
        payment_method: '',
        reference_number: '',
        notes: ''
      });

      if (onUpdate) onUpdate();

    } catch (error) {
      console.error('Error marking payment:', error);
      toast.error("Error al marcar el pago como pagado");
    }
  };

  const openPaymentDialog = (installment: PaymentInstallment) => {
    const plan = paymentPlans.find(p => p.id === installment.payment_plan_id);
    if (plan) {
      setPaymentDialog({
        installment,
        planName: plan.plan_name,
        clientName: plan.client_projects?.clients?.full_name || 'Cliente no encontrado'
      });
      setPaymentForm({
        paid_date: new Date().toISOString().split('T')[0],
        payment_method: '',
        reference_number: '',
        notes: ''
      });
    }
  };

  const handleMarkPlanAsPaid = async (plan: PaymentPlan) => {
    if (mode === 'sales') {
      handleInformativeAction();
      return;
    }

    try {
      const planInstallments = allInstallments[plan.id] || [];
      const unpaidInstallments = planInstallments.filter(inst => inst.status !== 'paid');

      if (unpaidInstallments.length === 0) {
        toast.info("Todas las cuotas ya están marcadas como pagadas");
        return;
      }

      // Get current user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Mark all unpaid installments as paid
      for (const installment of unpaidInstallments) {
        // Update installment
        const { error: updateError } = await supabase
          .from('payment_installments')
          .update({
            status: 'paid',
            paid_date: new Date().toISOString().split('T')[0],
          })
          .eq('id', installment.id);

        if (updateError) throw updateError;

        // Create income entry
        const { error: incomeError } = await supabase
          .from('incomes')
          .insert([{
            client_id: plan.client_id || '',
            project_id: plan.client_project_id,
            category: 'construction_service',
            amount: installment.amount,
            description: `Pago de cuota ${installment.installment_number} - Plan: ${plan.plan_name}`,
            expense_date: new Date().toISOString().split('T')[0],
            created_by: profile.id
          }]);

        if (incomeError) throw incomeError;
      }

      toast.success("Todas las cuotas han sido marcadas como pagadas");

      // Refresh data
      await fetchPaymentPlans();
      if (onUpdate) onUpdate();

    } catch (error) {
      console.error('Error marking plan as paid:', error);
      toast.error("Error al marcar el plan como pagado");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Planes de Pago</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Cargando...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {paymentPlans.map((plan) => (
          <Card key={plan.id} className="relative">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{plan.plan_name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {plan.client_projects?.clients?.full_name || 'Cliente no encontrado'}
                    </span>
                    {getPlanCategoryBadge(plan)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Proyecto: {plan.client_projects?.project_name || 'Proyecto no encontrado'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {formatCurrency(plan.total_amount, plan.currency)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Pagado: {formatCurrency(calculateTotalPaid(plan.id), plan.currency)}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progreso del plan</span>
                    <span>{calculateProgress(plan.id)}%</span>
                  </div>
                  <Progress value={calculateProgress(plan.id)} className="h-2" />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {(allInstallments[plan.id] || []).length} cuotas
                    </span>
                    <DollarSign className="h-4 w-4 text-muted-foreground ml-2" />
                    <span className="text-sm text-muted-foreground">
                      {(allInstallments[plan.id] || []).filter(inst => inst.status === 'paid').length} pagadas
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleViewDetails(plan)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver Detalles
                    </Button>
                    {mode === 'finance' && (
                      <Button 
                        size="sm" 
                        onClick={() => handleMarkPlanAsPaid(plan)}
                        disabled={calculateProgress(plan.id) === 100}
                      >
                        {calculateProgress(plan.id) === 100 ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Completado
                          </>
                        ) : (
                          <>
                            Marcar Todo Pagado
                          </>
                        )}
                      </Button>
                    )}
                    {mode === 'sales' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={handleInformativeAction}
                      >
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Marcar Pagado
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {paymentPlans.length === 0 && (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                No se encontraron planes de pago
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedPlan?.plan_name} - Detalles de Cuotas
            </DialogTitle>
          </DialogHeader>
          
          {selectedPlan && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Cliente:</strong> {selectedPlan.client_projects?.clients?.full_name}
                </div>
                <div>
                  <strong>Proyecto:</strong> {selectedPlan.client_projects?.project_name}
                </div>
                <div>
                  <strong>Total:</strong> {formatCurrency(selectedPlan.total_amount, selectedPlan.currency)}
                </div>
                <div>
                  <strong>Progreso:</strong> {calculateProgress(selectedPlan.id)}%
                </div>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cuota</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Fecha Venc.</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Pago</TableHead>
                    {mode === 'finance' && <TableHead>Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installments.map((installment) => (
                    <TableRow key={installment.id}>
                      <TableCell>#{installment.installment_number}</TableCell>
                      <TableCell>{formatCurrency(installment.amount)}</TableCell>
                      <TableCell>
                        {format(new Date(installment.due_date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(installment.status)}
                      </TableCell>
                      <TableCell>
                        {installment.paid_date ? 
                          format(new Date(installment.paid_date), 'dd/MM/yyyy') : 
                          '-'
                        }
                      </TableCell>
                      {mode === 'finance' && (
                        <TableCell>
                          {installment.status === 'pending' ? (
                            <Button
                              size="sm"
                              onClick={() => openPaymentDialog(installment)}
                            >
                              Marcar Pagado
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm">Pagado</span>
                          )}
                        </TableCell>
                      )}
                      {mode === 'sales' && (
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleInformativeAction}
                          >
                            Marcar Pagado
                          </Button>
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

      {/* Payment Dialog */}
      <Dialog open={!!paymentDialog} onOpenChange={() => setPaymentDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar Cuota como Pagada</DialogTitle>
            <DialogDescription>
              {paymentDialog && (
                <>
                  Plan: {paymentDialog.planName} | Cliente: {paymentDialog.clientName}
                  <br />
                  Cuota #{paymentDialog.installment.installment_number} - {formatCurrency(paymentDialog.installment.amount)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="paid_date">Fecha de Pago</Label>
              <Input
                id="paid_date"
                type="date"
                value={paymentForm.paid_date}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, paid_date: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="payment_method">Método de Pago</Label>
              <Select
                value={paymentForm.payment_method}
                onValueChange={(value) => setPaymentForm(prev => ({ ...prev, payment_method: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="reference_number">Número de Referencia</Label>
              <Input
                id="reference_number"
                placeholder="Número de transferencia, cheque, etc."
                value={paymentForm.reference_number}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, reference_number: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="notes">Notas (Opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Observaciones adicionales..."
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setPaymentDialog(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleMarkAsPaid}
              disabled={!paymentForm.paid_date || !paymentForm.payment_method}
            >
              Confirmar Pago
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};