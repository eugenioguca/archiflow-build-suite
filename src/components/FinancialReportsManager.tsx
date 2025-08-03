import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ClientProjectSelector } from './ClientProjectSelector';
import { 
  FileBarChart, 
  Download, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Building2,
  Users,
  Target
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from 'date-fns';
import { es } from 'date-fns/locale';

interface BalanceSheetData {
  assets: {
    current_assets: {
      cash: number;
      accounts_receivable: number;
      total: number;
    };
    total_assets: number;
  };
  liabilities: {
    current_liabilities: {
      accounts_payable: number;
      total: number;
    };
    total_liabilities: number;
  };
  equity: {
    retained_earnings: number;
    total_equity: number;
  };
}

interface IncomeStatementData {
  revenue: {
    sales: number;
    other_income: number;
    total_revenue: number;
  };
  expenses: {
    cost_of_goods: number;
    operating_expenses: number;
    administrative_expenses: number;
    total_expenses: number;
  };
  net_income: number;
  gross_profit: number;
  operating_profit: number;
}

interface CashFlowStatementData {
  operating_activities: {
    net_income: number;
    depreciation: number;
    accounts_receivable_change: number;
    accounts_payable_change: number;
    net_cash_from_operations: number;
  };
  investing_activities: {
    equipment_purchases: number;
    net_cash_from_investing: number;
  };
  financing_activities: {
    loan_proceeds: number;
    loan_payments: number;
    net_cash_from_financing: number;
  };
  net_cash_change: number;
  beginning_cash: number;
  ending_cash: number;
}

interface ReportPeriod {
  startDate: Date;
  endDate: Date;
  label: string;
}

interface FinancialReportsManagerProps {
  selectedClientId?: string;
  selectedProjectId?: string;
}

const FinancialReportsManager: React.FC<FinancialReportsManagerProps> = ({ selectedClientId, selectedProjectId }) => {
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetData | null>(null);
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatementData | null>(null);
  const [cashFlowStatement, setCashFlowStatement] = useState<CashFlowStatementData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current_month');
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod | null>(null);
  const [internalClientId, setInternalClientId] = useState<string>(selectedClientId || '');
  const [internalProjectId, setInternalProjectId] = useState<string>(selectedProjectId || '');

  useEffect(() => {
    generateReports();
  }, [selectedPeriod, internalClientId, internalProjectId]);

  const getPeriodDates = (period: string): ReportPeriod => {
    const now = new Date();
    
    switch (period) {
      case 'current_month':
        return {
          startDate: startOfMonth(now),
          endDate: endOfMonth(now),
          label: format(now, 'MMMM yyyy', { locale: es })
        };
      case 'previous_month':
        const prevMonth = subMonths(now, 1);
        return {
          startDate: startOfMonth(prevMonth),
          endDate: endOfMonth(prevMonth),
          label: format(prevMonth, 'MMMM yyyy', { locale: es })
        };
      case 'current_year':
        return {
          startDate: startOfYear(now),
          endDate: endOfYear(now),
          label: format(now, 'yyyy', { locale: es })
        };
      case 'previous_year':
        const prevYear = subYears(now, 1);
        return {
          startDate: startOfYear(prevYear),
          endDate: endOfYear(prevYear),
          label: format(prevYear, 'yyyy', { locale: es })
        };
      default:
        return {
          startDate: startOfMonth(now),
          endDate: endOfMonth(now),
          label: format(now, 'MMMM yyyy', { locale: es })
        };
    }
  };

  const generateReports = async () => {
    try {
      setLoading(true);
      const period = getPeriodDates(selectedPeriod);
      setReportPeriod(period);

      // Generate all reports in parallel
      await Promise.all([
        generateBalanceSheet(period),
        generateIncomeStatement(period),
        generateCashFlowStatement(period)
      ]);

    } catch (error) {
      console.error('Error generating reports:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron generar los reportes financieros',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const generateBalanceSheet = async (period: ReportPeriod) => {
    // Build queries with client/project filters
    let incomesQuery = supabase.from('incomes').select('amount')
      .gte('created_at', period.startDate.toISOString())
      .lte('created_at', period.endDate.toISOString());
    
    let expensesQuery = supabase.from('expenses').select('amount')
      .gte('created_at', period.startDate.toISOString())
      .lte('created_at', period.endDate.toISOString());

    // Apply filters
    if (internalProjectId) {
      incomesQuery = incomesQuery.eq('project_id', internalProjectId);
      expensesQuery = expensesQuery.eq('project_id', internalProjectId);
    } else if (internalClientId) {
      incomesQuery = incomesQuery.eq('client_id', internalClientId);
      expensesQuery = expensesQuery.eq('client_id', internalClientId);
    }

    const [
      cashResult,
      receivablesResult,
      payablesResult,
      incomesResult,
      expensesResult
    ] = await Promise.all([
      supabase.from('cash_accounts').select('current_balance').eq('status', 'active'),
      supabase.from('accounts_receivable').select('amount_due, amount_paid'),
      supabase.from('accounts_payable').select('amount_due, amount_paid'),
      incomesQuery,
      expensesQuery
    ]);

    const cash = (cashResult.data || []).reduce((sum, account) => sum + (account.current_balance || 0), 0);
    const accounts_receivable = (receivablesResult.data || []).reduce((sum, item) => sum + ((item.amount_due || 0) - (item.amount_paid || 0)), 0);
    const accounts_payable = (payablesResult.data || []).reduce((sum, item) => sum + ((item.amount_due || 0) - (item.amount_paid || 0)), 0);
    
    const total_income = (incomesResult.data || []).reduce((sum, income) => sum + (income.amount || 0), 0);
    const total_expenses = (expensesResult.data || []).reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const retained_earnings = total_income - total_expenses;

    const current_assets = cash + accounts_receivable;
    const total_assets = current_assets;
    const total_liabilities = accounts_payable;
    const total_equity = retained_earnings;

    setBalanceSheet({
      assets: {
        current_assets: {
          cash,
          accounts_receivable,
          total: current_assets
        },
        total_assets
      },
      liabilities: {
        current_liabilities: {
          accounts_payable,
          total: accounts_payable
        },
        total_liabilities
      },
      equity: {
        retained_earnings,
        total_equity
      }
    });
  };

  const generateIncomeStatement = async (period: ReportPeriod) => {
    // Build queries with filters
    let incomesQuery = supabase.from('incomes').select('amount, category')
      .gte('created_at', period.startDate.toISOString())
      .lte('created_at', period.endDate.toISOString());
    
    let expensesQuery = supabase.from('expenses').select('amount, category')
      .gte('created_at', period.startDate.toISOString())
      .lte('created_at', period.endDate.toISOString());

    // Apply filters
    if (internalProjectId) {
      incomesQuery = incomesQuery.eq('project_id', internalProjectId);
      expensesQuery = expensesQuery.eq('project_id', internalProjectId);
    } else if (internalClientId) {
      incomesQuery = incomesQuery.eq('client_id', internalClientId);
      expensesQuery = expensesQuery.eq('client_id', internalClientId);
    }

    const [incomesResult, expensesResult] = await Promise.all([incomesQuery, expensesQuery]);

    const sales = (incomesResult.data || [])
      .filter(income => ['construction', 'services', 'sales'].includes(income.category))
      .reduce((sum, income) => sum + (income.amount || 0), 0);
    
    const other_income = (incomesResult.data || [])
      .filter(income => !['construction', 'services', 'sales'].includes(income.category))
      .reduce((sum, income) => sum + (income.amount || 0), 0);

    const total_revenue = sales + other_income;

    const cost_of_goods = (expensesResult.data || [])
      .filter(expense => ['materials', 'labor', 'subcontractors'].includes(expense.category))
      .reduce((sum, expense) => sum + (expense.amount || 0), 0);

    const operating_expenses = (expensesResult.data || [])
      .filter(expense => ['operations', 'maintenance', 'utilities'].includes(expense.category))
      .reduce((sum, expense) => sum + (expense.amount || 0), 0);

    const administrative_expenses = (expensesResult.data || [])
      .filter(expense => ['administration', 'marketing', 'legal'].includes(expense.category))
      .reduce((sum, expense) => sum + (expense.amount || 0), 0);

    const total_expenses = cost_of_goods + operating_expenses + administrative_expenses;
    const gross_profit = total_revenue - cost_of_goods;
    const operating_profit = gross_profit - operating_expenses - administrative_expenses;
    const net_income = total_revenue - total_expenses;

    setIncomeStatement({
      revenue: {
        sales,
        other_income,
        total_revenue
      },
      expenses: {
        cost_of_goods,
        operating_expenses,
        administrative_expenses,
        total_expenses
      },
      gross_profit,
      operating_profit,
      net_income
    });
  };

  const generateCashFlowStatement = async (period: ReportPeriod) => {
    const [
      currentCashResult,
      previousCashResult,
      transactionsResult
    ] = await Promise.all([
      supabase.from('cash_accounts').select('current_balance').eq('status', 'active'),
      supabase.from('cash_transactions').select('amount, transaction_type, category')
        .lt('created_at', period.startDate.toISOString()),
      supabase.from('cash_transactions').select('amount, transaction_type, category')
        .gte('created_at', period.startDate.toISOString())
        .lte('created_at', period.endDate.toISOString())
    ]);

    const ending_cash = (currentCashResult.data || []).reduce((sum, account) => sum + (account.current_balance || 0), 0);
    
    const operating_cash_flow = (transactionsResult.data || [])
      .filter(t => ['income', 'expense'].includes(t.transaction_type) && !['equipment', 'investment'].includes(t.category))
      .reduce((sum, t) => sum + (t.transaction_type === 'income' ? (t.amount || 0) : -(t.amount || 0)), 0);

    const investing_cash_flow = (transactionsResult.data || [])
      .filter(t => ['equipment', 'investment'].includes(t.category))
      .reduce((sum, t) => sum + (t.transaction_type === 'income' ? (t.amount || 0) : -(t.amount || 0)), 0);

    const financing_cash_flow = (transactionsResult.data || [])
      .filter(t => ['loan', 'capital'].includes(t.category))
      .reduce((sum, t) => sum + (t.transaction_type === 'income' ? (t.amount || 0) : -(t.amount || 0)), 0);

    const net_cash_change = operating_cash_flow + investing_cash_flow + financing_cash_flow;
    const beginning_cash = ending_cash - net_cash_change;

    setCashFlowStatement({
      operating_activities: {
        net_income: operating_cash_flow,
        depreciation: 0,
        accounts_receivable_change: 0,
        accounts_payable_change: 0,
        net_cash_from_operations: operating_cash_flow
      },
      investing_activities: {
        equipment_purchases: -Math.abs(investing_cash_flow),
        net_cash_from_investing: investing_cash_flow
      },
      financing_activities: {
        loan_proceeds: Math.max(financing_cash_flow, 0),
        loan_payments: Math.min(financing_cash_flow, 0),
        net_cash_from_financing: financing_cash_flow
      },
      net_cash_change,
      beginning_cash,
      ending_cash
    });
  };

  const exportToCSV = (reportType: string, data: any) => {
    let csvContent = '';
    const filename = `${reportType}_${format(new Date(), 'yyyy-MM-dd')}.csv`;

    if (reportType === 'balance_sheet' && balanceSheet) {
      csvContent = `Balance General - ${reportPeriod?.label}\n\n`;
      csvContent += `ACTIVOS\n`;
      csvContent += `Activos Circulantes\n`;
      csvContent += `Efectivo,${balanceSheet.assets.current_assets.cash}\n`;
      csvContent += `Cuentas por Cobrar,${balanceSheet.assets.current_assets.accounts_receivable}\n`;
      csvContent += `Total Activos Circulantes,${balanceSheet.assets.current_assets.total}\n\n`;
      csvContent += `TOTAL ACTIVOS,${balanceSheet.assets.total_assets}\n\n`;
      csvContent += `PASIVOS\n`;
      csvContent += `Pasivos Circulantes\n`;
      csvContent += `Cuentas por Pagar,${balanceSheet.liabilities.current_liabilities.accounts_payable}\n`;
      csvContent += `Total Pasivos,${balanceSheet.liabilities.total_liabilities}\n\n`;
      csvContent += `CAPITAL\n`;
      csvContent += `Utilidades Retenidas,${balanceSheet.equity.retained_earnings}\n`;
      csvContent += `Total Capital,${balanceSheet.equity.total_equity}\n`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros Cliente-Proyecto */}
      <ClientProjectSelector
        selectedClientId={internalClientId}
        selectedProjectId={internalProjectId}
        onClientChange={(clientId) => setInternalClientId(clientId || '')}
        onProjectChange={(projectId) => setInternalProjectId(projectId || '')}
        showAllOption={true}
        showProjectFilter={true}
      />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes Financieros</h1>
          <p className="text-muted-foreground">
            Estados financieros automáticos - {reportPeriod?.label}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_month">Mes Actual</SelectItem>
              <SelectItem value="previous_month">Mes Anterior</SelectItem>
              <SelectItem value="current_year">Año Actual</SelectItem>
              <SelectItem value="previous_year">Año Anterior</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={generateReports} disabled={loading}>
            <FileBarChart className="h-4 w-4 mr-2" />
            Regenerar
          </Button>
        </div>
      </div>

      {/* Balance Sheet */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Balance General
              </CardTitle>
              <CardDescription>
                Situación financiera al {reportPeriod && format(reportPeriod.endDate, 'dd MMMM yyyy', { locale: es })}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV('balance_sheet', balanceSheet)}
              disabled={!balanceSheet}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {balanceSheet && (
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="font-semibold text-lg mb-4">ACTIVOS</h3>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Activos Circulantes</h4>
                    <div className="space-y-1 ml-4">
                      <div className="flex justify-between">
                        <span>Efectivo y equivalentes</span>
                        <span>{formatCurrency(balanceSheet.assets.current_assets.cash)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cuentas por cobrar</span>
                        <span>{formatCurrency(balanceSheet.assets.current_assets.accounts_receivable)}</span>
                      </div>
                      <div className="flex justify-between font-medium border-t pt-1">
                        <span>Total Activos Circulantes</span>
                        <span>{formatCurrency(balanceSheet.assets.current_assets.total)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t-2 pt-2">
                    <span>TOTAL ACTIVOS</span>
                    <span>{formatCurrency(balanceSheet.assets.total_assets)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-4">PASIVOS Y CAPITAL</h3>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Pasivos Circulantes</h4>
                    <div className="space-y-1 ml-4">
                      <div className="flex justify-between">
                        <span>Cuentas por pagar</span>
                        <span>{formatCurrency(balanceSheet.liabilities.current_liabilities.accounts_payable)}</span>
                      </div>
                      <div className="flex justify-between font-medium border-t pt-1">
                        <span>Total Pasivos</span>
                        <span>{formatCurrency(balanceSheet.liabilities.total_liabilities)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Capital</h4>
                    <div className="space-y-1 ml-4">
                      <div className="flex justify-between">
                        <span>Utilidades retenidas</span>
                        <span className={balanceSheet.equity.retained_earnings >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(balanceSheet.equity.retained_earnings)}
                        </span>
                      </div>
                      <div className="flex justify-between font-medium border-t pt-1">
                        <span>Total Capital</span>
                        <span className={balanceSheet.equity.total_equity >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(balanceSheet.equity.total_equity)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t-2 pt-2">
                    <span>TOTAL PASIVO + CAPITAL</span>
                    <span>{formatCurrency(balanceSheet.liabilities.total_liabilities + balanceSheet.equity.total_equity)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Income Statement */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Estado de Resultados
              </CardTitle>
              <CardDescription>
                Período: {reportPeriod?.label}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV('income_statement', incomeStatement)}
              disabled={!incomeStatement}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {incomeStatement && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-3">INGRESOS</h3>
                <div className="space-y-2 ml-4">
                  <div className="flex justify-between">
                    <span>Ventas</span>
                    <span className="text-green-600">{formatCurrency(incomeStatement.revenue.sales)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Otros ingresos</span>
                    <span className="text-green-600">{formatCurrency(incomeStatement.revenue.other_income)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2">
                    <span>Total Ingresos</span>
                    <span className="text-green-600">{formatCurrency(incomeStatement.revenue.total_revenue)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3">COSTOS Y GASTOS</h3>
                <div className="space-y-2 ml-4">
                  <div className="flex justify-between">
                    <span>Costo de ventas</span>
                    <span className="text-red-600">({formatCurrency(incomeStatement.expenses.cost_of_goods)})</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-1">
                    <span>Utilidad Bruta</span>
                    <span className={incomeStatement.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(incomeStatement.gross_profit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gastos de operación</span>
                    <span className="text-red-600">({formatCurrency(incomeStatement.expenses.operating_expenses)})</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gastos administrativos</span>
                    <span className="text-red-600">({formatCurrency(incomeStatement.expenses.administrative_expenses)})</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-1">
                    <span>Utilidad Operativa</span>
                    <span className={incomeStatement.operating_profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(incomeStatement.operating_profit)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between font-bold text-xl border-t-2 pt-4">
                <span>UTILIDAD NETA</span>
                <span className={incomeStatement.net_income >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatCurrency(incomeStatement.net_income)}
                </span>
              </div>

              {/* Financial Ratios */}
              <div className="grid gap-4 md:grid-cols-3 mt-6 pt-6 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {incomeStatement.revenue.total_revenue > 0 
                      ? ((incomeStatement.gross_profit / incomeStatement.revenue.total_revenue) * 100).toFixed(1)
                      : 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">Margen Bruto</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {incomeStatement.revenue.total_revenue > 0 
                      ? ((incomeStatement.operating_profit / incomeStatement.revenue.total_revenue) * 100).toFixed(1)
                      : 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">Margen Operativo</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {incomeStatement.revenue.total_revenue > 0 
                      ? ((incomeStatement.net_income / incomeStatement.revenue.total_revenue) * 100).toFixed(1)
                      : 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">Margen Neto</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cash Flow Statement */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Estado de Flujo de Efectivo
              </CardTitle>
              <CardDescription>
                Período: {reportPeriod?.label}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV('cash_flow', cashFlowStatement)}
              disabled={!cashFlowStatement}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {cashFlowStatement && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-3">ACTIVIDADES DE OPERACIÓN</h3>
                <div className="space-y-2 ml-4">
                  <div className="flex justify-between">
                    <span>Utilidad neta</span>
                    <span className={cashFlowStatement.operating_activities.net_income >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(cashFlowStatement.operating_activities.net_income)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2">
                    <span>Efectivo neto de actividades de operación</span>
                    <span className={cashFlowStatement.operating_activities.net_cash_from_operations >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(cashFlowStatement.operating_activities.net_cash_from_operations)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3">ACTIVIDADES DE INVERSIÓN</h3>
                <div className="space-y-2 ml-4">
                  <div className="flex justify-between">
                    <span>Compra de equipo</span>
                    <span className="text-red-600">{formatCurrency(cashFlowStatement.investing_activities.equipment_purchases)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2">
                    <span>Efectivo neto de actividades de inversión</span>
                    <span className={cashFlowStatement.investing_activities.net_cash_from_investing >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(cashFlowStatement.investing_activities.net_cash_from_investing)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3">ACTIVIDADES DE FINANCIAMIENTO</h3>
                <div className="space-y-2 ml-4">
                  <div className="flex justify-between">
                    <span>Préstamos recibidos</span>
                    <span className="text-green-600">{formatCurrency(cashFlowStatement.financing_activities.loan_proceeds)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pago de préstamos</span>
                    <span className="text-red-600">{formatCurrency(cashFlowStatement.financing_activities.loan_payments)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2">
                    <span>Efectivo neto de actividades de financiamiento</span>
                    <span className={cashFlowStatement.financing_activities.net_cash_from_financing >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(cashFlowStatement.financing_activities.net_cash_from_financing)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 border-t-2 pt-4">
                <div className="flex justify-between font-bold">
                  <span>Cambio neto en efectivo</span>
                  <span className={cashFlowStatement.net_cash_change >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(cashFlowStatement.net_cash_change)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Efectivo al inicio del período</span>
                  <span>{formatCurrency(cashFlowStatement.beginning_cash)}</span>
                </div>
                <div className="flex justify-between font-bold text-xl">
                  <span>Efectivo al final del período</span>
                  <span className="text-blue-600">{formatCurrency(cashFlowStatement.ending_cash)}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialReportsManager;