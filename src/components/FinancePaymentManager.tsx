import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, DollarSign, Calendar, Search, Filter, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { GlobalFilters } from './GlobalFilters';

// Copied EXACT interfaces from PaymentPlanBuilder
interface PaymentInstallment {
  id: string;
  payment_plan_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  description: string;
  status: 'pending' | 'paid' | 'overdue' | 'partial';
  paid_amount: number;
  paid_date?: string;
  payment_method: string;
  notes: string;
}

interface PaymentPlan {
  id: string;
  client_project_id: string;
  plan_name: string;
  total_amount: number;
  currency: string;
  status: 'draft' | 'approved' | 'active' | 'completed';
  plan_type?: string;  // Added plan_type field
  created_at: string;
  updated_at: string;
  payments: PaymentInstallment[];
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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planTypeFilter, setPlanTypeFilter] = useState<string>('all');
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set());

  // Fetch payment plans with installments - COPIED from PaymentPlanBuilder
  const fetchPaymentPlans = async () => {
    try {
      setLoading(true);
      
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
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (selectedClientId) {
        query = query.eq('client_projects.client_id', selectedClientId);
      }
      
      if (selectedProjectId) {
        query = query.eq('client_project_id', selectedProjectId);
      }

      const { data: plans, error } = await query;

      if (error) {
        console.error('Error fetching payment plans:', error);
        setPaymentPlans([]);
        return;
      }

      if (plans && plans.length > 0) {
        // Fetch installments for each plan
        const plansWithInstallments = await Promise.all(
          plans.map(async (plan: any) => {
            const { data: installments, error: instError } = await supabase
              .from('payment_installments')
              .select('*')
              .eq('payment_plan_id', plan.id)
              .order('installment_number');

            if (instError) {
              console.error('Error fetching installments:', instError);
              return { ...plan, payments: [] };
            }

            return {
              id: plan.id,
              client_project_id: plan.client_project_id,
              plan_name: plan.plan_name,
              total_amount: plan.total_amount || 0,
              currency: plan.currency || 'MXN',
              status: plan.status as 'draft' | 'approved' | 'active' | 'completed',
              plan_type: plan.plan_type || '',  // Include plan_type
              created_at: plan.created_at,
              updated_at: plan.updated_at,
              payments: (installments || []).map((inst: any) => ({
                id: inst.id,
                payment_plan_id: inst.payment_plan_id,
                installment_number: inst.installment_number,
                amount: inst.amount,
                due_date: inst.due_date,
                description: inst.description || '',
                status: inst.status as 'pending' | 'paid' | 'overdue' | 'partial',
                paid_amount: inst.status === 'paid' ? inst.amount : 0,
                paid_date: inst.paid_date,
                payment_method: '',
                notes: ''
              }))
            };
          })
        );

        setPaymentPlans(plansWithInstallments as PaymentPlan[]);
      } else {
        setPaymentPlans([]);
      }
    } catch (error) {
      console.error('Error fetching payment plans:', error);
      setPaymentPlans([]);
      toast.error('Error al cargar los planes de pago');
    } finally {
      setLoading(false);
    }
  };

  // Simple payment update - NO INCOMES CREATION
  const updatePaymentStatus = async (installmentId: string, status: string) => {
    try {
      // EXACT same logic as PaymentPlanBuilder - SIMPLE UPDATE ONLY
      const { error } = await supabase
        .from('payment_installments')
        .update({
          status: status as any,
          paid_date: status === 'paid' ? new Date().toISOString().split('T')[0] : null
        })
        .eq('id', installmentId);

      if (error) throw error;

      toast.success('Estado de pago actualizado');
      
      // Refresh data
      await fetchPaymentPlans();
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Error al actualizar el estado');
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

  // Helper functions - COPIED from PaymentPlanBuilder
  const getTotalPaid = (payments: PaymentInstallment[]) => {
    if (!payments || !Array.isArray(payments)) {
      return 0;
    }
    return payments.reduce((sum, payment) => {
      return sum + (payment.status === 'paid' ? payment.amount : 0);
    }, 0);
  };

  const formatCurrencyDisplay = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0';
    }
    return value.toLocaleString();
  };

  const getPaymentProgress = (payments: PaymentInstallment[], totalAmount: number) => {
    if (!payments || !Array.isArray(payments) || totalAmount === 0) {
      return 0;
    }
    const totalPaid = getTotalPaid(payments);
    return Math.round((totalPaid / totalAmount) * 100);
  };

  // Filtered plans
  const filteredPlans = paymentPlans.filter(plan => {
    if (searchTerm && !plan.plan_name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (statusFilter !== 'all' && plan.status !== statusFilter) {
      return false;
    }
    if (planTypeFilter !== 'all' && plan.plan_type !== planTypeFilter) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    fetchPaymentPlans();
  }, [selectedClientId, selectedProjectId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="text-lg">Cargando planes de pago...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Gestión de Planes de Pago</h2>
        <p className="text-muted-foreground">
          Administra y actualiza el estado de los pagos de los proyectos
        </p>
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
        
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Buscar planes de pago..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="completed">Completado</SelectItem>
              <SelectItem value="draft">Borrador</SelectItem>
            </SelectContent>
          </Select>

          <Select value={planTypeFilter} onValueChange={setPlanTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo de plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="sales_to_design">Ventas a Diseño</SelectItem>
              <SelectItem value="design_to_construction">Diseño a Construcción</SelectItem>
              <SelectItem value="construction">Construcción</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Payment Plans List - COPIED EXACTLY from PaymentPlanBuilder */}
      <div className="space-y-4">
        {filteredPlans.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <div className="text-lg font-semibold text-muted-foreground">
                No se encontraron planes de pago
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {searchTerm || statusFilter !== 'all' || planTypeFilter !== 'all'
                  ? 'Intenta ajustar los filtros'
                  : 'No hay planes de pago disponibles para los criterios seleccionados'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredPlans.map((plan) => {
            const payments = Array.isArray(plan.payments) ? plan.payments : [];
            const progress = getPaymentProgress(payments, plan.total_amount);
            const totalPaid = getTotalPaid(payments);
            const isExpanded = expandedPlans.has(plan.id);
            
            return (
              <Card key={plan.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{plan.plan_name}</CardTitle>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
                          {plan.status === 'draft' && 'Borrador'}
                          {plan.status === 'approved' && 'Aprobado'}
                          {plan.status === 'active' && 'Activo'}
                          {plan.status === 'completed' && 'Completado'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {payments.length} cuotas
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                         <div className="text-2xl font-bold">
                           ${formatCurrencyDisplay(totalPaid)} / ${formatCurrencyDisplay(plan.total_amount)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {progress}% completado
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => togglePlanExpansion(plan.id)}
                        >
                          {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent>
                    <div className="space-y-4">
                      {/* Progress bar */}
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>

                      {/* Installments list */}
                      <div className="space-y-2">
                        {payments.map((payment) => (
                          <div
                            key={payment.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <Badge variant="outline">
                                #{payment.installment_number}
                              </Badge>
                              <div>
                                 <div className="font-medium">
                                   ${formatCurrencyDisplay(payment.amount)}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Vence: {format(new Date(payment.due_date), 'dd/MM/yyyy', { locale: es })}
                                </div>
                                {payment.description && (
                                  <div className="text-xs text-muted-foreground">
                                    {payment.description}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={payment.status === 'paid' ? 'default' : 'secondary'}
                                className={
                                  payment.status === 'paid' 
                                    ? 'bg-green-100 text-green-700' 
                                    : payment.status === 'overdue'
                                    ? 'bg-red-100 text-red-700'
                                    : ''
                                }
                              >
                                {payment.status === 'pending' && 'Pendiente'}
                                {payment.status === 'paid' && 'Pagado'}
                                {payment.status === 'overdue' && 'Vencido'}
                                {payment.status === 'partial' && 'Parcial'}
                              </Badge>
                              
                              {payment.status !== 'paid' && (
                                <Button
                                  size="sm"
                                  onClick={() => updatePaymentStatus(payment.id, 'paid')}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Marcar como Pagado
                                </Button>
                              )}
                              
                              {payment.status === 'paid' && payment.paid_date && (
                                <span className="text-xs text-muted-foreground bg-green-50 px-2 py-1 rounded">
                                  Pagado: {format(new Date(payment.paid_date), 'dd/MM/yyyy', { locale: es })}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};