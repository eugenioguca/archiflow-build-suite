import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, DollarSign, AlertTriangle, Users, Building, CreditCard } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';

interface CashAccount {
  id: string;
  name: string;
  account_type: string;
  current_balance: number;
  max_limit?: number;
  status: string;
  responsible_user_id: string;
  project?: {
    name: string;
  } | null;
}

interface CashTransaction {
  id: string;
  transaction_type: string;
  category: string;
  amount: number;
  description: string;
  created_at: string;
  approval_status: string;
  cash_account?: {
    name: string;
  };
}

interface EmployeeAdvance {
  id: string;
  employee_name: string;
  advance_amount: number;
  amount_justified: number;
  amount_pending: number;
  status: string;
  due_date: string;
}

export function TreasuryDashboard() {
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<CashTransaction[]>([]);
  const [pendingAdvances, setPendingAdvances] = useState<EmployeeAdvance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTreasuryData();
  }, []);

  const fetchTreasuryData = async () => {
    try {
      const [accountsResult, transactionsResult, advancesResult] = await Promise.all([
        supabase
          .from('cash_accounts')
          .select(`
            *,
            project:projects(name)
          `)
          .eq('status', 'active')
          .order('current_balance', { ascending: false }),
          
        supabase
          .from('cash_transactions')
          .select(`
            *,
            cash_account:cash_accounts(name)
          `)
          .order('created_at', { ascending: false })
          .limit(10),
          
        supabase
          .from('employee_advances')
          .select('*')
          .in('status', ['pending', 'overdue'])
          .order('due_date', { ascending: true })
      ]);

      if (accountsResult.error) throw accountsResult.error;
      if (transactionsResult.error) throw transactionsResult.error;
      if (advancesResult.error) throw advancesResult.error;

      const processedAccounts: CashAccount[] = (accountsResult.data || []).map(account => ({
        ...account,
        project: account.project && typeof account.project === 'object' && 'name' in account.project 
          ? { name: String(account.project!.name) } 
          : null
      }));
      
      setCashAccounts(processedAccounts);
      // Process transactions to handle potential SelectQueryError
      const processedTransactions = (transactionsResult.data || []).map(transaction => ({
        ...transaction,
        cash_account: { name: 'Cuenta de efectivo' }
      }));
      setRecentTransactions(processedTransactions);
      setPendingAdvances(advancesResult.data || []);
    } catch (error) {
      console.error('Error fetching treasury data:', error);
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
    return new Date(dateString).toLocaleDateString('es-MX');
  };

  const getTotalCash = () => {
    return cashAccounts.reduce((sum, account) => sum + account.current_balance, 0);
  };

  const getTotalInflow = () => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    
    return recentTransactions
      .filter(t => t.transaction_type === 'income' && t.created_at >= startOfMonth)
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getTotalOutflow = () => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    
    return recentTransactions
      .filter(t => t.transaction_type === 'expense' && t.created_at >= startOfMonth)
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getAccountTypeLabel = (type: string) => {
    const labels = {
      general: 'General',
      petty_cash: 'Caja Chica',
      project_fund: 'Fondo de Proyecto'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'income':
      case 'transfer_in':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'expense':
      case 'transfer_out':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string): "default" | "destructive" | "secondary" | "outline" => {
    const variants: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive',
      overdue: 'destructive'
    };
    return variants[status] || 'outline';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs Principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Efectivo Total</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(getTotalCash())}</div>
            <p className="text-xs text-muted-foreground">
              {cashAccounts.length} cuentas activas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entradas del Mes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(getTotalInflow())}</div>
            <p className="text-xs text-muted-foreground">
              Ingresos de efectivo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Salidas del Mes</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(getTotalOutflow())}</div>
            <p className="text-xs text-muted-foreground">
              Gastos de efectivo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anticipos Pendientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingAdvances.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(pendingAdvances.reduce((sum, a) => sum + a.amount_pending, 0))} por justificar
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Cuentas de Efectivo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Cuentas de Efectivo
            </CardTitle>
            <CardDescription>
              Estado actual de las cuentas de efectivo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {cashAccounts.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No hay cuentas de efectivo registradas
              </p>
            ) : (
              cashAccounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="font-medium">{account.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {getAccountTypeLabel(account.account_type)}
                      {account.project && ` - ${account.project.name}`}
                    </div>
                    {account.max_limit && (
                      <Progress 
                        value={(account.current_balance / account.max_limit) * 100} 
                        className="w-24 h-2"
                      />
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatCurrency(account.current_balance)}</div>
                    {account.max_limit && (
                      <div className="text-xs text-muted-foreground">
                        Límite: {formatCurrency(account.max_limit)}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Transacciones Recientes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Transacciones Recientes
            </CardTitle>
            <CardDescription>
              Últimos movimientos de efectivo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentTransactions.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No hay transacciones registradas
              </p>
            ) : (
              recentTransactions.slice(0, 8).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getTransactionIcon(transaction.transaction_type)}
                    <div>
                      <div className="font-medium text-sm">{transaction.description}</div>
                      <div className="text-xs text-muted-foreground">
                        {transaction.cash_account?.name} • {formatDate(transaction.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${
                      transaction.transaction_type === 'income' || transaction.transaction_type === 'transfer_in'
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {transaction.transaction_type === 'income' || transaction.transaction_type === 'transfer_in' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </div>
                    <Badge variant={getStatusBadge(transaction.approval_status)} className="text-xs">
                      {transaction.approval_status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alertas de Anticipos */}
      {pendingAdvances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Anticipos Pendientes de Justificación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingAdvances.slice(0, 5).map((advance) => (
                <div key={advance.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{advance.employee_name}</div>
                    <div className="text-sm text-muted-foreground">
                      Vence: {formatDate(advance.due_date)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(advance.amount_pending)}</div>
                    <Badge variant={getStatusBadge(advance.status)} className="text-xs">
                      {advance.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}