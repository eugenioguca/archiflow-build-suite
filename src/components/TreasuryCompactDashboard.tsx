import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Building2, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TreasuryCompactDashboardProps {
  selectedClientId?: string;
  selectedProjectId?: string;
}

export const TreasuryCompactDashboard: React.FC<TreasuryCompactDashboardProps> = ({
  selectedClientId,
  selectedProjectId
}) => {
  const [metrics, setMetrics] = useState({
    bankIncome: 0,
    bankExpense: 0,
    cashIncome: 0,
    cashExpense: 0,
    loading: true
  });

  useEffect(() => {
    fetchCompactMetrics();
  }, [selectedClientId, selectedProjectId]);

  const fetchCompactMetrics = async () => {
    try {
      setMetrics(prev => ({ ...prev, loading: true }));

      let query = supabase
        .from('treasury_transactions')
        .select('amount, transaction_type, account_type');

      // Apply filters if provided
      if (selectedClientId) {
        query = query.eq('client_id', selectedClientId);
      }

      if (selectedProjectId) {
        query = query.eq('project_id', selectedProjectId);
      }

      const { data: transactions, error } = await query;

      if (error) throw error;

      // Calculate metrics by account type and transaction type
      const bankIncome = transactions
        ?.filter(t => t.account_type === 'bank' && t.transaction_type === 'income')
        .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

      const bankExpense = transactions
        ?.filter(t => t.account_type === 'bank' && t.transaction_type === 'expense')
        .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

      const cashIncome = transactions
        ?.filter(t => t.account_type === 'cash' && t.transaction_type === 'income')
        .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

      const cashExpense = transactions
        ?.filter(t => t.account_type === 'cash' && t.transaction_type === 'expense')
        .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

      setMetrics({
        bankIncome,
        bankExpense,
        cashIncome,
        cashExpense,
        loading: false
      });

    } catch (error) {
      console.error('Error fetching compact treasury metrics:', error);
      setMetrics(prev => ({ ...prev, loading: false }));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (metrics.loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Resumen de Tesorería</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Bank Income */}
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-green-50 dark:bg-green-950/20">
            <div className="flex items-center gap-1">
              <Building2 className="h-4 w-4 text-blue-600" />
              <ArrowUp className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ingresos Bancarios</p>
              <p className="font-semibold text-green-600">{formatCurrency(metrics.bankIncome)}</p>
            </div>
          </div>

          {/* Bank Expense */}
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-red-50 dark:bg-red-950/20">
            <div className="flex items-center gap-1">
              <Building2 className="h-4 w-4 text-blue-600" />
              <ArrowDown className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Egresos Bancarios</p>
              <p className="font-semibold text-red-600">{formatCurrency(metrics.bankExpense)}</p>
            </div>
          </div>

          {/* Cash Income */}
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-green-50 dark:bg-green-950/20">
            <div className="flex items-center gap-1">
              <Wallet className="h-4 w-4 text-emerald-600" />
              <ArrowUp className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ingresos Efectivo</p>
              <p className="font-semibold text-green-600">{formatCurrency(metrics.cashIncome)}</p>
            </div>
          </div>

          {/* Cash Expense */}
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-red-50 dark:bg-red-950/20">
            <div className="flex items-center gap-1">
              <Wallet className="h-4 w-4 text-emerald-600" />
              <ArrowDown className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Egresos Efectivo</p>
              <p className="font-semibold text-red-600">{formatCurrency(metrics.cashExpense)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};