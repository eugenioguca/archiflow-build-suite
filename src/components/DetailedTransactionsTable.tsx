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

      {/* Header and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Detalle de Transacciones
          </CardTitle>
          <CardDescription>
            Control detallado de todos los ingresos y gastos de la empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Type Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo</label>
              <Select
                value={filters.type}
                onValueChange={(value: 'all' | 'income' | 'expense') =>
                  setFilters(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="income">Ingresos</SelectItem>
                  <SelectItem value="expense">Gastos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Categoría</label>
              <Select
                value={filters.category}
                onValueChange={(value) =>
                  setFilters(prev => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger>
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

            {/* Period Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Período</label>
              <Select
                value={filters.period}
                onValueChange={(value: 'month' | 'quarter' | 'year' | 'custom') =>
                  setFilters(prev => ({ ...prev, period: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Este mes</SelectItem>
                  <SelectItem value="quarter">Este trimestre</SelectItem>
                  <SelectItem value="year">Este año</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div>
              <label className="text-sm font-medium mb-2 block">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Descripción, referencia..."
                  value={filters.searchTerm}
                  onChange={(e) =>
                    setFilters(prev => ({ ...prev, searchTerm: e.target.value }))
                  }
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          {/* Custom Date Range - only show when period is 'custom' */}
          {filters.period === 'custom' && (
            <div className="grid gap-4 md:grid-cols-2 mt-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Fecha de inicio</label>
                <DatePicker
                  date={customStartDate}
                  onDateChange={setCustomStartDate}
                  placeholder="Seleccionar fecha inicio"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Fecha de fin</label>
                <DatePicker
                  date={customEndDate}
                  onDateChange={setCustomEndDate}
                  placeholder="Seleccionar fecha fin"
                />
              </div>
            </div>
          )}

          {/* Amount Filters */}
          <div className="grid gap-4 md:grid-cols-3 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Monto mínimo</label>
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
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Monto máximo</label>
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
              />
            </div>
            <div className="flex items-end">
              <Button onClick={exportToCSV} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Total Ingresos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totals.totalIncome)}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredTransactions.filter(t => t.type === 'income').length} transacciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Total Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totals.totalExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredTransactions.filter(t => t.type === 'expense').length} transacciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Flujo Neto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totals.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totals.netFlow)}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredTransactions.length} transacciones totales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Transacciones</CardTitle>
          <CardDescription>
            Mostrando {filteredTransactions.length} de {transactions.length} transacciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Cliente/Proveedor</TableHead>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {format(new Date(transaction.date), 'dd/MM/yyyy', { locale: es })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={transaction.type === 'income' ? 'default' : 'secondary'}>
                        {transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                      </Badge>
                    </TableCell>
                    <TableCell>{transaction.category}</TableCell>
                    <TableCell className="max-w-xs truncate" title={transaction.description}>
                      {transaction.description}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell>{transaction.reference || '-'}</TableCell>
                    <TableCell>{transaction.client || transaction.supplier || '-'}</TableCell>
                    <TableCell>{transaction.project || '-'}</TableCell>
                    <TableCell>
                      {getStatusBadge(transaction.type, transaction.status, transaction.cfdi_status)}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTransactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No se encontraron transacciones con los filtros aplicados
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

export default DetailedTransactionsTable;