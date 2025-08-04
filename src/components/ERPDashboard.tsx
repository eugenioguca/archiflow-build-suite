import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Wallet,
  Package,
  FileText,
  Calculator,
  Building2,
  Users,
  Activity,
  ChevronRight
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

interface FinancialKPIs {
  totalCash: number;
  bankBalance: number;
  cashBalance: number;
  netMonthlyFlow: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  activeProjects: number;
  pipelineValue: number;
}

interface OperationalMetrics {
  treasuryAccounts: number;
  lastTransaction: string;
  materialRequests: number;
  materialRequestsAmount: number;
  pendingCFDIs: number;
  ppdComplements: number;
}

interface CashFlowData {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

interface ExpenseCategory {
  name: string;
  value: number;
  percentage: number;
}

interface ProjectPerformance {
  projectName: string;
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;
}

interface ERPDashboardProps {
  selectedClientId?: string;
  selectedProjectId?: string;
}

const ERPDashboard: React.FC<ERPDashboardProps> = ({
  selectedClientId,
  selectedProjectId
}) => {
  const [kpis, setKpis] = useState<FinancialKPIs | null>(null);
  const [operationalMetrics, setOperationalMetrics] = useState<OperationalMetrics | null>(null);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [projectPerformance, setProjectPerformance] = useState<ProjectPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancialData();
  }, [selectedClientId, selectedProjectId]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      
      const [
        kpisData,
        operationalData,
        cashFlowResult,
        expenseCategoriesResult,
        projectPerformanceResult
      ] = await Promise.all([
        fetchFinancialKPIs(),
        fetchOperationalMetrics(),
        fetchCashFlowHistory(),
        fetchExpenseCategories(),
        fetchProjectPerformance()
      ]);

      setKpis(kpisData);
      setOperationalMetrics(operationalData);
      setCashFlowData(cashFlowResult);
      setExpenseCategories(expenseCategoriesResult);
      setProjectPerformance(projectPerformanceResult);
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFinancialKPIs = async (): Promise<FinancialKPIs> => {
    const currentDate = new Date();
    const startOfCurrentMonth = startOfMonth(currentDate);
    const endOfCurrentMonth = endOfMonth(currentDate);

    // Build queries with client-project filters
    let incomeQuery = supabase.from('incomes').select('amount')
      .gte('created_at', startOfCurrentMonth.toISOString())
      .lte('created_at', endOfCurrentMonth.toISOString());
    
    let expenseQuery = supabase.from('expenses').select('amount')
      .gte('created_at', startOfCurrentMonth.toISOString())
      .lte('created_at', endOfCurrentMonth.toISOString());

    let projectQuery = supabase.from('client_projects').select('id, budget, construction_budget')
      .neq('status', 'completed');

    if (selectedClientId) {
      incomeQuery = incomeQuery.eq('client_id', selectedClientId);
      expenseQuery = expenseQuery.eq('client_id', selectedClientId);
      projectQuery = projectQuery.eq('client_id', selectedClientId);
    }

    if (selectedProjectId) {
      incomeQuery = incomeQuery.eq('project_id', selectedProjectId);
      expenseQuery = expenseQuery.eq('project_id', selectedProjectId);
      projectQuery = projectQuery.eq('id', selectedProjectId);
    }

    const [
      cashAccountsResult,
      bankAccountsResult,
      incomeResult,
      expenseResult,
      projectsResult
    ] = await Promise.all([
      supabase.from('cash_accounts').select('current_balance').eq('status', 'active'),
      supabase.from('bank_accounts').select('current_balance').eq('status', 'active'),
      incomeQuery,
      expenseQuery,
      projectQuery
    ]);

    const cashBalance = (cashAccountsResult.data || []).reduce((sum, account) => sum + (account.current_balance || 0), 0);
    const bankBalance = (bankAccountsResult.data || []).reduce((sum, account) => sum + (account.current_balance || 0), 0);
    const monthlyIncome = (incomeResult.data || []).reduce((sum, income) => sum + (income.amount || 0), 0);
    const monthlyExpenses = (expenseResult.data || []).reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const activeProjects = (projectsResult.data || []).length;
    const pipelineValue = (projectsResult.data || []).reduce((sum, project) => {
      return sum + Math.max(project.budget || 0, project.construction_budget || 0);
    }, 0);

    return {
      totalCash: cashBalance + bankBalance,
      bankBalance,
      cashBalance,
      netMonthlyFlow: monthlyIncome - monthlyExpenses,
      monthlyIncome,
      monthlyExpenses,
      activeProjects,
      pipelineValue
    };
  };

