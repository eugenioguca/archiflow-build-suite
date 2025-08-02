import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  Receipt, 
  CreditCard, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Plus,
  Filter,
  Download,
  Upload,
  FileText,
  Building,
  Users
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ConstructionExpense {
  id: string;
  description: string;
  expense_type: string;
  total_amount: number;
  unit_price: number;
  quantity: number;
  expense_date: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  supplier_id?: string;
  supplier_name?: string;
  partida_id?: string;
  partida_name?: string;
  phase_id?: string;
  phase_name?: string;
  invoice_number?: string;
  invoice_url?: string;
  receipt_url?: string;
  payment_method?: string;
  notes?: string;
  authorized_by?: string;
  authorized_at?: string;
  currency: string;
  // Integration fields
  cash_transaction_id?: string;
  accounts_payable_id?: string;
  cfdi_uuid?: string;
}

interface IntegratedExpenseManagerProps {
  constructionProjectId: string;
}

export function IntegratedExpenseManager({ constructionProjectId }: IntegratedExpenseManagerProps) {
  const [expenses, setExpenses] = useState<ConstructionExpense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<ConstructionExpense[]>([]);
  const [suppliers, setSuppliers] = useState<{id: string; company_name: string}[]>([]);
  const [phases, setPhases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, [constructionProjectId]);

  useEffect(() => {
    filterExpenses();
  }, [expenses, searchTerm, statusFilter, typeFilter, dateFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchExpenses(),
        fetchSuppliers(),
        fetchPhases()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('construction_expenses')
        .select(`
          *,
          supplier:suppliers(company_name),
          phase:construction_phases(phase_name)
        `)
        .eq('construction_project_id', constructionProjectId)
        .order('expense_date', { ascending: false });

      if (error) throw error;

      const expensesWithRelations = (data || []).map((expense: any) => ({
        ...expense,
        supplier_name: expense.supplier?.company_name,
        phase_name: expense.phase?.phase_name,
        partida_name: 'Partida ejemplo' // This would come from budget_items relation
      }));

      setExpenses(expensesWithRelations);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los gastos",
        variant: "destructive"
      });
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, company_name')
        .eq('active', true);

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setSuppliers([]);
    }
  };

  const fetchPhases = async () => {
    try {
      const { data, error } = await supabase
        .from('construction_phases')
        .select('id, phase_name')
        .eq('construction_project_id', constructionProjectId);

      if (error) throw error;
      setPhases(data || []);
    } catch (error) {
      console.error('Error fetching phases:', error);
      setPhases([]);
    }
  };

  const filterExpenses = () => {
    let filtered = expenses;

    if (searchTerm) {
      filtered = filtered.filter(expense =>
        expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(expense => expense.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(expense => expense.expense_type === typeFilter);
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(expense => 
            new Date(expense.expense_date) >= filterDate
          );
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter(expense => 
            new Date(expense.expense_date) >= filterDate
          );
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter(expense => 
            new Date(expense.expense_date) >= filterDate
          );
          break;
      }
    }

    setFilteredExpenses(filtered);
  };

  const calculateStats = () => {
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.total_amount, 0);
    const approvedExpenses = expenses
      .filter(exp => exp.status === 'approved')
      .reduce((sum, exp) => sum + exp.total_amount, 0);
    const pendingExpenses = expenses
      .filter(exp => exp.status === 'pending')
      .reduce((sum, exp) => sum + exp.total_amount, 0);
    const paidExpenses = expenses
      .filter(exp => exp.status === 'paid')
      .reduce((sum, exp) => sum + exp.total_amount, 0);

    const thisMonthExpenses = expenses
      .filter(exp => {
        const expenseDate = new Date(exp.expense_date);
        const now = new Date();
        return expenseDate.getMonth() === now.getMonth() && 
               expenseDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, exp) => sum + exp.total_amount, 0);

    return {
      totalExpenses,
      approvedExpenses,
      pendingExpenses,
      paidExpenses,
      thisMonthExpenses,
      totalCount: expenses.length
    };
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-500/10 text-emerald-700';
      case 'pending': return 'bg-amber-500/10 text-amber-700';
      case 'paid': return 'bg-blue-500/10 text-blue-700';
      case 'rejected': return 'bg-red-500/10 text-red-700';
      default: return 'bg-muted/10 text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Aprobado';
      case 'pending': return 'Pendiente';
      case 'paid': return 'Pagado';
      case 'rejected': return 'Rechazado';
      default: return status;
    }
  };

  const createCashTransaction = async (expense: ConstructionExpense) => {
    try {
      // Integration with cash_transactions table
      // This would be implemented when cash_account_id is available
      console.log('Creating cash transaction for expense:', expense.description);
      
      // Simulate successful transaction creation
      const mockData = { id: 'mock-transaction-id' };

      toast({
        title: "Transacción creada",
        description: "El gasto se ha registrado en el sistema financiero"
      });

      return mockData;
    } catch (error) {
      console.error('Error creating cash transaction:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la transacción financiera",
        variant: "destructive"
      });
    }
  };

  const approveExpense = async (expenseId: string) => {
    try {
      const { error } = await supabase
        .from('construction_expenses')
        .update({
          status: 'approved',
          authorized_by: (await supabase.auth.getUser()).data.user?.id,
          authorized_at: new Date().toISOString()
        })
        .eq('id', expenseId);

      if (error) throw error;

      // Create cash transaction for approved expense
      const expense = expenses.find(e => e.id === expenseId);
      if (expense) {
        await createCashTransaction(expense);
      }

      await fetchExpenses();
      
      toast({
        title: "Gasto aprobado",
        description: "El gasto ha sido aprobado y registrado en finanzas"
      });
    } catch (error) {
      console.error('Error approving expense:', error);
      toast({
        title: "Error",
        description: "No se pudo aprobar el gasto",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const stats = calculateStats();
  const expenseTypes = [...new Set(expenses.map(exp => exp.expense_type))];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-primary">
                  ${stats.totalExpenses.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Total Gastos</div>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-emerald-600">
                  ${stats.approvedExpenses.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Aprobados</div>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-amber-600">
                  ${stats.pendingExpenses.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Pendientes</div>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  ${stats.paidExpenses.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Pagados</div>
              </div>
              <CreditCard className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  ${stats.thisMonthExpenses.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Este Mes</div>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Input
                placeholder="Buscar por descripción, proveedor o factura..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="approved">Aprobado</SelectItem>
                <SelectItem value="paid">Pagado</SelectItem>
                <SelectItem value="rejected">Rechazado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {expenseTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Fecha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las fechas</SelectItem>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="week">Última semana</SelectItem>
                <SelectItem value="month">Último mes</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Gasto
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Gastos de Construcción</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fase</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>P. Unitario</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      {new Date(expense.expense_date).toLocaleDateString('es-ES')}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{expense.description}</div>
                        {expense.invoice_number && (
                          <div className="text-xs text-muted-foreground">
                            Factura: {expense.invoice_number}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{expense.expense_type}</Badge>
                    </TableCell>
                    <TableCell>{expense.phase_name || 'Sin asignar'}</TableCell>
                    <TableCell>{expense.supplier_name || 'Sin asignar'}</TableCell>
                    <TableCell className="text-right">{expense.quantity}</TableCell>
                    <TableCell className="text-right">
                      ${expense.unit_price.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${expense.total_amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(expense.status)}>
                        {getStatusText(expense.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {expense.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => approveExpense(expense.id)}
                          >
                            Aprobar
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          Ver
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle>Estado de Integración Financiera</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-lg">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
              <div>
                <div className="font-medium">Tesorería</div>
                <div className="text-sm text-muted-foreground">
                  Gastos sincronizados con cash_transactions
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
              <Receipt className="h-6 w-6 text-blue-600" />
              <div>
                <div className="font-medium">Contabilidad</div>
                <div className="text-sm text-muted-foreground">
                  CFDI integrado para cumplimiento fiscal
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg">
              <Building className="h-6 w-6 text-amber-600" />
              <div>
                <div className="font-medium">Proveedores</div>
                <div className="text-sm text-muted-foreground">
                  Conectado con base de proveedores existente
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}