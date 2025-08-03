import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/DatePicker';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Search, Download, Filter, Calendar, DollarSign } from 'lucide-react';
import { ClientProjectSelector } from './ClientProjectSelector';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';

interface TransactionRow {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  reference?: string;
  supplier?: string;
  client?: string;
  project?: string;
  status?: string;
  cfdi_status?: string;
}

interface Filters {
  type: 'all' | 'income' | 'expense';
  category: string;
  period: 'month' | 'quarter' | 'year' | 'custom';
  startDate?: Date;
  endDate?: Date;
  searchTerm: string;
  minAmount?: number;
  maxAmount?: number;
}

interface DetailedTransactionsTableProps {
  selectedClientId?: string;
  selectedProjectId?: string;
}

const DetailedTransactionsTable: React.FC<DetailedTransactionsTableProps> = ({ selectedClientId, selectedProjectId }) => {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>({
    type: 'all',
    category: 'all',
    period: 'month',
    searchTerm: '',
  });
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [internalClientId, setInternalClientId] = useState<string>(selectedClientId || '');
  const [internalProjectId, setInternalProjectId] = useState<string>(selectedProjectId || '');
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchTransactions();
  }, [filters.period, customStartDate, customEndDate, internalClientId, internalProjectId]);

  useEffect(() => {
    applyFilters();
  }, [transactions, filters]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      const { startDate, endDate } = getDateRange();
      
      // Build queries with filters
      let incomesQuery = supabase
        .from('incomes')
        .select(`
          id,
          description,
          amount,
          category,
          invoice_date,
          invoice_number,
          payment_status,
          status_cfdi,
          created_at,
          clients(full_name),
          client_projects(project_name)
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      let expensesQuery = supabase
        .from('expenses')
        .select(`
          id,
          description,
          amount,
          category,
          invoice_date,
          reference_number,
          status_cfdi,
          created_at,
          suppliers(company_name),
          client_projects(project_name)
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Apply filters
      if (internalProjectId) {
        incomesQuery = incomesQuery.eq('project_id', internalProjectId);
        expensesQuery = expensesQuery.eq('project_id', internalProjectId);
      } else if (internalClientId) {
        incomesQuery = incomesQuery.eq('client_id', internalClientId);
        expensesQuery = expensesQuery.eq('client_id', internalClientId);
      }

      // Fetch incomes and expenses in parallel
      const [incomesResult, expensesResult] = await Promise.all([
        incomesQuery.order('created_at', { ascending: false }),
        expensesQuery.order('created_at', { ascending: false })
      ]);

      // Process incomes
      const processedIncomes: TransactionRow[] = (incomesResult.data || []).map(income => ({
        id: income.id,
        date: income.invoice_date || income.created_at,
        type: 'income' as const,
        category: income.category || 'Sin categoría',
        description: income.description,
        amount: income.amount || 0,
        reference: income.invoice_number || undefined,
        client: income.clients?.full_name || undefined,
        project: income.client_projects?.project_name || undefined,
        status: income.payment_status || undefined,
        cfdi_status: income.status_cfdi || undefined
      }));

      // Process expenses
      const processedExpenses: TransactionRow[] = (expensesResult.data || []).map(expense => ({
        id: expense.id,
        date: expense.invoice_date || expense.created_at,
        type: 'expense' as const,
        category: expense.category || 'Sin categoría',
        description: expense.description,
        amount: expense.amount || 0,
        reference: expense.reference_number || undefined,
        supplier: expense.suppliers?.company_name || undefined,
        project: expense.client_projects?.project_name || undefined,
        cfdi_status: expense.status_cfdi || undefined
      }));

      // Combine and sort by date
      const allTransactions = [...processedIncomes, ...processedExpenses]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setTransactions(allTransactions);

      // Extract unique categories
      const uniqueCategories = Array.from(new Set(allTransactions.map(t => t.category)));
      setCategories(uniqueCategories);

    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    
    switch (filters.period) {
      case 'month':
        return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
      case 'quarter':
        const quarterStart = startOfMonth(subMonths(now, 2));
        return { startDate: quarterStart, endDate: endOfMonth(now) };
      case 'year':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return { startDate: yearStart, endDate: new Date(now.getFullYear(), 11, 31) };
      case 'custom':
        return { 
          startDate: customStartDate || startOfMonth(now), 
          endDate: customEndDate || endOfMonth(now) 
        };
      default:
        return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Filter by type
    if (filters.type !== 'all') {
      filtered = filtered.filter(t => t.type === filters.type);
    }

    // Filter by category
    if (filters.category !== 'all') {
      filtered = filtered.filter(t => t.category === filters.category);
    }

    // Filter by search term
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(term) ||
        t.reference?.toLowerCase().includes(term) ||
        t.supplier?.toLowerCase().includes(term) ||
        t.client?.toLowerCase().includes(term) ||
        t.project?.toLowerCase().includes(term)
      );
    }

    // Filter by amount range
    if (filters.minAmount !== undefined) {
      filtered = filtered.filter(t => t.amount >= filters.minAmount!);
    }
    if (filters.maxAmount !== undefined) {
      filtered = filtered.filter(t => t.amount <= filters.maxAmount!);
    }

    setFilteredTransactions(filtered);
  };

  const exportToCSV = () => {
    const headers = [
      'Fecha',
      'Tipo',
      'Categoría',
      'Descripción',
      'Monto',
      'Referencia',
      'Cliente/Proveedor',
      'Proyecto',
      'Estado CFDI'
    ];

    const rows = filteredTransactions.map(t => [
      format(new Date(t.date), 'dd/MM/yyyy'),
      t.type === 'income' ? 'Ingreso' : 'Gasto',
      t.category,
      t.description,
      t.amount.toString(),
      t.reference || '',
      t.client || t.supplier || '',
      t.project || '',
      t.cfdi_status || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transacciones_${format(new Date(), 'yyyy-MM-dd')}.csv`);
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

  const getStatusBadge = (type: 'income' | 'expense', status?: string, cfdiStatus?: string) => {
    if (cfdiStatus) {
      const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
        'pending': 'outline',
        'active': 'default',
        'cancelled': 'destructive'
      };
      return <Badge variant={variants[cfdiStatus] || 'secondary'}>{cfdiStatus}</Badge>;
    }
    
    if (status) {
      const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
        'pending': 'outline',
        'paid': 'default',
        'overdue': 'destructive'
      };
      return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
    }

    return null;
  };

  const getTotals = () => {
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return { totalIncome, totalExpenses, netFlow: totalIncome - totalExpenses };
  };

  const totals = getTotals();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Compact Header with Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Detalle de Transacciones
              </CardTitle>
              <CardDescription className="text-sm">
                Control detallado de ingresos y gastos
              </CardDescription>
            </div>
            <Button onClick={exportToCSV} size="sm">
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
          
          {/* Client-Project Selector */}
          <div className="mt-3">
            <ClientProjectSelector
              selectedClientId={internalClientId}
              selectedProjectId={internalProjectId}
              onClientChange={(clientId) => setInternalClientId(clientId || '')}
              onProjectChange={(projectId) => setInternalProjectId(projectId || '')}
              showAllOption={true}
              showProjectFilter={true}
            />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Compact Filters Row 1 */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <div>
              <label className="text-xs font-medium mb-1 block">Tipo</label>
              <Select
                value={filters.type}
                onValueChange={(value: 'all' | 'income' | 'expense') =>
                  setFilters(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="income">Ingresos</SelectItem>
                  <SelectItem value="expense">Gastos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block">Categoría</label>
              <Select
                value={filters.category}
                onValueChange={(value) =>
                  setFilters(prev => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block">Período</label>
              <Select
                value={filters.period}
                onValueChange={(value: 'month' | 'quarter' | 'year' | 'custom') =>
                  setFilters(prev => ({ ...prev, period: value }))
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Este mes</SelectItem>
                  <SelectItem value="quarter">Trimestre</SelectItem>
                  <SelectItem value="year">Este año</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2 top-1.5 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={filters.searchTerm}
                  onChange={(e) =>
                    setFilters(prev => ({ ...prev, searchTerm: e.target.value }))
                  }
                  className="pl-7 h-8 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Custom Date Range */}
          {filters.period === 'custom' && (
            <div className="grid gap-3 grid-cols-2 mt-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Inicio</label>
                <DatePicker
                  date={customStartDate}
                  onDateChange={setCustomStartDate}
                  placeholder="Fecha inicio"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Fin</label>
                <DatePicker
                  date={customEndDate}
                  onDateChange={setCustomEndDate}
                  placeholder="Fecha fin"
                />
              </div>
            </div>
          )}

          {/* Amount Filters */}
          <div className="grid gap-3 grid-cols-2 mt-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Monto mín.</label>
              <Input
                type="number"
                placeholder="0"
                value={filters.minAmount || ''}
                onChange={(e) =>
                  setFilters(prev => ({ 
                    ...prev, 
                    minAmount: e.target.value ? parseFloat(e.target.value) : undefined 
                  }))
                }
                className="h-8"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Monto máx.</label>
              <Input
                type="number"
                placeholder="Sin límite"
                value={filters.maxAmount || ''}
                onChange={(e) =>
                  setFilters(prev => ({ 
                    ...prev, 
                    maxAmount: e.target.value ? parseFloat(e.target.value) : undefined 
                  }))
                }
                className="h-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compact Summary Cards */}
      <div className="grid gap-3 grid-cols-3">
        <Card className="p-3">
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">{formatCurrency(totals.totalIncome)}</div>
            <div className="text-xs text-muted-foreground">Ingresos ({filteredTransactions.filter(t => t.type === 'income').length})</div>
          </div>
        </Card>

        <Card className="p-3">
          <div className="text-center">
            <div className="text-lg font-bold text-red-600">{formatCurrency(totals.totalExpenses)}</div>
            <div className="text-xs text-muted-foreground">Gastos ({filteredTransactions.filter(t => t.type === 'expense').length})</div>
          </div>
        </Card>

        <Card className="p-3">
          <div className="text-center">
            <div className={`text-lg font-bold ${totals.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totals.netFlow)}
            </div>
            <div className="text-xs text-muted-foreground">Flujo Neto ({filteredTransactions.length})</div>
          </div>
        </Card>
      </div>

      {/* Compact Transactions Display */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Transacciones</CardTitle>
          <CardDescription className="text-sm">
            {filteredTransactions.length} de {transactions.length} registros
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!isMobile ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2 text-xs font-medium">Fecha</th>
                    <th className="text-left p-2 text-xs font-medium">Tipo</th>
                    <th className="text-left p-2 text-xs font-medium">Categoría</th>
                    <th className="text-left p-2 text-xs font-medium">Descripción</th>
                    <th className="text-right p-2 text-xs font-medium">Monto</th>
                    <th className="text-left p-2 text-xs font-medium">Ref.</th>
                    <th className="text-left p-2 text-xs font-medium">Cliente/Prov.</th>
                    <th className="text-left p-2 text-xs font-medium">Proyecto</th>
                    <th className="text-left p-2 text-xs font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredTransactions.map((transaction, index) => (
                    <tr key={transaction.id} className={`${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'} hover:bg-muted/40 transition-colors`}>
                      <td className="p-2 text-xs">
                        {format(new Date(transaction.date), 'dd/MM/yy', { locale: es })}
                      </td>
                      <td className="p-2">
                        <Badge variant={transaction.type === 'income' ? 'default' : 'secondary'} className="text-xs">
                          {transaction.type === 'income' ? 'Ing' : 'Gas'}
                        </Badge>
                      </td>
                      <td className="p-2 text-xs max-w-20 truncate" title={transaction.category}>
                        {transaction.category}
                      </td>
                      <td className="p-2 text-xs max-w-32 truncate" title={transaction.description}>
                        {transaction.description}
                      </td>
                      <td className={`p-2 text-right font-medium text-xs ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </td>
                      <td className="p-2 text-xs max-w-16 truncate" title={transaction.reference}>
                        {transaction.reference || '-'}
                      </td>
                      <td className="p-2 text-xs max-w-20 truncate" title={transaction.client || transaction.supplier}>
                        {transaction.client || transaction.supplier || '-'}
                      </td>
                      <td className="p-2 text-xs max-w-20 truncate" title={transaction.project}>
                        {transaction.project || '-'}
                      </td>
                      <td className="p-2">
                        {getStatusBadge(transaction.type, transaction.status, transaction.cfdi_status)}
                      </td>
                    </tr>
                  ))}
                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-6 text-muted-foreground text-sm">
                        No se encontraron transacciones
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Mobile Cards */
            <div className="divide-y">
              {filteredTransactions.map((transaction) => (
                <div key={transaction.id} className="p-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={transaction.type === 'income' ? 'default' : 'secondary'} className="text-xs">
                          {transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(transaction.date), 'dd/MM/yy', { locale: es })}
                        </span>
                      </div>
                      <h4 className="font-medium text-sm truncate">{transaction.description}</h4>
                      <div className="text-xs text-muted-foreground">
                        {transaction.category} • {transaction.client || transaction.supplier || 'N/A'}
                      </div>
                    </div>
                    <div className="text-right ml-3">
                      <div className={`font-bold text-lg ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </div>
                      {transaction.status && getStatusBadge(transaction.type, transaction.status, transaction.cfdi_status)}
                    </div>
                  </div>
                </div>
              ))}
              {filteredTransactions.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No se encontraron transacciones
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DetailedTransactionsTable;