  const fetchOperationalMetrics = async (): Promise<OperationalMetrics> => {
    // Build material requests query with filters
    let materialQuery = supabase.from('material_finance_requests')
      .select('id')
      .eq('status', 'pending');

    if (selectedClientId) {
      materialQuery = materialQuery.eq('client_id', selectedClientId);
    }

    if (selectedProjectId) {
      materialQuery = materialQuery.eq('project_id', selectedProjectId);
    }

    const [
      treasuryResult,
      lastTransactionResult,
      materialRequestsResult,
      cfdiResult,
      complementsResult
    ] = await Promise.all([
      supabase.from('cash_accounts').select('id').eq('status', 'active'),
      supabase.from('expenses').select('created_at, description')
        .order('created_at', { ascending: false })
        .limit(1),
      materialQuery,
      supabase.from('cfdi_documents').select('id')
        .eq('status', 'active')
        .eq('validation_status', 'pending'),
      supabase.from('payment_complements').select('id')
        .eq('status', 'pending')
    ]);

    return {
      treasuryAccounts: (treasuryResult.data || []).length,
      lastTransaction: lastTransactionResult.data?.[0]?.created_at 
        ? format(new Date(lastTransactionResult.data[0].created_at), 'dd/MM/yyyy')
        : 'Sin movimientos',
      materialRequests: (materialRequestsResult.data || []).length,
      materialRequestsAmount: 0, // Simplified for now
      pendingCFDIs: (cfdiResult.data || []).length,
      ppdComplements: (complementsResult.data || []).length
    };
  };

  const fetchCashFlowHistory = async (): Promise<CashFlowData[]> => {
    const months = [];
    const currentDate = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const startDate = startOfMonth(monthDate);
      const endDate = endOfMonth(monthDate);
      
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

      const [incomeResult, expenseResult] = await Promise.all([
        incomeQuery,
        expenseQuery
      ]);

      const income = (incomeResult.data || []).reduce((sum, item) => sum + (item.amount || 0), 0);
      const expenses = (expenseResult.data || []).reduce((sum, item) => sum + (item.amount || 0), 0);

      months.push({
        month: format(monthDate, 'MMM', { locale: es }),
        income,
        expenses,
        net: income - expenses
      });
    }

