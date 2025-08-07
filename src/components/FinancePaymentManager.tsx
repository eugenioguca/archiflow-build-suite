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
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  
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
      
      // Update installment status - copying exact working logic from PaymentPlanBuilder
      const { error: updateError } = await supabase
        .from('payment_installments')
        .update({
          status: 'paid',
          paid_date: paymentForm.payment_date || new Date().toISOString().split('T')[0]
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
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              <FileText className="h-4 w-4 mr-1" />
              Tabla
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('cards')}
            >
              <Users className="h-4 w-4 mr-1" />
              Tarjetas
            </Button>
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

      {/* Plans Content */}
      {viewMode === 'table' ? (
        <Card>
          <CardHeader>
            <CardTitle>Planes de Pago</CardTitle>
            <CardDescription>
              Vista en tabla de todos los planes de pago y sus parcialidades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {filteredPlans.map((plan) => {
                const summary = calculatePlanSummary(plan.id);
                const planInstallments = installments[plan.id] || [];
                
                return (
                  <div key={plan.id} className="border rounded-lg overflow-hidden">
                    {/* Plan Header */}
                    <div className="bg-muted/50 p-4 border-b">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold">{plan.plan_name}</h3>
                            <Badge variant="outline">
                              {plan.plan_type === 'sales_to_design' ? 'Ventas a Diseño' : 'Diseño a Construcción'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {plan.client_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {plan.project_name}
                            </span>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="text-lg font-bold">{formatCurrency(summary.totalAmount)}</div>
                          <div className="flex items-center gap-2">
                            <Progress value={summary.progress} className="w-20 h-2" />
                            <span className="text-xs text-muted-foreground">{Math.round(summary.progress)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Installments Table */}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">#</TableHead>
                            <TableHead>Monto</TableHead>
                            <TableHead>Fecha Vencimiento</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Fecha Pago</TableHead>
                            <TableHead>Método</TableHead>
                            <TableHead>Referencia</TableHead>
                            <TableHead className="w-32">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {planInstallments.map((installment) => (
                            <TableRow key={installment.id} className="hover:bg-muted/50">
                              <TableCell className="font-medium">
                                #{installment.installment_number}
                              </TableCell>
                              <TableCell className="font-semibold">
                                {formatCurrency(installment.amount)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-3 w-3 text-muted-foreground" />
                                  {format(new Date(installment.due_date), 'dd MMM yyyy', { locale: es })}
                                </div>
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(installment.status)}
                              </TableCell>
                              <TableCell>
                                {installment.paid_date ? 
                                  format(new Date(installment.paid_date), 'dd MMM yyyy', { locale: es }) 
                                  : '-'
                                }
                              </TableCell>
                              <TableCell>
                                {installment.payment_method || '-'}
                              </TableCell>
                              <TableCell>
                                {installment.reference_number || '-'}
                              </TableCell>
                              <TableCell>
                                {installment.status === 'pending' && (
                                  <Button
                                    size="sm"
                                    onClick={() => openPaymentDialog(installment)}
                                    className="h-8 px-3"
                                  >
                                    <DollarSign className="h-3 w-3 mr-1" />
                                    Pagar
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Cards View */
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => {
            const summary = calculatePlanSummary(plan.id);
            const planInstallments = installments[plan.id] || [];
            
            return (
              <Card key={plan.id} className="hover:shadow-lg transition-all duration-300 hover-scale">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{plan.plan_name}</CardTitle>
                      <CardDescription>
                        <div className="flex items-center gap-1 text-sm">
                          <Users className="h-3 w-3" />
                          {plan.client_name}
                        </div>
                        <div className="flex items-center gap-1 text-xs mt-1">
                          <FileText className="h-3 w-3" />
                          {plan.project_name}
                        </div>
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
                    <Progress value={summary.progress} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{summary.paidInstallments} de {summary.totalInstallments} pagadas</span>
                      <span>{formatCurrency(summary.totalPaid)} de {formatCurrency(summary.totalAmount)}</span>
                    </div>
                  </div>

                  {summary.overdueInstallments > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-red-700">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {summary.overdueInstallments} parcialidad{summary.overdueInstallments > 1 ? 'es' : ''} vencida{summary.overdueInstallments > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Installments list */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Parcialidades</h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {planInstallments.map((installment) => (
                        <div key={installment.id} className="flex items-center justify-between p-2 rounded-md border text-sm hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">#{installment.installment_number}</span>
                            <span>{formatCurrency(installment.amount)}</span>
                            {getStatusBadge(installment.status)}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(installment.due_date), 'dd/MM/yy')}
                            </span>
                            {installment.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openPaymentDialog(installment)}
                                className="h-6 px-2 text-xs hover-scale"
                              >
                                <DollarSign className="h-3 w-3 mr-1" />
                                Pagar
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
      )}

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

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-lg animate-scale-in">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Marcar parcialidad como pagada
            </DialogTitle>
            <DialogDescription>
              {paymentDialogData && (
                <div className="space-y-2 mt-2">
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                    <div><strong>Plan:</strong> {paymentDialogData.planName}</div>
                    <div><strong>Cliente:</strong> {paymentDialogData.clientName}</div>
                    <div className="flex items-center gap-2">
                      <strong>Parcialidad #{paymentDialogData.installment.installment_number}:</strong>
                      <span className="text-lg font-bold text-primary">
                        {formatCurrency(paymentDialogData.installment.amount)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_date">Fecha de pago *</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({...paymentForm, payment_date: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="payment_method">Método de pago *</Label>
                <Select 
                  value={paymentForm.payment_method} 
                  onValueChange={(value) => setPaymentForm({...paymentForm, payment_method: value})}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transferencia">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        Transferencia Bancaria
                      </div>
                    </SelectItem>
                    <SelectItem value="efectivo">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Efectivo
                      </div>
                    </SelectItem>
                    <SelectItem value="cheque">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        Cheque
                      </div>
                    </SelectItem>
                    <SelectItem value="tarjeta">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        Tarjeta de Crédito/Débito
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reference_number">Número de referencia</Label>
              <Input
                id="reference_number"
                placeholder="Ej: REF-12345, Transferencia #123456"
                value={paymentForm.reference_number}
                onChange={(e) => setPaymentForm({...paymentForm, reference_number: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notas adicionales</Label>
              <Textarea
                id="notes"
                placeholder="Notas sobre el pago, observaciones, etc..."
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsPaymentDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleMarkAsPaid}
              disabled={!paymentForm.payment_method}
              className="bg-primary hover:bg-primary/90"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmar pago
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};