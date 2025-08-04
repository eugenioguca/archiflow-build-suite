import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Search, Filter, DollarSign, TrendingUp, TrendingDown, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CashTransaction {
  id: string;
  transaction_type: string;
  transaction_date: string;
  amount: number;
  description: string;
  cuenta_mayor: string;
  partida: string;
  department: string;
  status: string;
  invoice_number?: string;
  client_name?: string;
  project_name?: string;
  supplier_name?: string;
  cash_account_name?: string;
  payment_reference?: string;
}

interface CashTransactionsTableProps {
  selectedClientId?: string;
  selectedProjectId?: string;
}

export const CashTransactionsTable: React.FC<CashTransactionsTableProps> = ({
  selectedClientId,
  selectedProjectId
}) => {
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchTransactions();
  }, [selectedClientId, selectedProjectId]);

  const fetchTransactions = async () => {
    try {
      let query = supabase
        .from('treasury_transactions')
        .select(`
          *,
          clients (full_name),
          client_projects (project_name),
          suppliers (company_name),
          cash_accounts (name),
          treasury_payment_references (reference_code)
        `)
        .eq('account_type', 'cash')
        .order('transaction_date', { ascending: false });

      if (selectedClientId) {
        query = query.eq('client_id', selectedClientId);
      }
      if (selectedProjectId) {
        query = query.eq('project_id', selectedProjectId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedTransactions: CashTransaction[] = (data || []).map((transaction: any) => ({
        id: transaction.id,
        transaction_type: transaction.transaction_type,
        transaction_date: transaction.transaction_date,
        amount: transaction.amount,
        description: transaction.description,
        cuenta_mayor: transaction.cuenta_mayor,
        partida: transaction.partida,
        department: transaction.department,
        status: transaction.status,
        invoice_number: transaction.invoice_number,
        client_name: transaction.clients?.full_name,
        project_name: transaction.client_projects?.project_name,
        supplier_name: transaction.suppliers?.company_name,
        cash_account_name: transaction.cash_accounts?.name,
        payment_reference: transaction.treasury_payment_references?.reference_code
      }));

      setTransactions(formattedTransactions);
    } catch (error) {
      console.error('Error fetching cash transactions:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las transacciones de efectivo",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = searchTerm === "" || 
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === "all" || transaction.transaction_type === filterType;
    const matchesStatus = filterStatus === "all" || transaction.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pendiente", variant: "secondary" as const },
      approved: { label: "Aprobado", variant: "default" as const },
      completed: { label: "Completado", variant: "default" as const },
      pending_payment: { label: "Pago Pendiente", variant: "destructive" as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
      { label: status, variant: "secondary" as const };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTransactionIcon = (type: string) => {
    return type === 'income' ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  const getDepartmentLabel = (department: string) => {
    const departments: Record<string, string> = {
      ventas: "Ventas",
      diseño: "Diseño", 
      construccion: "Construcción",
      finanzas: "Finanzas",
      contabilidad: "Contabilidad",
      direccion_general: "Dirección General"
    };
    return departments[department] || department;
  };

  // Calculate totals
  const totalIncome = filteredTransactions
    .filter(t => t.transaction_type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = filteredTransactions
    .filter(t => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netFlow = totalIncome - totalExpenses;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ingresos en Efectivo</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Egresos en Efectivo</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Flujo Neto</p>
                <p className={`text-2xl font-bold ${netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(netFlow)}
                </p>
              </div>
              <DollarSign className={`h-8 w-8 ${netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros y Búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar transacciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de transacción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="income">Ingresos</SelectItem>
                <SelectItem value="expense">Egresos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="approved">Aprobado</SelectItem>
                <SelectItem value="completed">Completado</SelectItem>
                <SelectItem value="pending_payment">Pago Pendiente</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => {
              setSearchTerm("");
              setFilterType("all");
              setFilterStatus("all");
            }}>
              <Filter className="h-4 w-4 mr-2" />
              Limpiar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Movimientos de Efectivo ({filteredTransactions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No se encontraron transacciones de efectivo</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cuenta</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Cliente/Proveedor</TableHead>
                    <TableHead>Proyecto</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Partida</TableHead>
                    <TableHead>Factura</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Referencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          {formatDate(transaction.transaction_date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(transaction.transaction_type)}
                          <Badge variant={transaction.transaction_type === 'income' ? 'default' : 'destructive'}>
                            {transaction.transaction_type === 'income' ? 'Ingreso' : 'Egreso'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{transaction.cash_account_name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate" title={transaction.description}>
                          {transaction.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        {transaction.transaction_type === 'income' 
                          ? transaction.client_name 
                          : transaction.supplier_name}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate" title={transaction.project_name}>
                          {transaction.project_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getDepartmentLabel(transaction.department)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm">{transaction.cuenta_mayor}</div>
                          <div className="text-xs text-muted-foreground">{transaction.partida}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {transaction.invoice_number ? (
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            <span className="text-xs">{transaction.invoice_number}</span>
                          </div>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Sin factura
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-bold ${
                          transaction.transaction_type === 'income' 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {transaction.transaction_type === 'income' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(transaction.status)}
                      </TableCell>
                      <TableCell>
                        {transaction.payment_reference && (
                          <Badge variant="outline" className="text-xs">
                            {transaction.payment_reference}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};