import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Calendar, DollarSign, Clock, CheckCircle, AlertTriangle, Search, Filter, CreditCard, Eye, TrendingUp, Users, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
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
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set());

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

  // Mark installment as paid directly (no dialog)
  const handleMarkAsPaid = async (installment: PaymentInstallment) => {
    try {
      // Update installment status - copying exact working logic from PaymentPlanBuilder
      const { error: updateError } = await supabase
        .from('payment_installments')
        .update({
          status: 'paid',
          paid_date: new Date().toISOString().split('T')[0]
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

      // Create income record - using exact working approach from PaymentPlanBuilder
      const { data: projectData } = await supabase
        .from('client_projects')
        .select('client_id')
        .eq('id', plan.client_project_id)
        .single();

      if (projectData) {
        await supabase.from('incomes').insert({
          client_id: projectData.client_id,
          description: `Pago parcialidad ${installment.installment_number} - ${plan.plan_name}`,
          amount: installment.amount,
          expense_date: new Date().toISOString().split('T')[0],
          category: 'other',
          created_by: (await supabase.from('profiles').select('id').eq('user_id', (await supabase.auth.getUser()).data.user?.id || '').single())?.data?.id
        });
      }

      toast.success('Pago registrado exitosamente');
      await fetchAllInstallments(paymentPlans.map(p => p.id));
    } catch (error) {
      console.error('Error in handleMarkAsPaid:', error);
      toast.error('Error al procesar pago');
    }
  };

  // Toggle plan expansion
  const togglePlanExpansion = (planId: string) => {
    const newExpanded = new Set(expandedPlans);
    if (newExpanded.has(planId)) {
      newExpanded.delete(planId);
    } else {
      newExpanded.add(planId);
    }
    setExpandedPlans(newExpanded);
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
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
          <CheckCircle className="w-3 h-3 mr-1" />
          Pagada
        </Badge>;
      case 'overdue':
        return <Badge variant="destructive">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Vencida
        </Badge>;
      case 'pending':
      default:
        return <Badge variant="secondary">
          <Clock className="w-3 h-3 mr-1" />
          Pendiente
        </Badge>;
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
    const overdueInstallments = planInstallments.filter(i => 
      i.status === 'pending' && new Date(i.due_date) < new Date()
    ).length;
    const totalPaid = planInstallments
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + i.amount, 0);
    const totalAmount = planInstallments.reduce((sum, i) => sum + i.amount, 0);
    const progress = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

    return {
      totalInstallments,
      paidInstallments,
      overdueInstallments,
      totalPaid,
      totalAmount,
      progress
    };
  };

  // Calculate dashboard stats
  const calculateDashboardStats = () => {
    const totalPlans = filteredPlans.length;
    const totalAmount = filteredPlans.reduce((sum, plan) => sum + plan.total_amount, 0);
    let totalPaid = 0;
    let overdueAmount = 0;
    let pendingAmount = 0;

    filteredPlans.forEach(plan => {
      const summary = calculatePlanSummary(plan.id);
      totalPaid += summary.totalPaid;
      
      const planInstallments = installments[plan.id] || [];
      planInstallments.forEach(installment => {
        if (installment.status === 'pending') {
          if (new Date(installment.due_date) < new Date()) {
            overdueAmount += installment.amount;
          } else {
            pendingAmount += installment.amount;
          }
        }
      });
    });

    return {
      totalPlans,
      totalAmount,
      totalPaid,
      overdueAmount,
      pendingAmount,
      collectionRate: totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0
    };
  };

  const dashboardStats = calculateDashboardStats();

  useEffect(() => {
    fetchPaymentPlans();
  }, [selectedClientId, selectedProjectId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 animate-fade-in">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <div className="space-y-2">
            <p className="text-lg font-medium">Cargando planes de pago...</p>
            <p className="text-sm text-muted-foreground">Obteniendo información financiera</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg p-6 border">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <CreditCard className="h-8 w-8 text-primary" />
              Gestión de Pagos
            </h2>
            <p className="text-muted-foreground">
              Administra los pagos de parcialidades de planes de pago
            </p>
          </div>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover-scale">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Planes Activos</p>
                <p className="text-2xl font-bold">{dashboardStats.totalPlans}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Cobrado</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(dashboardStats.totalPaid)}</p>
              </div>
              <div className="h-12 w-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vencido</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(dashboardStats.overdueAmount)}</p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tasa de Cobranza</p>
                <p className="text-2xl font-bold text-primary">{dashboardStats.collectionRate.toFixed(1)}%</p>
              </div>
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
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
      </Card>

      {/* Plans Content - Simplified View */}
      <div className="space-y-4">
        {filteredPlans.map((plan) => {
          const summary = calculatePlanSummary(plan.id);
          const planInstallments = installments[plan.id] || [];
          const isExpanded = expandedPlans.has(plan.id);
          const nextPendingInstallment = planInstallments.find(i => i.status === 'pending');
          
          return (
            <Card key={plan.id} className="hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                {/* Plan Summary */}
                <div className="flex items-center justify-between mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-semibold">{plan.plan_name}</h3>
                      <Badge variant="outline">
                        {plan.plan_type === 'sales_to_design' ? 'Ventas a Diseño' : 'Diseño a Construcción'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {plan.client_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {plan.project_name}
                      </span>
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="text-2xl font-bold text-primary">{formatCurrency(summary.totalAmount)}</div>
                    <div className="flex items-center gap-2">
                      <Progress value={summary.progress} className="w-32 h-3" />
                      <span className="text-sm font-medium">{Math.round(summary.progress)}%</span>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-emerald-600">{summary.paidInstallments}</div>
                    <div className="text-xs text-muted-foreground">Pagadas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">{summary.totalInstallments - summary.paidInstallments}</div>
                    <div className="text-xs text-muted-foreground">Pendientes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-emerald-600">{formatCurrency(summary.totalPaid)}</div>
                    <div className="text-xs text-muted-foreground">Cobrado</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-600">{summary.overdueInstallments}</div>
                    <div className="text-xs text-muted-foreground">Vencidas</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => togglePlanExpansion(plan.id)}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    {isExpanded ? 'Ocultar detalles' : 'Ver detalles'}
                  </Button>
                  
                  {nextPendingInstallment && (
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Próximo pago</div>
                        <div className="font-semibold">{formatCurrency(nextPendingInstallment.amount)}</div>
                      </div>
                      <Button
                        onClick={() => handleMarkAsPaid(nextPendingInstallment)}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Marcar como Pagado
                      </Button>
                    </div>
                  )}
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-6 border-t pt-6">
                    <h4 className="text-lg font-semibold mb-4">Detalle de Parcialidades</h4>
                    <div className="space-y-3">
                      {planInstallments.map((installment) => (
                        <div key={installment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <div className="font-bold text-lg">#{installment.installment_number}</div>
                            </div>
                            <div>
                              <div className="font-semibold text-lg">{formatCurrency(installment.amount)}</div>
                              <div className="text-sm text-muted-foreground">
                                Vence: {format(new Date(installment.due_date), 'dd MMM yyyy', { locale: es })}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            {getStatusBadge(installment.status)}
                            {installment.paid_date && (
                              <div className="text-sm text-muted-foreground">
                                Pagado: {format(new Date(installment.paid_date), 'dd MMM yyyy', { locale: es })}
                              </div>
                            )}
                            {installment.status === 'pending' && (
                              <Button
                                size="sm"
                                onClick={() => handleMarkAsPaid(installment)}
                                className="bg-emerald-600 hover:bg-emerald-700"
                              >
                                <DollarSign className="h-4 w-4 mr-1" />
                                Pagar
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredPlans.length === 0 && (
        <Card className="animate-fade-in">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No se encontraron planes de pago</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              No hay planes de pago que coincidan con los filtros seleccionados.
              Ajusta los filtros para ver más resultados.
            </p>
          </CardContent>
        </Card>
      )}

    </div>
  );
};