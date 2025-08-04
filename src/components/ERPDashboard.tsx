import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { DatePicker } from '@/components/DatePicker';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Calendar,
  FileText,
  CreditCard,
  Target,
  Activity,
  Briefcase,
  Users,
  PieChart
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, startOfQuarter, endOfQuarter, subQuarters } from 'date-fns';
import { es } from 'date-fns/locale';

interface ERPMetrics {
  totalCash: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netFlow: number;
  pendingInvoices: number;
  overdueInvoices: number;
  activeProjects: number;
  totalSuppliers: number;
  totalClients: number;
  pendingAdvances: number;
  cfdiPending: number;
  ppdPending: number;
}

interface CashFlowData {
  period: string;
  income: number;
  expenses: number;
  netFlow: number;
}

interface ExpenseBreakdown {
  category: string;
  amount: number;
  percentage: number;
  transactions: number;
}

interface IncomeBreakdown {
  category: string;
  amount: number;
  percentage: number;
  transactions: number;
}

interface TopSuppliers {
  name: string;
  amount: number;
  transactions: number;
}

interface TopClients {
  name: string;
  amount: number;
  invoices: number;
}

interface ERPDashboardProps {
  selectedClientId?: string;
  selectedProjectId?: string;
}

const ERPDashboard: React.FC<ERPDashboardProps> = ({
  selectedClientId,
  selectedProjectId
}) => {
  const [metrics, setMetrics] = useState<ERPMetrics | null>(null);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<ExpenseBreakdown[]>([]);
  const [incomeBreakdown, setIncomeBreakdown] = useState<IncomeBreakdown[]>([]);
  const [topSuppliers, setTopSuppliers] = useState<TopSuppliers[]>([]);
  const [topClients, setTopClients] = useState<TopClients[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    fetchERPData();
  }, [selectedPeriod, customStartDate, customEndDate, selectedClientId, selectedProjectId]);

  const fetchERPData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [
        metricsData,
        cashFlowResult,
        expensesResult,
        incomesResult,
        suppliersResult,
        clientsResult
      ] = await Promise.all([
        fetchDashboardMetrics(),
        fetchCashFlowData(),
        fetchExpenseBreakdown(),
        fetchIncomeBreakdown(),
        fetchTopSuppliers(),
        fetchTopClients()
      ]);

      setMetrics(metricsData);
      setCashFlowData(cashFlowResult);
      setExpenseBreakdown(expensesResult);
      setIncomeBreakdown(incomesResult);
      setTopSuppliers(suppliersResult);
      setTopClients(clientsResult);
    } catch (error) {
      console.error('Error fetching ERP data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPeriodDates = () => {
    const currentDate = new Date();
    
    switch (selectedPeriod) {
      case 'month':
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate)
        };
      case 'quarter':
        return {
          start: startOfQuarter(currentDate),
          end: endOfQuarter(currentDate)
        };
      case 'year':
        return {
          start: startOfYear(currentDate),
          end: endOfYear(currentDate)
        };
      case 'custom':
        if (customStartDate && customEndDate) {
          return {
            start: customStartDate,
            end: customEndDate
          };
        }
        // Fallback to current month if custom dates not set
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate)
        };
      default:
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate)
        };
    }
  };

  const fetchDashboardMetrics = async (): Promise<ERPMetrics> => {
    const { start: startDate, end: endDate } = getPeriodDates();

    // Construir consultas con filtros
    let incomeQuery = supabase.from('incomes').select('amount')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
    
    let expenseQuery = supabase.from('expenses').select('amount')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (selectedClientId) {
      incomeQuery = incomeQuery.eq('client_id', selectedClientId);
      expenseQuery = expenseQuery.eq('client_id', selectedClientId);
    }

    if (selectedProjectId) {
      incomeQuery = incomeQuery.eq('project_id', selectedProjectId);
      expenseQuery = expenseQuery.eq('project_id', selectedProjectId);
    }

    const [
      cashResult,
      incomeResult,
      expenseResult,
      projectsResult,
      suppliersResult,
      clientsResult,
      advancesResult,
      cfdiResult
    ] = await Promise.all([
      supabase.from('cash_accounts').select('current_balance').eq('status', 'active'),
      incomeQuery,
      expenseQuery,
      supabase.from('client_projects').select('id').neq('status', 'completed'),
      supabase.from('suppliers').select('id').eq('status', 'active'),
      supabase.from('clients').select('id'),
      supabase.from('employee_advances').select('advance_amount, amount_justified').neq('status', 'completed'),
      supabase.from('cfdi_documents').select('id, tipo_comprobante').eq('status', 'active').eq('validation_status', 'pending')
    ]);

    const totalCash = (cashResult.data || []).reduce((sum, account) => sum + (account.current_balance || 0), 0);
    const monthlyIncome = (incomeResult.data || []).reduce((sum, income) => sum + (income.amount || 0), 0);
    const monthlyExpenses = (expenseResult.data || []).reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const pendingAdvances = (advancesResult.data || []).reduce((sum, advance) => sum + ((advance.advance_amount || 0) - (advance.amount_justified || 0)), 0);
    const cfdiPending = (cfdiResult.data || []).length;
    const ppdPending = (cfdiResult.data || []).filter(doc => doc.tipo_comprobante === 'I').length;

    return {
      totalCash,
      monthlyIncome,
      monthlyExpenses,
      netFlow: monthlyIncome - monthlyExpenses,
      pendingInvoices: 0, // To be calculated from accounts_receivable
      overdueInvoices: 0, // To be calculated from accounts_receivable
      activeProjects: (projectsResult.data || []).length,
      totalSuppliers: (suppliersResult.data || []).length,
      totalClients: (clientsResult.data || []).length,
      pendingAdvances,
      cfdiPending,
      ppdPending
    };
  };

  const fetchCashFlowData = async (): Promise<CashFlowData[]> => {
    const periods = [];
    const currentDate = new Date();
    
    if (selectedPeriod === 'custom' && customStartDate && customEndDate) {
      // For custom periods, show the selected range
      const { start: startDate, end: endDate } = getPeriodDates();
      
      let incomeQuery = supabase.from('incomes').select('amount')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      let expenseQuery = supabase.from('expenses').select('amount')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Apply client and project filters
      if (selectedClientId) {
        incomeQuery = incomeQuery.eq('client_id', selectedClientId);
        expenseQuery = expenseQuery.eq('client_id', selectedClientId);
      }

      if (selectedProjectId) {
        incomeQuery = incomeQuery.eq('project_id', selectedProjectId);
        expenseQuery = expenseQuery.eq('project_id', selectedProjectId);
      }

      const [incomeResult, expenseResult] = await Promise.all([
        incomeQuery,
        expenseQuery
      ]);

      const income = (incomeResult.data || []).reduce((sum, item) => sum + (item.amount || 0), 0);
      const expenses = (expenseResult.data || []).reduce((sum, item) => sum + (item.amount || 0), 0);

      periods.push({
        period: `${format(startDate, 'dd MMM', { locale: es })} - ${format(endDate, 'dd MMM yyyy', { locale: es })}`,
        income,
        expenses,
        netFlow: income - expenses
      });
    } else {
      // For predefined periods, show historical data
      for (let i = 5; i >= 0; i--) {
        let periodDate, startDate, endDate, periodLabel;
        
        switch (selectedPeriod) {
          case 'quarter':
            periodDate = subQuarters(currentDate, i);
            startDate = startOfQuarter(periodDate);
            endDate = endOfQuarter(periodDate);
            periodLabel = `Q${Math.floor(periodDate.getMonth() / 3) + 1} ${format(periodDate, 'yyyy')}`;
            break;
          case 'year':
            periodDate = new Date(currentDate.getFullYear() - i, 0, 1);
            startDate = startOfYear(periodDate);
            endDate = endOfYear(periodDate);
            periodLabel = format(periodDate, 'yyyy');
            break;
          default: // month
            periodDate = subMonths(currentDate, i);
            startDate = startOfMonth(periodDate);
            endDate = endOfMonth(periodDate);
            periodLabel = format(periodDate, 'MMM yyyy', { locale: es });
        }
      
        const [incomeResult, expenseResult] = await Promise.all([
          supabase.from('incomes').select('amount')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString()),
          supabase.from('expenses').select('amount')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
        ]);

        const income = (incomeResult.data || []).reduce((sum, item) => sum + (item.amount || 0), 0);
        const expenses = (expenseResult.data || []).reduce((sum, item) => sum + (item.amount || 0), 0);

        periods.push({
          period: periodLabel,
          income,
          expenses,
          netFlow: income - expenses
        });
      }
    }

    return periods;
  };

  const fetchExpenseBreakdown = async (): Promise<ExpenseBreakdown[]> => {
    const { start: startDate, end: endDate } = getPeriodDates();

    const { data: expenses } = await supabase
      .from('expenses')
      .select('category, amount')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const categoryMap = new Map<string, { amount: number; count: number }>();
    let totalAmount = 0;

    (expenses || []).forEach(expense => {
      const category = expense.category || 'Sin categoría';
      const amount = expense.amount || 0;
      
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { amount: 0, count: 0 });
      }
      
      const existing = categoryMap.get(category)!;
      existing.amount += amount;
      existing.count += 1;
      totalAmount += amount;
    });

    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      amount: data.amount,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      transactions: data.count
    })).sort((a, b) => b.amount - a.amount);
  };

  const fetchIncomeBreakdown = async (): Promise<IncomeBreakdown[]> => {
    const { start: startDate, end: endDate } = getPeriodDates();

    const { data: incomes } = await supabase
      .from('incomes')
      .select('category, amount')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const categoryMap = new Map<string, { amount: number; count: number }>();
    let totalAmount = 0;

    (incomes || []).forEach(income => {
      const category = income.category || 'Sin categoría';
      const amount = income.amount || 0;
      
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { amount: 0, count: 0 });
      }
      
      const existing = categoryMap.get(category)!;
      existing.amount += amount;
      existing.count += 1;
      totalAmount += amount;
    });

    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      amount: data.amount,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      transactions: data.count
    })).sort((a, b) => b.amount - a.amount);
  };

  const fetchTopSuppliers = async (): Promise<TopSuppliers[]> => {
    const { start: startDate, end: endDate } = getPeriodDates();

    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, suppliers(company_name)')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .not('supplier_id', 'is', null);

    const supplierMap = new Map<string, { amount: number; count: number }>();

    (expenses || []).forEach(expense => {
      const supplierName = expense.suppliers?.company_name || 'Proveedor desconocido';
      const amount = expense.amount || 0;
      
      if (!supplierMap.has(supplierName)) {
        supplierMap.set(supplierName, { amount: 0, count: 0 });
      }
      
      const existing = supplierMap.get(supplierName)!;
      existing.amount += amount;
      existing.count += 1;
    });

    return Array.from(supplierMap.entries())
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        transactions: data.count
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  };

  const fetchTopClients = async (): Promise<TopClients[]> => {
    const { start: startDate, end: endDate } = getPeriodDates();

    const { data: incomes } = await supabase
      .from('incomes')
      .select('amount, clients(full_name)')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .not('client_id', 'is', null);

    const clientMap = new Map<string, { amount: number; count: number }>();

    (incomes || []).forEach(income => {
      const clientName = income.clients?.full_name || 'Cliente desconocido';
      const amount = income.amount || 0;
      
      if (!clientMap.has(clientName)) {
        clientMap.set(clientName, { amount: 0, count: 0 });
      }
      
      const existing = clientMap.get(clientName)!;
      existing.amount += amount;
      existing.count += 1;
    });

    return Array.from(clientMap.entries())
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        invoices: data.count
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard ERP</h1>
          <p className="text-muted-foreground">
            Panel de control ejecutivo - {format(new Date(), 'dd MMMM yyyy', { locale: es })}
            {selectedPeriod === 'custom' && customStartDate && customEndDate && (
              <span className="block text-sm">
                Período personalizado: {format(customStartDate, 'dd/MM/yyyy')} - {format(customEndDate, 'dd/MM/yyyy')}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Button
              variant={selectedPeriod === 'month' ? 'default' : 'outline'}
              onClick={() => setSelectedPeriod('month')}
            >
              Mes
            </Button>
            <Button
              variant={selectedPeriod === 'quarter' ? 'default' : 'outline'}
              onClick={() => setSelectedPeriod('quarter')}
            >
              Trimestre
            </Button>
            <Button
              variant={selectedPeriod === 'year' ? 'default' : 'outline'}
              onClick={() => setSelectedPeriod('year')}
            >
              Año
            </Button>
            <Button
              variant={selectedPeriod === 'custom' ? 'default' : 'outline'}
              onClick={() => setSelectedPeriod('custom')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Personalizado
            </Button>
          </div>
          
          {selectedPeriod === 'custom' && (
            <div className="flex gap-2 items-center">
              <DatePicker
                date={customStartDate}
                onDateChange={setCustomStartDate}
                placeholder="Fecha inicio"
                className="w-40"
              />
              <span className="text-muted-foreground">hasta</span>
              <DatePicker
                date={customEndDate}
                onDateChange={setCustomEndDate}
                placeholder="Fecha fin"
                className="w-40"
              />
              {customStartDate && customEndDate && customStartDate > customEndDate && (
                <span className="text-sm text-red-500">La fecha de inicio debe ser anterior a la fecha de fin</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Efectivo Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics?.totalCash || 0)}</div>
            <p className="text-xs text-muted-foreground">
              En todas las cuentas activas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flujo Neto</CardTitle>
            {(metrics?.netFlow || 0) >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(metrics?.netFlow || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(metrics?.netFlow || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(metrics?.monthlyIncome || 0)} ingresos - {formatCurrency(metrics?.monthlyExpenses || 0)} gastos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CFDIs Pendientes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.cfdiPending || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.ppdPending || 0} facturas PPD
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anticipos Pendientes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics?.pendingAdvances || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Por justificar empleados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="cashflow">Flujo de Efectivo</TabsTrigger>
          <TabsTrigger value="expenses">Análisis de Gastos</TabsTrigger>
          <TabsTrigger value="income">Análisis de Ingresos</TabsTrigger>
          <TabsTrigger value="partners">Socios Comerciales</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Proyectos Activos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics?.activeProjects || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Total Proveedores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics?.totalSuppliers || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Total Clientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics?.totalClients || 0}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evolución del Flujo de Efectivo</CardTitle>
              <CardDescription>
                Comparativo de ingresos vs gastos por período
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cashFlowData.map((period, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="font-medium">{period.period}</div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-green-600">↗ {formatCurrency(period.income)}</span>
                      <span className="text-red-600">↘ {formatCurrency(period.expenses)}</span>
                      <span className={`font-medium ${period.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        = {formatCurrency(period.netFlow)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Desglose de Gastos por Categoría</CardTitle>
              <CardDescription>
                Análisis detallado del mes actual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {expenseBreakdown.map((category, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{category.category}</div>
                      <div className="text-sm text-muted-foreground">
                        {category.transactions} transacciones
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(category.amount)}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatPercentage(category.percentage)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Desglose de Ingresos por Categoría</CardTitle>
              <CardDescription>
                Análisis detallado del mes actual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {incomeBreakdown.map((category, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{category.category}</div>
                      <div className="text-sm text-muted-foreground">
                        {category.transactions} transacciones
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(category.amount)}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatPercentage(category.percentage)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="partners" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Proveedores</CardTitle>
                <CardDescription>Mayor volumen de gastos este mes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topSuppliers.map((supplier, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{supplier.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {supplier.transactions} transacciones
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(supplier.amount)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Clientes</CardTitle>
                <CardDescription>Mayor volumen de ingresos este mes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topClients.map((client, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{client.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {client.invoices} facturas
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(client.amount)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ERPDashboard;