    return months;
  };

  const fetchExpenseCategories = async (): Promise<ExpenseCategory[]> => {
    const currentDate = new Date();
    const startDate = startOfMonth(currentDate);
    const endDate = endOfMonth(currentDate);

    let expenseQuery = supabase.from('expenses').select('category, amount')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (selectedClientId) {
      expenseQuery = expenseQuery.eq('client_id', selectedClientId);
    }

    if (selectedProjectId) {
      expenseQuery = expenseQuery.eq('project_id', selectedProjectId);
    }

    const { data: expenses } = await expenseQuery;

    const categoryMap = new Map<string, number>();
    let totalAmount = 0;

    (expenses || []).forEach(expense => {
      const category = expense.category || 'Otros';
      const amount = expense.amount || 0;
      
      categoryMap.set(category, (categoryMap.get(category) || 0) + amount);
      totalAmount += amount;
    });

    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({
        name,
        value,
        percentage: totalAmount > 0 ? (value / totalAmount) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  };

  const fetchProjectPerformance = async (): Promise<ProjectPerformance[]> => {
    let projectQuery = supabase.from('client_projects')
      .select('id, project_name')
      .neq('status', 'completed');

    if (selectedClientId) {
      projectQuery = projectQuery.eq('client_id', selectedClientId);
    }

    if (selectedProjectId) {
      projectQuery = projectQuery.eq('id', selectedProjectId);
    }

    const { data: projects } = await projectQuery.limit(5);

    const projectPerformanceData = await Promise.all(
      (projects || []).map(async (project) => {
        const [incomeResult, expenseResult] = await Promise.all([
          supabase.from('incomes').select('amount').eq('project_id', project.id),
          supabase.from('expenses').select('amount').eq('project_id', project.id)
        ]);

        const revenue = (incomeResult.data || []).reduce((sum, income) => sum + (income.amount || 0), 0);
        const expenses = (expenseResult.data || []).reduce((sum, expense) => sum + (expense.amount || 0), 0);
        const profit = revenue - expenses;
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

        return {
          projectName: project.project_name || 'Proyecto sin nombre',
          revenue,
          expenses,
          profit,
          margin
        };
      })
    );

    return projectPerformanceData.filter(project => project.revenue > 0 || project.expenses > 0);
  };

  const moduleAccess = [
    { 
      name: 'Tesorería', 
      icon: Wallet, 
      value: 'treasury',
      description: `${operationalMetrics?.treasuryAccounts || 0} cuentas activas`
    },
    { 
      name: 'Materiales', 
      icon: Package, 
      value: 'materials',
      description: `${operationalMetrics?.materialRequests || 0} solicitudes pendientes`
    },
    { 
      name: 'Planes de Pago', 
      icon: Activity, 
      value: 'payment-plans',
      description: 'Gestión de pagos'
    },
    { 
      name: 'PPD', 
      icon: AlertTriangle, 
      value: 'ppd',
      description: `${operationalMetrics?.ppdComplements || 0} complementos pendientes`
    },
    { 
      name: 'Facturación', 
      icon: FileText, 
      value: 'invoicing',
      description: `${operationalMetrics?.pendingCFDIs || 0} CFDIs pendientes`
    },
    { 
      name: 'Rentabilidad', 
      icon: Calculator, 
      value: 'profitability',
      description: 'Análisis financiero'
    }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getFlowIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (value < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Activity className="h-4 w-4 text-muted-foreground" />;
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--destructive))', 'hsl(var(--warning))'];

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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Centro de Control Financiero</h1>
          <p className="text-muted-foreground">
            Dashboard ejecutivo en tiempo real - {format(new Date(), 'dd MMMM yyyy', { locale: es })}
          </p>
        </div>
      </div>

      {/* Principal KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Efectivo Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis?.totalCash || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Bancos: {formatCurrency(kpis?.bankBalance || 0)} | Efectivo: {formatCurrency(kpis?.cashBalance || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flujo Neto Mensual</CardTitle>
            {getFlowIcon(kpis?.netMonthlyFlow || 0)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis?.netMonthlyFlow || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Ingresos: {formatCurrency(kpis?.monthlyIncome || 0)} | Gastos: {formatCurrency(kpis?.monthlyExpenses || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proyectos Activos</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.activeProjects || 0}</div>
            <p className="text-xs text-muted-foreground">
              En desarrollo y construcción
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Value Pipeline</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis?.pipelineValue || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Valor total de proyectos activos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Operational Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado de Tesorería</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{operationalMetrics?.treasuryAccounts || 0} cuentas activas</div>
            <p className="text-xs text-muted-foreground">
              Último movimiento: {operationalMetrics?.lastTransaction || 'Sin movimientos'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solicitudes de Materiales</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{operationalMetrics?.materialRequests || 0} solicitudes</div>
            <p className="text-xs text-muted-foreground">
              Monto total: {formatCurrency(operationalMetrics?.materialRequestsAmount || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sistema PPD</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{operationalMetrics?.pendingCFDIs || 0} CFDIs</div>
            <p className="text-xs text-muted-foreground">
              {operationalMetrics?.ppdComplements || 0} complementos pendientes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Analysis */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Cash Flow Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Flujo de Efectivo - Últimos 6 Meses</CardTitle>
            <CardDescription>Evolución de ingresos y gastos en tiempo real</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashFlowData}>
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke="hsl(var(--destructive))"
                    fill="hsl(var(--destructive))"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Expense Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Gastos</CardTitle>
            <CardDescription>Por categoría - Mes actual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {expenseCategories.slice(0, 5).map((category, index) => (
                <div key={category.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm font-medium">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{formatCurrency(category.value)}</div>
                    <div className="text-xs text-muted-foreground">{formatPercentage(category.percentage)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Performance */}
      {projectPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance de Proyectos</CardTitle>
            <CardDescription>Rentabilidad por proyecto activo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectPerformance}>
                  <XAxis 
                    dataKey="projectName" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="revenue"
                    fill="hsl(var(--primary))"
                    name="Ingresos"
                  />
                  <Bar
                    dataKey="expenses"
                    fill="hsl(var(--destructive))"
                    name="Gastos"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Module Access */}
      <Card>
        <CardHeader>
          <CardTitle>Acceso a Módulos Financieros</CardTitle>
          <CardDescription>Navegación rápida a las funcionalidades del sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {moduleAccess.map((module) => {
              const Icon = module.icon;
              return (
                <Button
                  key={module.value}
                  variant="outline"
                  className="flex items-center justify-between p-4 h-auto"
                  onClick={() => {
                    // This would navigate to the specific tab in the parent component
                    const event = new CustomEvent('navigate-to-module', { detail: module.value });
                    window.dispatchEvent(event);
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">{module.name}</div>
                      <div className="text-xs text-muted-foreground">{module.description}</div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ERPDashboard;