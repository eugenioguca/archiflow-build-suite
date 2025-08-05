import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
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
  TrendingUp
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
  total_amount: number;
  currency: string;
  status: string;
  start_date: string;
  installments: PaymentInstallment[];
}

interface PaymentPlanViewerProps {
  projectId: string;
  clientId: string;
}

export const PaymentPlanViewer: React.FC<PaymentPlanViewerProps> = ({ 
  projectId, 
  clientId 
}) => {
  const { toast } = useToast();
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaymentPlan();
  }, [projectId, clientId]);

  const fetchPaymentPlan = async () => {
    try {
      // Obtener plan de pagos activo para el proyecto
      const { data: planData, error: planError } = await supabase
        .from('payment_plans')
        .select(`
          id,
          plan_name,
          total_amount,
          currency,
          status,
          start_date
        `)
        .eq('client_project_id', projectId)
        .eq('status', 'active')
        .single();

      if (planError && planError.code !== 'PGRST116') {
        throw planError;
      }

      if (!planData) {
        setPaymentPlan(null);
        return;
      }

      // Obtener installments del plan
      const { data: installmentsData, error: installmentsError } = await supabase
        .from('payment_installments')
        .select('*')
        .eq('payment_plan_id', planData.id)
        .order('installment_number', { ascending: true });

      if (installmentsError) throw installmentsError;

      setPaymentPlan({
        ...planData,
        installments: (installmentsData || []).map(inst => ({
          ...inst,
          status: inst.status as 'pending' | 'paid' | 'overdue'
        }))
      });

    } catch (error: any) {
      console.error('Error fetching payment plan:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar el plan de pagos"
      });
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (!paymentPlan) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium text-lg mb-2">No hay plan de pagos</h3>
          <p className="text-muted-foreground">
            El plan de pagos se creará desde el módulo de ventas.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalPaid = paymentPlan.installments
    .filter(inst => inst.status === 'paid')
    .reduce((sum, inst) => sum + inst.amount, 0);

  const paymentProgress = (totalPaid / paymentPlan.total_amount) * 100;

  return (
    <div className="space-y-6">
      {/* Resumen del Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {paymentPlan.plan_name}
            </span>
            <Badge variant="outline">
              {paymentPlan.installments.length} parcialidades
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progreso de Pagos</span>
              <span className="font-medium">{Math.round(paymentProgress)}%</span>
            </div>
            <Progress value={paymentProgress} className="h-2" />
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(paymentPlan.total_amount)}
              </div>
              <div className="text-sm text-muted-foreground">Total del Plan</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalPaid)}
              </div>
              <div className="text-sm text-muted-foreground">Total Pagado</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(paymentPlan.total_amount - totalPaid)}
              </div>
              <div className="text-sm text-muted-foreground">Pendiente</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Installments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Cronograma de Pagos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paymentPlan.installments.map((installment, index) => (
              <div key={installment.id}>
                <div className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {getStatusIcon(installment.status)}
                    </div>
                    <div>
                      <div className="font-medium">
                        Parcialidad #{installment.installment_number}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Vence: {formatDate(installment.due_date)}
                        {installment.paid_date && (
                          <>
                            <span>•</span>
                            <span>Pagado: {formatDate(installment.paid_date)}</span>
                          </>
                        )}
                      </div>
                      {installment.description && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {installment.description}
                        </div>
                      )}
                      {installment.reference_number && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Receipt className="h-3 w-3" />
                          Ref: {installment.reference_number}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-lg">
                      {formatCurrency(installment.amount)}
                    </div>
                    {getStatusBadge(installment.status)}
                  </div>
                </div>
                {index < paymentPlan.installments.length - 1 && (
                  <Separator className="my-2" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};