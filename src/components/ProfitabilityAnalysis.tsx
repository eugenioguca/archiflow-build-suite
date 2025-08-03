import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { ClientProjectSelector } from './ClientProjectSelector';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Building2, 
  DollarSign,
  Percent,
  Target,
  BarChart3
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';
import { es } from 'date-fns/locale';

interface ProfitabilityData {
  id: string;
  name: string;
  type: 'client' | 'project' | 'category';
  revenue: number;
  costs: number;
  gross_profit: number;
  gross_margin: number;
  net_profit: number;
  net_margin: number;
  transactions_count: number;
  period: string;
}

interface ClientProfitability extends ProfitabilityData {
  client_id: string;
  invoices_count: number;
  avg_invoice_value: number;
  payment_terms_avg: number;
}

interface ProjectProfitability extends ProfitabilityData {
  project_id: string;
  completion_percentage: number;
  estimated_total_revenue: number;
  estimated_total_costs: number;
  projected_profit: number;
  roi: number;
}

interface CategoryProfitability extends ProfitabilityData {
  category: string;
  growth_rate: number;
  market_share: number;
}

interface ProfitabilityAnalysisProps {
  selectedClientId?: string;
  selectedProjectId?: string;
}

const ProfitabilityAnalysis: React.FC<ProfitabilityAnalysisProps> = ({ selectedClientId, selectedProjectId }) => {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current_month');
  const [selectedAnalysis, setSelectedAnalysis] = useState<'clients' | 'projects' | 'categories'>('clients');
  const [clientProfitability, setClientProfitability] = useState<ClientProfitability[]>([]);
  const [projectProfitability, setProjectProfitability] = useState<ProjectProfitability[]>([]);
  const [categoryProfitability, setCategoryProfitability] = useState<CategoryProfitability[]>([]);

  useEffect(() => {
    fetchProfitabilityData();
  }, [selectedPeriod, selectedAnalysis, selectedClientId, selectedProjectId]);

  const getPeriodDates = () => {
    const now = new Date();
    
    switch (selectedPeriod) {
      case 'current_month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'previous_month':
        const prevMonth = subMonths(now, 1);
        return { start: startOfMonth(prevMonth), end: endOfMonth(prevMonth) };
      case 'current_year':
        return { start: startOfYear(now), end: endOfYear(now) };
      case 'last_3_months':
        const threeMonthsAgo = subMonths(now, 3);
        return { start: startOfMonth(threeMonthsAgo), end: endOfMonth(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const fetchProfitabilityData = async () => {
    try {
      setLoading(true);
      const { start, end } = getPeriodDates();

      switch (selectedAnalysis) {
        case 'clients':
          await fetchClientProfitability(start, end);
          break;
        case 'projects':
          await fetchProjectProfitability(start, end);
          break;
        case 'categories':
          await fetchCategoryProfitability(start, end);
          break;
      }
    } catch (error) {
      console.error('Error fetching profitability data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientProfitability = async (startDate: Date, endDate: Date) => {
    // Build queries with filters
    let incomesQuery = supabase
      .from('incomes')
      .select('amount, client_id, clients(full_name)')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .not('client_id', 'is', null);
    
    let expensesQuery = supabase
      .from('expenses')
      .select('amount, client_id')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .not('client_id', 'is', null);

    // Apply filters
    if (selectedProjectId) {
      incomesQuery = incomesQuery.eq('project_id', selectedProjectId);
      expensesQuery = expensesQuery.eq('project_id', selectedProjectId);
    } else if (selectedClientId) {
      incomesQuery = incomesQuery.eq('client_id', selectedClientId);
      expensesQuery = expensesQuery.eq('client_id', selectedClientId);
    }

    const [incomesResult, expensesResult, clientsResult] = await Promise.all([
      incomesQuery,
      expensesQuery,
      supabase.from('clients').select('id, full_name')
    ]);

    const clientMap = new Map<string, {
      revenue: number;
      costs: number;
      invoices_count: number;
      client_name: string;
    }>();

    // Process incomes
    (incomesResult.data || []).forEach(income => {
      const clientId = income.client_id!;
      const clientName = income.clients?.full_name || 'Cliente desconocido';
      
      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, {
          revenue: 0,
          costs: 0,
          invoices_count: 0,
          client_name: clientName
        });
      }
      
      const client = clientMap.get(clientId)!;
      client.revenue += income.amount || 0;
      client.invoices_count += 1;
    });

    // Process expenses
    (expensesResult.data || []).forEach(expense => {
      const clientId = expense.client_id!;
      
      if (clientMap.has(clientId)) {
        const client = clientMap.get(clientId)!;
        client.costs += expense.amount || 0;
      }
    });

    const clientProfitabilityData: ClientProfitability[] = Array.from(clientMap.entries()).map(([clientId, data]) => {
      const gross_profit = data.revenue - data.costs;
      const gross_margin = data.revenue > 0 ? (gross_profit / data.revenue) * 100 : 0;
      const avg_invoice_value = data.invoices_count > 0 ? data.revenue / data.invoices_count : 0;

      return {
        id: clientId,
        client_id: clientId,
        name: data.client_name,
        type: 'client' as const,
        revenue: data.revenue,
        costs: data.costs,
        gross_profit,
        gross_margin,
        net_profit: gross_profit,
        net_margin: gross_margin,
        transactions_count: data.invoices_count,
        invoices_count: data.invoices_count,
        avg_invoice_value,
        payment_terms_avg: 30, // Default value
        period: format(startDate, 'MMMM yyyy', { locale: es })
      };
    }).sort((a, b) => b.revenue - a.revenue);

    setClientProfitability(clientProfitabilityData);
  };

  const fetchProjectProfitability = async (startDate: Date, endDate: Date) => {
    const [incomesResult, expensesResult, projectsResult] = await Promise.all([
      supabase
        .from('incomes')
        .select('amount, project_id, client_projects(project_name)')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .not('project_id', 'is', null),
      supabase
        .from('expenses')
        .select('amount, project_id')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .not('project_id', 'is', null),
      supabase.from('projects').select('id, name, progress_percentage, budget, total_cost')
    ]);

    const projectMap = new Map<string, {
      revenue: number;
      costs: number;
      transactions_count: number;
      project_name: string;
      progress_percentage: number;
      budget: number;
      estimated_total_costs: number;
    }>();

    // Process incomes
    (incomesResult.data || []).forEach(income => {
      const projectId = income.project_id!;
      const projectName = income.client_projects?.project_name || 'Proyecto desconocido';
      
      if (!projectMap.has(projectId)) {
        const project = (projectsResult.data || []).find(p => p.id === projectId);
        projectMap.set(projectId, {
          revenue: 0,
          costs: 0,
          transactions_count: 0,
          project_name: projectName,
          progress_percentage: project?.progress_percentage || 0,
          budget: project?.budget || 0,
          estimated_total_costs: project?.total_cost || 0
        });
      }
      
      const project = projectMap.get(projectId)!;
      project.revenue += income.amount || 0;
      project.transactions_count += 1;
    });

    // Process expenses
    (expensesResult.data || []).forEach(expense => {
      const projectId = expense.project_id!;
      
      if (projectMap.has(projectId)) {
        const project = projectMap.get(projectId)!;
        project.costs += expense.amount || 0;
        project.transactions_count += 1;
      }
    });

    const projectProfitabilityData: ProjectProfitability[] = Array.from(projectMap.entries()).map(([projectId, data]) => {
      const gross_profit = data.revenue - data.costs;
      const gross_margin = data.revenue > 0 ? (gross_profit / data.revenue) * 100 : 0;
      const estimated_total_revenue = data.budget || data.revenue;
      const projected_profit = estimated_total_revenue - data.estimated_total_costs;
      const roi = data.estimated_total_costs > 0 ? (projected_profit / data.estimated_total_costs) * 100 : 0;

      return {
        id: projectId,
        project_id: projectId,
        name: data.project_name,
        type: 'project' as const,
        revenue: data.revenue,
        costs: data.costs,
        gross_profit,
        gross_margin,
        net_profit: gross_profit,
        net_margin: gross_margin,
        transactions_count: data.transactions_count,
        completion_percentage: data.progress_percentage,
        estimated_total_revenue,
        estimated_total_costs: data.estimated_total_costs,
        projected_profit,
        roi,
        period: format(startDate, 'MMMM yyyy', { locale: es })
      };
    }).sort((a, b) => b.gross_profit - a.gross_profit);

    setProjectProfitability(projectProfitabilityData);
  };

  const fetchCategoryProfitability = async (startDate: Date, endDate: Date) => {
    const [incomesResult, expensesResult] = await Promise.all([
      supabase
        .from('incomes')
        .select('amount, category')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
      supabase
        .from('expenses')
        .select('amount, category')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
    ]);

    const categoryMap = new Map<string, {
      revenue: number;
      costs: number;
      transactions_count: number;
    }>();

    // Process incomes
    (incomesResult.data || []).forEach(income => {
      const category = income.category || 'Sin categoría';
      
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { revenue: 0, costs: 0, transactions_count: 0 });
      }
      
      const cat = categoryMap.get(category)!;
      cat.revenue += income.amount || 0;
      cat.transactions_count += 1;
    });

    // Process expenses
    (expensesResult.data || []).forEach(expense => {
      const category = expense.category || 'Sin categoría';
      
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { revenue: 0, costs: 0, transactions_count: 0 });
      }
      
      const cat = categoryMap.get(category)!;
      cat.costs += expense.amount || 0;
      cat.transactions_count += 1;
    });

    const totalRevenue = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.revenue, 0);

    const categoryProfitabilityData: CategoryProfitability[] = Array.from(categoryMap.entries()).map(([category, data]) => {
      const gross_profit = data.revenue - data.costs;
      const gross_margin = data.revenue > 0 ? (gross_profit / data.revenue) * 100 : 0;
      const market_share = totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0;

      return {
        id: category,
        category,
        name: category,
        type: 'category' as const,
        revenue: data.revenue,
        costs: data.costs,
        gross_profit,
        gross_margin,
        net_profit: gross_profit,
        net_margin: gross_margin,
        transactions_count: data.transactions_count,
        growth_rate: 0, // Would need historical data
        market_share,
        period: format(startDate, 'MMMM yyyy', { locale: es })
      };
    }).sort((a, b) => b.revenue - a.revenue);

    setCategoryProfitability(categoryProfitabilityData);
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

  const getMarginBadge = (margin: number) => {
    if (margin >= 20) return <Badge variant="default" className="bg-green-500">Excelente</Badge>;
    if (margin >= 10) return <Badge variant="default" className="bg-blue-500">Bueno</Badge>;
    if (margin >= 5) return <Badge variant="outline">Regular</Badge>;
    return <Badge variant="destructive">Bajo</Badge>;
  };

  const getSummaryStats = () => {
    let data: ProfitabilityData[] = [];
    
    switch (selectedAnalysis) {
      case 'clients':
        data = clientProfitability;
        break;
      case 'projects':
        data = projectProfitability;
        break;
      case 'categories':
        data = categoryProfitability;
        break;
    }

    const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
    const totalCosts = data.reduce((sum, item) => sum + item.costs, 0);
    const totalProfit = totalRevenue - totalCosts;
    const avgMargin = data.length > 0 ? data.reduce((sum, item) => sum + item.gross_margin, 0) / data.length : 0;
    const profitableCount = data.filter(item => item.gross_profit > 0).length;

    return {
      totalRevenue,
      totalCosts,
      totalProfit,
      avgMargin,
      profitableCount,
      totalCount: data.length
    };
  };

  const getCurrentData = () => {
    switch (selectedAnalysis) {
      case 'clients':
        return clientProfitability;
      case 'projects':
        return projectProfitability;
      case 'categories':
        return categoryProfitability;
      default:
        return [];
    }
  };

  const stats = getSummaryStats();
  const currentData = getCurrentData();

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
          <h1 className="text-3xl font-bold tracking-tight">Análisis de Rentabilidad</h1>
          <p className="text-muted-foreground">
            Evaluación detallada de rentabilidad por cliente, proyecto y categoría
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedAnalysis} onValueChange={(value: 'clients' | 'projects' | 'categories') => setSelectedAnalysis(value)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="clients">Por Cliente</SelectItem>
              <SelectItem value="projects">Por Proyecto</SelectItem>
              <SelectItem value="categories">Por Categoría</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_month">Mes Actual</SelectItem>
              <SelectItem value="previous_month">Mes Anterior</SelectItem>
              <SelectItem value="last_3_months">Últimos 3 Meses</SelectItem>
              <SelectItem value="current_year">Año Actual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Período analizado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costos Totales</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalCosts)}</div>
            <p className="text-xs text-muted-foreground">
              Gastos del período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilidad Bruta</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(stats.totalProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(stats.totalRevenue > 0 ? (stats.totalProfit / stats.totalRevenue) * 100 : 0)} margen
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margen Promedio</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(stats.avgMargin)}</div>
            <p className="text-xs text-muted-foreground">
              Promedio ponderado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Rentables</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.profitableCount}</div>
            <p className="text-xs text-muted-foreground">
              de {stats.totalCount} totales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Profitability Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Análisis de Rentabilidad - {selectedAnalysis === 'clients' ? 'Clientes' : selectedAnalysis === 'projects' ? 'Proyectos' : 'Categorías'}
          </CardTitle>
          <CardDescription>
            Rentabilidad detallada ordenada por ingresos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                  <TableHead className="text-right">Costos</TableHead>
                  <TableHead className="text-right">Utilidad Bruta</TableHead>
                  <TableHead className="text-right">Margen Bruto</TableHead>
                  <TableHead>Clasificación</TableHead>
                  <TableHead className="text-right">Transacciones</TableHead>
                  {selectedAnalysis === 'clients' && <TableHead className="text-right">Valor Promedio</TableHead>}
                  {selectedAnalysis === 'projects' && <TableHead className="text-right">ROI Proyectado</TableHead>}
                  {selectedAnalysis === 'categories' && <TableHead className="text-right">Participación</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        {selectedAnalysis === 'projects' && 'completion_percentage' in item && (
                          <div className="flex items-center gap-2 mt-1">
                            <Progress value={item.completion_percentage} className="w-20 h-2" />
                            <span className="text-xs text-muted-foreground">
                              {item.completion_percentage}% completado
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {formatCurrency(item.revenue)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(item.costs)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={item.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(item.gross_profit)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={item.gross_margin >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatPercentage(item.gross_margin)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {getMarginBadge(item.gross_margin)}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.transactions_count}
                    </TableCell>
                    {selectedAnalysis === 'clients' && 'avg_invoice_value' in item && (
                      <TableCell className="text-right">
                        {formatCurrency(item.avg_invoice_value)}
                      </TableCell>
                    )}
                    {selectedAnalysis === 'projects' && 'roi' in item && (
                      <TableCell className="text-right">
                        <span className={item.roi >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatPercentage(item.roi)}
                        </span>
                      </TableCell>
                    )}
                    {selectedAnalysis === 'categories' && 'market_share' in item && (
                      <TableCell className="text-right">
                        {formatPercentage(item.market_share)}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {currentData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No se encontraron datos de rentabilidad para el período seleccionado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfitabilityAnalysis;