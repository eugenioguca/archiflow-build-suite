import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  CreditCard, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  DollarSign,
  Calendar,
  Receipt,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PaymentInstallment {
  id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  status: string;
  description?: string | null;
  paid_date?: string | null;
  payment_method?: string | null;
  reference_number?: string | null;
}

interface PaymentPlan {
  id: string;
  plan_name: string;
  plan_type: string;
  total_amount: number;
  currency: string;
  status: string;
  start_date: string;
  installments?: PaymentInstallment[];
}

interface PaymentPlansViewerProps {
  projectId: string;
  clientId: string;
}

export const PaymentPlansViewer: React.FC<PaymentPlansViewerProps> = ({ 
  projectId, 
  clientId 
}) => {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  useEffect(() => {
    fetchPaymentPlans();
  }, [projectId, clientId]);

  const fetchPaymentPlans = async () => {
    try {
      // Obtener planes de pago activos para el proyecto
      const { data: plansData, error: plansError } = await supabase
        .from('payment_plans')
        .select(`
          id,
          plan_name,
          plan_type,
          total_amount,
          currency,
          status,
          start_date
        `)
        .eq('client_project_id', projectId)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      if (plansError) throw plansError;

      if (!plansData || plansData.length === 0) {
        setPaymentPlans([]);
        return;
      }

      setPaymentPlans(plansData);

    } catch (error: any) {
      console.error('Error fetching payment plans:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los planes de pagos"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchInstallments = async (planId: string) => {
    try {
      const { data: installmentsData, error: installmentsError } = await supabase
        .from('payment_installments')
        .select('*')
        .eq('payment_plan_id', planId)
        .order('installment_number', { ascending: true });

      if (installmentsError) throw installmentsError;

      return (installmentsData || []).map(inst => ({
        ...inst,
        status: inst.status as 'pending' | 'paid' | 'overdue'
      }));

    } catch (error: any) {
      console.error('Error fetching installments:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las parcialidades"
      });
      return [];
    }
  };

  const handlePlanClick = async (planId: string) => {
    if (expandedPlan === planId) {
      setExpandedPlan(null);
      return;
    }

    // Cargar installments si no están cargados
    const plan = paymentPlans.find(p => p.id === planId);
    if (plan && !plan.installments) {
      const installments = await fetchInstallments(planId);
      
      setPaymentPlans(prev => prev.map(p => 
        p.id === planId 
          ? { ...p, installments }
          : p
      ));
    }

    setExpandedPlan(planId);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: es });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      paid: 'default',
      pending: 'secondary', 
      overdue: 'destructive'
    } as const;

    const labels = {
      paid: 'Pagado',
      pending: 'Pendiente',
      overdue: 'Vencido'
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const getPlanTypeLabel = (planType: string) => {
    const types = {
      sales_to_design: 'Plan de Diseño',
      design_to_construction: 'Plan de Construcción',
      general: 'Plan General'
    };
    return types[planType as keyof typeof types] || planType;
  };

  const calculatePlanProgress = (plan: PaymentPlan) => {
    if (!plan.installments || plan.installments.length === 0) return 0;
    
    const totalPaid = plan.installments
      .filter(inst => inst.status === 'paid')
      .reduce((sum, inst) => sum + inst.amount, 0);
    
    return (totalPaid / plan.total_amount) * 100;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (paymentPlans.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium text-lg mb-2">No hay planes de pago</h3>
          <p className="text-muted-foreground">
            Los planes de pago se crearán desde el módulo de ventas.
          </p>
        </CardContent>
      </Card>
    );
  }

  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className={isMobile ? 'p-4' : undefined}>
          <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : ''}`}>
            <CreditCard className="h-5 w-5" />
            <span className={isMobile ? 'text-sm' : ''}>Planes de Pago ({paymentPlans.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className={isMobile ? 'p-4 pt-0' : undefined}>
          <p className={`text-sm text-muted-foreground mb-4 ${isMobile ? 'text-xs' : ''}`}>
            Toca cualquier plan para ver el desglose de parcialidades
          </p>
          
          <div className={`space-y-4 ${isMobile ? 'space-y-3' : ''}`}>
            {paymentPlans.map((plan) => (
              <Collapsible 
                key={plan.id} 
                open={expandedPlan === plan.id}
                onOpenChange={() => handlePlanClick(plan.id)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-between ${isMobile ? 'p-3 h-auto' : 'p-4 h-auto'} cursor-pointer hover:bg-muted/50`}
                  >
                    <div className={`${isMobile ? 'flex flex-col space-y-2 w-full text-left' : 'flex items-center justify-between w-full'}`}>
                      <div className={`${isMobile ? 'w-full' : 'text-left'}`}>
                        <div className={`font-medium ${isMobile ? 'text-sm' : 'text-base'} truncate`}>
                          {plan.plan_name}
                        </div>
                        <div className={`text-sm text-muted-foreground ${isMobile ? 'text-xs' : ''}`}>
                          {getPlanTypeLabel(plan.plan_type)}
                        </div>
                        <div className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-primary mt-1`}>
                          {formatCurrency(plan.total_amount)}
                        </div>
                        {plan.installments && (
                          <div className="mt-2">
                            <Progress 
                              value={calculatePlanProgress(plan)} 
                              className={`h-2 ${isMobile ? 'w-full' : 'w-48'}`}
                            />
                            <div className={`text-xs text-muted-foreground mt-1 ${isMobile ? 'text-xs' : ''}`}>
                              {Math.round(calculatePlanProgress(plan))}% completado
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className={`flex items-center gap-2 ${isMobile ? 'justify-between w-full' : ''}`}>
                        <div className={`flex items-center gap-1 text-sm text-muted-foreground ${isMobile ? 'text-xs' : ''}`}>
                          <Eye className="h-4 w-4" />
                          <span className={isMobile ? 'hidden' : ''}>Ver detalles</span>
                        </div>
                        {expandedPlan === plan.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="mt-4">
                  {plan.installments ? (
                    <Card className="border-l-4 border-l-primary">
                      <CardHeader className={isMobile ? 'p-3' : undefined}>
                        <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
                          <TrendingUp className="h-5 w-5" />
                          <span className={isMobile ? 'text-sm' : ''}>Cronograma de Parcialidades</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className={isMobile ? 'p-3 pt-0' : undefined}>
                        <div className={`space-y-4 ${isMobile ? 'space-y-3' : ''}`}>
                          {plan.installments.map((installment, index) => (
                            <div key={installment.id}>
                              <div className={`${isMobile ? 'flex flex-col space-y-3 p-3' : 'flex items-center justify-between p-4'} border rounded-lg bg-muted/30`}>
                                <div className={`${isMobile ? 'flex items-center justify-between w-full' : 'flex items-center gap-3'}`}>
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                                      {getStatusIcon(installment.status)}
                                    </div>
                                    <div className="min-w-0">
                                      <div className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
                                        Parcialidad #{installment.installment_number}
                                      </div>
                                      <div className={`text-sm text-muted-foreground flex items-center gap-2 ${isMobile ? 'text-xs flex-wrap' : ''}`}>
                                        <Calendar className="h-3 w-3" />
                                        <span>Vence: {formatDate(installment.due_date)}</span>
                                        {installment.paid_date && !isMobile && (
                                          <>
                                            <span>•</span>
                                            <span>Pagado: {formatDate(installment.paid_date)}</span>
                                          </>
                                        )}
                                      </div>
                                      {isMobile && installment.paid_date && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                          Pagado: {formatDate(installment.paid_date)}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {isMobile && (
                                    <div className="text-right flex-shrink-0">
                                      <div className={`font-semibold ${isMobile ? 'text-sm' : 'text-lg'}`}>
                                        {formatCurrency(installment.amount)}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                {installment.description && (
                                  <div className={`text-sm text-muted-foreground ${isMobile ? 'text-xs' : ''} ${!isMobile ? 'mt-1' : ''}`}>
                                    {installment.description}
                                  </div>
                                )}
                                
                                <div className={`${isMobile ? 'flex items-center justify-between w-full' : 'text-right'}`}>
                                  {installment.reference_number && (
                                    <div className={`flex items-center gap-1 text-xs text-muted-foreground ${isMobile ? '' : 'justify-center'}`}>
                                      <Receipt className="h-3 w-3" />
                                      <span>Ref: {installment.reference_number}</span>
                                    </div>
                                  )}
                                  
                                  <div className={`${isMobile ? 'flex-shrink-0' : ''}`}>
                                    {!isMobile && (
                                      <div className="font-semibold text-lg mb-2">
                                        {formatCurrency(installment.amount)}
                                      </div>
                                    )}
                                    {getStatusBadge(installment.status)}
                                  </div>
                                </div>
                              </div>
                              {index < plan.installments.length - 1 && (
                                <Separator className={`my-2 ${isMobile ? 'my-1' : ''}`} />
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className={`text-center py-4 ${isMobile ? 'py-3' : ''}`}>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                      <p className={`text-sm text-muted-foreground mt-2 ${isMobile ? 'text-xs' : ''}`}>Cargando parcialidades...</p>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};