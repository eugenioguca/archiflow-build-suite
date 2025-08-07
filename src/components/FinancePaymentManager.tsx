import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, DollarSign, Clock, CheckCircle, AlertTriangle, Search, Filter, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { GlobalFilters } from './GlobalFilters';

interface PaymentPlan {
  id: string;
  plan_name: string;
  total_amount: number;
  currency: string;
  status: string;
  plan_type: string;
  created_at: string;
  client_project_id: string;
  project_name: string;
  client_name: string;
  client_id: string;
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
  payment_method?: string;
  notes?: string;
}

interface PaymentDialogData {
  installment: PaymentInstallment;
  planName: string;
  clientName: string;
}

interface FinancePaymentManagerProps {
  selectedClientId?: string;
  selectedProjectId?: string;
  onClientChange: (clientId: string | undefined) => void;
  onProjectChange: (projectId: string | undefined) => void;
  onClearFilters: () => void;
}

export const FinancePaymentManager: React.FC<FinancePaymentManagerProps> = ({
  selectedClientId,
  selectedProjectId,
  onClientChange,
  onProjectChange,
  onClearFilters
}) => {
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [installments, setInstallments] = useState<{[key: string]: PaymentInstallment[]}>({});
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planTypeFilter, setPlanTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Dialog states
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentDialogData, setPaymentDialogData] = useState<PaymentDialogData | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: '',
    reference_number: '',
    notes: ''
  });

  // Fetch payment plans with direct queries
  const fetchPaymentPlans = async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('payment_plans')
        .select(`
          id,
          plan_name,
          total_amount,
          currency,
          status,
          plan_type,
          created_at,
          client_project_id,
          client_projects!inner(
            id,
            project_name,
            client_id,
            clients!inner(
              id,
              full_name
            )
          )
        `)
        .eq('status', 'active');

      if (selectedClientId) {
        query = query.eq('client_projects.client_id', selectedClientId);
      }
      
      if (selectedProjectId) {
        query = query.eq('client_project_id', selectedProjectId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching payment plans:', error);
        toast.error('Error al cargar planes de pago');
        return;
      }

      const transformedData = data?.map(plan => ({
        id: plan.id,
        plan_name: plan.plan_name,
        total_amount: plan.total_amount,
        currency: plan.currency,
        status: plan.status,
        plan_type: plan.plan_type,
        created_at: plan.created_at,
        client_project_id: plan.client_project_id,
        project_name: plan.client_projects?.project_name || '',
        client_name: plan.client_projects?.clients?.full_name || '',
        client_id: plan.client_projects?.client_id || ''
      })) || [];

      setPaymentPlans(transformedData);
      
      // Fetch installments for all plans
      if (transformedData.length > 0) {
        await fetchAllInstallments(transformedData.map(p => p.id));
      }
    } catch (error) {
      console.error('Error in fetchPaymentPlans:', error);
      toast.error('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch installments for multiple plans
  const fetchAllInstallments = async (planIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('payment_installments')
        .select('*')
        .in('payment_plan_id', planIds)
        .order('installment_number', { ascending: true });

      if (error) {
        console.error('Error fetching installments:', error);
        return;
      }

      // Group installments by plan_id
      const groupedInstallments = data?.reduce((acc, installment) => {
        if (!acc[installment.payment_plan_id]) {
          acc[installment.payment_plan_id] = [];
        }
        acc[installment.payment_plan_id].push(installment);
        return acc;
      }, {} as {[key: string]: PaymentInstallment[]}) || {};

      setInstallments(groupedInstallments);
    } catch (error) {
      console.error('Error in fetchAllInstallments:', error);
    }
  };

  // Mark installment as paid
  const handleMarkAsPaid = async () => {
    if (!paymentDialogData) return;

    try {
      const installment = paymentDialogData.installment;
      
      // Update installment status
      const { error: updateError } = await supabase
        .from('payment_installments')
        .update({
          status: 'paid',
          paid_date: paymentForm.payment_date,
          payment_method: paymentForm.payment_method,
          reference_number: paymentForm.reference_number,
          notes: paymentForm.notes
        })
        .eq('id', installment.id);

      if (updateError) {
        console.error('Error updating installment:', updateError);
        toast.error('Error al actualizar parcialidad');
        return;
      }

      // Get plan and project info for income creation
      const plan = paymentPlans.find(p => p.id === installment.payment_plan_id);
      if (!plan) {
        toast.error('Error: Plan no encontrado');
        return;
      }

      // Create income record
      const { error: incomeError } = await supabase
        .from('incomes')
        .insert({
          description: `Pago parcialidad ${installment.installment_number} - ${plan.plan_name}`,
          amount: installment.amount,
          expense_date: paymentForm.payment_date,
          category: 'other',
          payment_method: paymentForm.payment_method,
          reference_number: paymentForm.reference_number,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (incomeError) {
        console.error('Error creating income:', incomeError);
        toast.error('Error al crear registro de ingreso');
        return;
      }

      toast.success('Pago registrado exitosamente');
      setIsPaymentDialogOpen(false);
      setPaymentDialogData(null);
      setPaymentForm({
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: '',
        reference_number: '',
        notes: ''
      });
      
      // Refresh data
      fetchPaymentPlans();
    } catch (error) {
      console.error('Error in handleMarkAsPaid:', error);
      toast.error('Error al procesar pago');
    }
  };

  // Open payment dialog
  const openPaymentDialog = (installment: PaymentInstallment) => {
    const plan = paymentPlans.find(p => p.id === installment.payment_plan_id);
    if (!plan) return;

    setPaymentDialogData({
      installment,
      planName: plan.plan_name,
      clientName: plan.client_name
    });
    setPaymentForm({
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: '',
      reference_number: '',
      notes: ''
    });
    setIsPaymentDialogOpen(true);
  };

  // Filter plans based on search and filters
  const filteredPlans = paymentPlans.filter(plan => {
    const matchesSearch = plan.plan_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plan.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plan.project_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPlanType = planTypeFilter === 'all' || plan.plan_type === planTypeFilter;
    
    return matchesSearch && matchesPlanType;
  });

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-emerald-100 text-emerald-800 border-emerald-200">Pagada</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Vencida</Badge>;
      case 'pending':
      default:
        return <Badge variant="secondary">Pendiente</Badge>;
    }
  };

  // Format currency
  const formatCurrency = (amount: number, currency = 'MXN') => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  // Calculate plan summary
  const calculatePlanSummary = (planId: string) => {
    const planInstallments = installments[planId] || [];
    const totalInstallments = planInstallments.length;
    const paidInstallments = planInstallments.filter(i => i.status === 'paid').length;
    const totalPaid = planInstallments
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + i.amount, 0);
    const totalAmount = planInstallments.reduce((sum, i) => sum + i.amount, 0);
    const progress = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

    return {
      totalInstallments,
      paidInstallments,
      totalPaid,
      totalAmount,
      progress
    };
  };

  useEffect(() => {
    fetchPaymentPlans();
  }, [selectedClientId, selectedProjectId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Cargando planes de pago...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestión de Pagos</h2>
          <p className="text-muted-foreground">
            Administra los pagos de parcialidades de planes de pago
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <GlobalFilters
          selectedClientId={selectedClientId}
          selectedProjectId={selectedProjectId}
          onClientChange={onClientChange}
          onProjectChange={onProjectChange}
          onClearFilters={onClearFilters}
        />
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, proyecto o plan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={planTypeFilter} onValueChange={setPlanTypeFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Tipo de plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="sales_to_design">Ventas a Diseño</SelectItem>
              <SelectItem value="design_to_construction">Diseño a Construcción</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredPlans.map((plan) => {
          const summary = calculatePlanSummary(plan.id);
          const planInstallments = installments[plan.id] || [];
          
          return (
            <Card key={plan.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{plan.plan_name}</CardTitle>
                    <CardDescription className="mt-1">
                      <div>{plan.client_name}</div>
                      <div className="text-xs">{plan.project_name}</div>
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="ml-2">
                    {plan.plan_type === 'sales_to_design' ? 'Ventas' : 'Construcción'}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span>Progreso de pagos</span>
                    <span className="font-medium">{Math.round(summary.progress)}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${summary.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{summary.paidInstallments} de {summary.totalInstallments} pagadas</span>
                    <span>{formatCurrency(summary.totalPaid)} de {formatCurrency(summary.totalAmount)}</span>
                  </div>
                </div>

                {/* Installments list */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Parcialidades</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {planInstallments.map((installment) => (
                      <div key={installment.id} className="flex items-center justify-between p-2 rounded-md border text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">#{installment.installment_number}</span>
                          <span>{formatCurrency(installment.amount)}</span>
                          {getStatusBadge(installment.status)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(installment.due_date), 'dd/MM/yyyy')}
                          </span>
                          {installment.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openPaymentDialog(installment)}
                              className="h-6 px-2 text-xs"
                            >
                              Marcar como pagada
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredPlans.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No se encontraron planes de pago</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              No hay planes de pago que coincidan con los filtros seleccionados.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Marcar parcialidad como pagada</DialogTitle>
            <DialogDescription>
              {paymentDialogData && (
                <>
                  Plan: {paymentDialogData.planName}<br/>
                  Cliente: {paymentDialogData.clientName}<br/>
                  Parcialidad #{paymentDialogData.installment.installment_number} - {formatCurrency(paymentDialogData.installment.amount)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_date">Fecha de pago</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({...paymentForm, payment_date: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="payment_method">Método de pago</Label>
                <Select 
                  value={paymentForm.payment_method} 
                  onValueChange={(value) => setPaymentForm({...paymentForm, payment_method: value})}
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
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reference_number">Número de referencia</Label>
              <Input
                id="reference_number"
                placeholder="Ej: REF-12345"
                value={paymentForm.reference_number}
                onChange={(e) => setPaymentForm({...paymentForm, reference_number: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Notas adicionales sobre el pago..."
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsPaymentDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleMarkAsPaid}>
              Confirmar pago
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};