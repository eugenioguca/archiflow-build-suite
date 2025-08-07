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
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, PieChart, Pie, Cell, BarChart, Bar, Tooltip } from 'recharts';

interface FinancialKPIs {
  totalCash: number;
  bankBalance: number;
  cashBalance: number;
  netMonthlyFlow: number;
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
  expenses: number;
  profit: number;
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

    // Build queries with client-project filters (simplified without incomes/payment_plans)
    let expenseQuery = supabase.from('expenses').select('amount')
      .gte('created_at', startOfCurrentMonth.toISOString())
      .lte('created_at', endOfCurrentMonth.toISOString());

    let projectQuery = supabase.from('client_projects').select('id')
      .neq('status', 'completed');

    // Use project budgets for pipeline value
    let pipelineQuery = supabase.from('project_budgets')
      .select('total_amount')
      .eq('status', 'approved');

    if (selectedClientId) {
      expenseQuery = expenseQuery.eq('client_id', selectedClientId);
      projectQuery = projectQuery.eq('client_id', selectedClientId);
    }

    if (selectedProjectId) {
      expenseQuery = expenseQuery.eq('project_id', selectedProjectId);
      projectQuery = projectQuery.eq('id', selectedProjectId);
      pipelineQuery = pipelineQuery.eq('project_id', selectedProjectId);
    }

    const [
      cashAccountsResult,
      bankAccountsResult,
      expenseResult,
      projectsResult,
      pipelineResult
    ] = await Promise.all([
      supabase.from('cash_accounts').select('current_balance').eq('status', 'active'),
      supabase.from('bank_accounts').select('current_balance').eq('status', 'active'),
      expenseQuery,
      projectQuery,
      pipelineQuery
    ]);

    const cashBalance = (cashAccountsResult.data || []).reduce((sum, account) => sum + (account.current_balance || 0), 0);
    const bankBalance = (bankAccountsResult.data || []).reduce((sum, account) => sum + (account.current_balance || 0), 0);
    const monthlyExpenses = (expenseResult.data || []).reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const activeProjects = (projectsResult.data || []).length;
    const pipelineValue = (pipelineResult.data || []).reduce((sum, plan) => sum + (plan.total_amount || 0), 0);

    return {
      totalCash: cashBalance + bankBalance,
      bankBalance,
      cashBalance,
      netMonthlyFlow: -monthlyExpenses, // Only expenses now
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
      
      let expenseQuery = supabase.from('expenses').select('amount')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (selectedClientId) {
        expenseQuery = expenseQuery.eq('client_id', selectedClientId);
      }

      if (selectedProjectId) {
        expenseQuery = expenseQuery.eq('project_id', selectedProjectId);
      }

      const expenseResult = await expenseQuery;
      const expenses = (expenseResult.data || []).reduce((sum, item) => sum + (item.amount || 0), 0);

      months.push({
        month: format(monthDate, 'MMM', { locale: es }),
        expenses,
        net: -expenses // Only expenses now
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
        const expenseResult = await supabase.from('expenses').select('amount').eq('project_id', project.id);
        
        const expenses = (expenseResult.data || []).reduce((sum, expense) => sum + (expense.amount || 0), 0);
        const profit = -expenses; // Simplified calculation

        return {
          projectName: project.project_name || 'Proyecto sin nombre',
          expenses,
          profit
        };
      })
    );

    return projectPerformanceData.filter(project => project.expenses > 0);
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
            <CardTitle className="text-sm font-medium">Gastos Mensuales</CardTitle>
            {getFlowIcon(kpis?.netMonthlyFlow || 0)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis?.monthlyExpenses || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Gastos del mes actual
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
            <CardTitle className="text-sm font-medium">Materiales</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{operationalMetrics?.materialRequests || 0} solicitudes</div>
            <p className="text-xs text-muted-foreground">
              Pendientes de aprobación
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documentos Fiscales</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{operationalMetrics?.pendingCFDIs || 0} CFDIs pendientes</div>
            <p className="text-xs text-muted-foreground">
              {operationalMetrics?.ppdComplements || 0} complementos PPD
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Module Access Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {moduleAccess.map((module) => (
          <Card key={module.value} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{module.name}</CardTitle>
              <module.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{module.description}</p>
              <ChevronRight className="h-4 w-4 mt-2 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Cash Flow Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Flujo de Gastos (6 meses)</CardTitle>
            <CardDescription>Histórico de gastos mensuales</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={cashFlowData}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value, name) => [formatCurrency(Number(value)), name === 'expenses' ? 'Gastos' : 'Neto']} />
                <Area type="monotone" dataKey="expenses" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Categorías de Gastos</CardTitle>
            <CardDescription>Distribución del mes actual</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expenseCategories}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${formatPercentage(percentage)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expenseCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Project Performance */}
      {projectPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Rendimiento por Proyecto</CardTitle>
            <CardDescription>Top 5 proyectos con mayor actividad</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectPerformance}>
                <XAxis dataKey="projectName" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="expenses" fill="hsl(var(--destructive))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ERPDashboard;