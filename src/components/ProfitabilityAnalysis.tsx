import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  BarChart3,
  AlertTriangle
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';
import { es } from 'date-fns/locale';

interface ProfitabilityData {
  id: string;
  name: string;
  type: 'client' | 'project' | 'category';
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
  avg_expense_value: number;
}

interface ProjectProfitability extends ProfitabilityData {
  project_id: string;
  completion_percentage: number;
  estimated_total_costs: number;
  projected_profit: number;
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
    // Only fetch expenses now (incomes no longer exist)
    let expensesQuery = supabase
      .from('expenses')
      .select('amount, client_id, clients(full_name)')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .not('client_id', 'is', null);

    // Apply filters
    if (selectedProjectId) {
      expensesQuery = expensesQuery.eq('project_id', selectedProjectId);
    } else if (selectedClientId) {
      expensesQuery = expensesQuery.eq('client_id', selectedClientId);
    }

    const [expensesResult, clientsResult] = await Promise.all([
      expensesQuery,
      supabase.from('clients').select('id, full_name')
    ]);

    const clientMap = new Map<string, {
      costs: number;
      transactions: number;
      name: string;
    }>();

    // Process expenses
    expensesResult.data?.forEach(expense => {
      const clientId = expense.client_id;
      const clientName = expense.clients?.full_name || 'Cliente desconocido';
      
      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, {
          costs: 0,
          transactions: 0,
          name: clientName
        });
      }
      
