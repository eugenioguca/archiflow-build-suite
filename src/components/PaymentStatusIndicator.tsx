import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface PaymentStatusIndicatorProps {
  clientProjectId: string;
  size?: 'sm' | 'md' | 'lg';
}

interface PaymentStatus {
  hasPlans: boolean;
  totalPlans: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  progressPercentage: number;
  planCategories: string[];
}

export const PaymentStatusIndicator: React.FC<PaymentStatusIndicatorProps> = ({
  clientProjectId,
  size = 'sm'
}) => {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    hasPlans: false,
    totalPlans: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    progressPercentage: 0,
    planCategories: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaymentStatus();
  }, [clientProjectId]);

  const fetchPaymentStatus = async () => {
    try {
      // Fetch payment plans for this project
      const { data: plans, error: plansError } = await supabase
        .from('payment_plans_with_sales')
        .select('*')
        .eq('client_project_id', clientProjectId)
        .eq('status', 'active');

      if (plansError) throw plansError;

      if (!plans || plans.length === 0) {
        setPaymentStatus({
          hasPlans: false,
          totalPlans: 0,
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          overdueAmount: 0,
          progressPercentage: 0,
          planCategories: []
        });
        return;
      }

      // Fetch installments for all plans
      const planIds = plans.map(p => p.id);
      const { data: installments, error: installmentsError } = await supabase
        .from('payment_installments')
        .select('*')
        .in('payment_plan_id', planIds);

      if (installmentsError) throw installmentsError;

      // Calculate totals
      const totalAmount = plans.reduce((sum, plan) => sum + plan.total_amount, 0);
      const paidInstallments = installments?.filter(i => i.status === 'paid') || [];
      const pendingInstallments = installments?.filter(i => i.status === 'pending') || [];
      const overdueInstallments = installments?.filter(i => i.status === 'overdue') || [];
      
      const paidAmount = paidInstallments.reduce((sum, i) => sum + i.amount, 0);
      const pendingAmount = pendingInstallments.reduce((sum, i) => sum + i.amount, 0);
      const overdueAmount = overdueInstallments.reduce((sum, i) => sum + i.amount, 0);

      const progressPercentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

      // Determine plan categories
      const categories = plans.map(plan => {
        const name = plan.plan_name.toLowerCase();
        if (name.includes('diseño') || name.includes('design')) return 'design';
        if (name.includes('construcción') || name.includes('construction')) return 'construction';
        return 'general';
      });

      setPaymentStatus({
        hasPlans: true,
        totalPlans: plans.length,
        totalAmount,
        paidAmount,
        pendingAmount,
        overdueAmount,
        progressPercentage,
        planCategories: [...new Set(categories)]
      });

    } catch (error) {
      console.error('Error fetching payment status:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getCategoryBadges = () => {
    return paymentStatus.planCategories.map(category => {
      const config = {
        design: { label: 'D', color: 'bg-blue-500 text-white' },
        construction: { label: 'C', color: 'bg-green-500 text-white' },
        general: { label: 'G', color: 'bg-gray-500 text-white' }
      };
      
      const cat = config[category as keyof typeof config] || config.general;
      return (
        <div 
          key={category}
          className={`w-4 h-4 rounded-full text-xs flex items-center justify-center ${cat.color}`}
          title={category === 'design' ? 'Diseño' : category === 'construction' ? 'Construcción' : 'General'}
        >
          {cat.label}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse" />
        <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse" />
      </div>
    );
  }

  if (!paymentStatus.hasPlans) {
    return (
      <div className="flex items-center gap-1" title="Sin planes de pago">
        <DollarSign className="h-3 w-3 text-gray-400" />
        <span className="text-xs text-gray-400">Sin plan</span>
      </div>
    );
  }

  if (size === 'sm') {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {getCategoryBadges()}
        </div>
        <div className="flex items-center gap-1">
          <Progress value={paymentStatus.progressPercentage} className="w-8 h-1" />
          <span className="text-xs text-muted-foreground">
            {Math.round(paymentStatus.progressPercentage)}%
          </span>
        </div>
        {paymentStatus.overdueAmount > 0 && (
          <div title="Pagos vencidos">
            <AlertTriangle className="h-3 w-3 text-red-500" />
          </div>
        )}
      </div>
    );
  }

  if (size === 'md') {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Planes de Pago</span>
            <div className="flex gap-1">
              {getCategoryBadges()}
            </div>
          </div>
          <span className="text-sm font-bold">
            {formatCurrency(paymentStatus.totalAmount)}
          </span>
        </div>
        
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>Progreso</span>
            <span>{Math.round(paymentStatus.progressPercentage)}%</span>
          </div>
          <Progress value={paymentStatus.progressPercentage} className="h-2" />
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-600" />
            <span>{formatCurrency(paymentStatus.paidAmount)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-blue-600" />
            <span>{formatCurrency(paymentStatus.pendingAmount)}</span>
          </div>
          {paymentStatus.overdueAmount > 0 && (
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-red-600" />
              <span>{formatCurrency(paymentStatus.overdueAmount)}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // size === 'lg'
  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <span className="font-semibold">Estado de Pagos</span>
          <Badge variant="outline">{paymentStatus.totalPlans} planes</Badge>
        </div>
        <span className="text-lg font-bold">
          {formatCurrency(paymentStatus.totalAmount)}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm">Progreso de Pagos</span>
          <span className="text-sm font-medium">{Math.round(paymentStatus.progressPercentage)}%</span>
        </div>
        <Progress value={paymentStatus.progressPercentage} className="h-3" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm">Pagado</span>
          </div>
          <p className="font-semibold text-green-600">
            {formatCurrency(paymentStatus.paidAmount)}
          </p>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="text-sm">Pendiente</span>
          </div>
          <p className="font-semibold text-blue-600">
            {formatCurrency(paymentStatus.pendingAmount)}
          </p>
        </div>

        {paymentStatus.overdueAmount > 0 && (
          <div className="space-y-2 col-span-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm">Vencido</span>
            </div>
            <p className="font-semibold text-red-600">
              {formatCurrency(paymentStatus.overdueAmount)}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <span className="text-sm text-muted-foreground">Categorías de Planes</span>
        <div className="flex gap-2">
          {paymentStatus.planCategories.map(category => {
            const config = {
              design: { label: 'Diseño', color: 'bg-blue-500/10 text-blue-700' },
              construction: { label: 'Construcción', color: 'bg-green-500/10 text-green-700' },
              general: { label: 'General', color: 'bg-gray-500/10 text-gray-700' }
            };
            
            const cat = config[category as keyof typeof config] || config.general;
            return (
              <Badge key={category} variant="outline" className={cat.color}>
                {cat.label}
              </Badge>
            );
          })}
        </div>
      </div>
    </div>
  );
};