      const client = clientMap.get(clientId)!;
      client.costs += expense.amount || 0;
      client.transactions += 1;
    });

    // Convert to ClientProfitability format
    const clientProfitabilityData: ClientProfitability[] = Array.from(clientMap.entries()).map(([clientId, data]) => ({
      id: clientId,
      client_id: clientId,
      name: data.name,
      type: 'client' as const,
      costs: data.costs,
      gross_profit: -data.costs, // Negative since we only have costs
      gross_margin: -100, // Only costs
      net_profit: -data.costs,
      net_margin: -100,
      transactions_count: data.transactions,
      avg_expense_value: data.transactions > 0 ? data.costs / data.transactions : 0,
      period: `${format(startDate, 'MMM yyyy', { locale: es })} - ${format(endDate, 'MMM yyyy', { locale: es })}`
    }));

    setClientProfitability(clientProfitabilityData.sort((a, b) => a.costs - b.costs).slice(0, 20));
  };

  const fetchProjectProfitability = async (startDate: Date, endDate: Date) => {
    // Only fetch expenses now (incomes no longer exist)
    let expensesQuery = supabase
      .from('expenses')
      .select('amount, project_id, client_projects(project_name, overall_progress_percentage)')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .not('project_id', 'is', null);

    // Apply filters
    if (selectedClientId) {
      expensesQuery = expensesQuery.eq('client_id', selectedClientId);
    }
    if (selectedProjectId) {
      expensesQuery = expensesQuery.eq('project_id', selectedProjectId);
    }

    const expensesResult = await expensesQuery;

    const projectMap = new Map<string, {
      costs: number;
      transactions: number;
      name: string;
      completion: number;
    }>();

    // Process expenses
    expensesResult.data?.forEach(expense => {
      const projectId = expense.project_id;
      const projectName = expense.client_projects?.project_name || 'Proyecto desconocido';
      const completion = expense.client_projects?.overall_progress_percentage || 0;
      
      if (!projectMap.has(projectId)) {
        projectMap.set(projectId, {
          costs: 0,
          transactions: 0,
          name: projectName,
          completion
        });
      }
      
      const project = projectMap.get(projectId)!;
      project.costs += expense.amount || 0;
      project.transactions += 1;
    });

    // Convert to ProjectProfitability format
    const projectProfitabilityData: ProjectProfitability[] = Array.from(projectMap.entries()).map(([projectId, data]) => ({
      id: projectId,
      project_id: projectId,
      name: data.name,
      type: 'project' as const,
      costs: data.costs,
      gross_profit: -data.costs, // Negative since we only have costs
      gross_margin: -100, // Only costs
      net_profit: -data.costs,
      net_margin: -100,
      transactions_count: data.transactions,
      completion_percentage: data.completion,
      estimated_total_costs: data.costs, // Simplified
      projected_profit: -data.costs,
      period: `${format(startDate, 'MMM yyyy', { locale: es })} - ${format(endDate, 'MMM yyyy', { locale: es })}`
    }));

    setProjectProfitability(projectProfitabilityData.sort((a, b) => a.costs - b.costs).slice(0, 20));
  };

  const fetchCategoryProfitability = async (startDate: Date, endDate: Date) => {
    // Only fetch expenses now (incomes no longer exist)
    let expensesQuery = supabase
      .from('expenses')
      .select('amount, category')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Apply filters
    if (selectedClientId) {
      expensesQuery = expensesQuery.eq('client_id', selectedClientId);
    }
    if (selectedProjectId) {
      expensesQuery = expensesQuery.eq('project_id', selectedProjectId);
    }

    const expensesResult = await expensesQuery;

    const categoryMap = new Map<string, {
      costs: number;
      transactions: number;
    }>();

    // Process expenses
    expensesResult.data?.forEach(expense => {
      const category = expense.category || 'Sin categoría';
      
      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          costs: 0,
          transactions: 0
        });
      }
      
      const cat = categoryMap.get(category)!;
      cat.costs += expense.amount || 0;
      cat.transactions += 1;
    });

    const totalCosts = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.costs, 0);

    // Convert to CategoryProfitability format
    const categoryProfitabilityData: CategoryProfitability[] = Array.from(categoryMap.entries()).map(([category, data]) => ({
      id: category,
      category,
      name: category,
      type: 'category' as const,
      costs: data.costs,
      gross_profit: -data.costs, // Negative since we only have costs
      gross_margin: -100, // Only costs
      net_profit: -data.costs,
      net_margin: -100,
      transactions_count: data.transactions,
      growth_rate: 0, // Not available
      market_share: totalCosts > 0 ? (data.costs / totalCosts) * 100 : 0,
      period: `${format(startDate, 'MMM yyyy', { locale: es })} - ${format(endDate, 'MMM yyyy', { locale: es })}`
    }));

    setCategoryProfitability(categoryProfitabilityData.sort((a, b) => b.costs - a.costs).slice(0, 20));
  };

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

  const getProfitabilityIcon = (margin: number) => {
    if (margin > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const getProfitabilityColor = (margin: number) => {
    if (margin > 20) return 'text-green-600';
    if (margin > 10) return 'text-green-500';
    if (margin > 0) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Warning about limited functionality */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Note: Profitability analysis is now limited to expense tracking only, as income management has been removed from the system.
          All profitability metrics will show negative values since only costs are tracked.
        </AlertDescription>
      </Alert>

      {/* Controles */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Análisis de Rentabilidad (Solo Costos)</h1>
          <p className="text-muted-foreground">
            Análisis detallado de costos por {selectedAnalysis === 'clients' ? 'cliente' : selectedAnalysis === 'projects' ? 'proyecto' : 'categoría'}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_month">Mes actual</SelectItem>
              <SelectItem value="previous_month">Mes anterior</SelectItem>
              <SelectItem value="last_3_months">Últimos 3 meses</SelectItem>
              <SelectItem value="current_year">Año actual</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedAnalysis} onValueChange={(value: any) => setSelectedAnalysis(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="clients">Por Cliente</SelectItem>
              <SelectItem value="projects">Por Proyecto</SelectItem>
              <SelectItem value="categories">Por Categoría</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Métricas Resumen */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Costos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(
                selectedAnalysis === 'clients' ? clientProfitability.reduce((sum, item) => sum + item.costs, 0) :
                selectedAnalysis === 'projects' ? projectProfitability.reduce((sum, item) => sum + item.costs, 0) :
                categoryProfitability.reduce((sum, item) => sum + item.costs, 0)
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {selectedAnalysis === 'clients' ? 'Clientes' : selectedAnalysis === 'projects' ? 'Proyectos' : 'Categorías'} Analizados
            </CardTitle>
            {selectedAnalysis === 'clients' ? <Users className="h-4 w-4 text-muted-foreground" /> :
             selectedAnalysis === 'projects' ? <Building2 className="h-4 w-4 text-muted-foreground" /> :
             <BarChart3 className="h-4 w-4 text-muted-foreground" />}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {selectedAnalysis === 'clients' ? clientProfitability.length :
               selectedAnalysis === 'projects' ? projectProfitability.length :
               categoryProfitability.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio de Costo</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(
                selectedAnalysis === 'clients' && clientProfitability.length > 0 ? 
                  clientProfitability.reduce((sum, item) => sum + item.costs, 0) / clientProfitability.length :
                selectedAnalysis === 'projects' && projectProfitability.length > 0 ? 
                  projectProfitability.reduce((sum, item) => sum + item.costs, 0) / projectProfitability.length :
                categoryProfitability.length > 0 ? 
                  categoryProfitability.reduce((sum, item) => sum + item.costs, 0) / categoryProfitability.length : 0
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transacciones</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {selectedAnalysis === 'clients' ? clientProfitability.reduce((sum, item) => sum + item.transactions_count, 0) :
               selectedAnalysis === 'projects' ? projectProfitability.reduce((sum, item) => sum + item.transactions_count, 0) :
               categoryProfitability.reduce((sum, item) => sum + item.transactions_count, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tablas de Datos */}
      {selectedAnalysis === 'clients' && (
        <Card>
          <CardHeader>
            <CardTitle>Análisis de Costos por Cliente</CardTitle>
            <CardDescription>Costos detallados por cliente en el período seleccionado</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Costos Totales</TableHead>
                  <TableHead>Transacciones</TableHead>
                  <TableHead>Promedio por Transacción</TableHead>
                  <TableHead>Período</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientProfitability.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell className="text-red-600">{formatCurrency(client.costs)}</TableCell>
                    <TableCell>{client.transactions_count}</TableCell>
                    <TableCell>{formatCurrency(client.avg_expense_value)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{client.period}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {selectedAnalysis === 'projects' && (
        <Card>
          <CardHeader>
            <CardTitle>Análisis de Costos por Proyecto</CardTitle>
            <CardDescription>Costos detallados por proyecto en el período seleccionado</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>Costos Totales</TableHead>
                  <TableHead>Progreso</TableHead>
                  <TableHead>Transacciones</TableHead>
                  <TableHead>Período</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectProfitability.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell className="text-red-600">{formatCurrency(project.costs)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={project.completion_percentage} className="w-16" />
                        <span className="text-sm">{project.completion_percentage.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{project.transactions_count}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{project.period}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {selectedAnalysis === 'categories' && (
        <Card>
          <CardHeader>
            <CardTitle>Análisis de Costos por Categoría</CardTitle>
            <CardDescription>Costos detallados por categoría en el período seleccionado</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Costos Totales</TableHead>
                  <TableHead>% del Total</TableHead>
                  <TableHead>Transacciones</TableHead>
                  <TableHead>Período</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryProfitability.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-red-600">{formatCurrency(category.costs)}</TableCell>
                    <TableCell>{formatPercentage(category.market_share)}</TableCell>
                    <TableCell>{category.transactions_count}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{category.period}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProfitabilityAnalysis;