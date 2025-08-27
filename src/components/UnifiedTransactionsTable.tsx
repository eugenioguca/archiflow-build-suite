import { useState, useEffect, forwardRef, useImperativeHandle, useCallback, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { Search, ArrowUpDown, Trash2, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Transaction {
  id: string;
  fecha: string;
  referencia_unica: string;
  tipo_movimiento: string;
  monto: number;
  departamento: string;
  unidad: string;
  cantidad_requerida: number;
  descripcion?: string;
  tiene_factura: boolean;
  folio_factura?: string;
  branch_offices?: { name: string };
  client_projects?: { project_name: string; clients?: { full_name: string } };
  chart_of_accounts_mayor?: { nombre: string; codigo: string };
  chart_of_accounts_partidas?: { nombre: string; codigo: string };
  chart_of_accounts_subpartidas?: { nombre: string; codigo: string };
}

interface BulkDeleteResult {
  success: boolean;
  deleted_count?: number;
  message?: string;
  error?: string;
}

export const UnifiedTransactionsTable = forwardRef<{ refreshData: () => void }, {}>((props, ref) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartamento, setFilterDepartamento] = useState("");
  const [filterTipoMovimiento, setFilterTipoMovimiento] = useState("");
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [departamentos, setDepartamentos] = useState<{value: string, label: string}[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    loadTransactions();
    loadDepartamentos();
  }, []);

  const refreshData = useCallback(async () => {
    await loadTransactions();
    setLastRefresh(new Date());
  }, []);

  useImperativeHandle(ref, () => ({
    refreshData,
  }));

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("unified_financial_transactions")
        .select(`
          id,
          fecha,
          referencia_unica,
          tipo_movimiento,
          monto,
          departamento,
          unidad,
          cantidad_requerida,
          descripcion,
          tiene_factura,
          folio_factura,
          branch_offices(name),
          client_projects(
            project_name,
            clients(full_name)
          ),
          chart_of_accounts_mayor(nombre, codigo),
          chart_of_accounts_partidas(nombre, codigo),
          chart_of_accounts_subpartidas(nombre, codigo)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setTransactions(data || []);
      
      if (data && data.length === 0) {
        setError("No se encontraron transacciones");
      }
    } catch (error: any) {
      console.error("Error loading transactions:", error);
      setError(error.message || "Error al cargar transacciones");
      toast.error("Error al cargar transacciones");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDepartamentos = async () => {
    try {
      const { data } = await supabase
        .from("chart_of_accounts_departamentos")
        .select("departamento")
        .eq("activo", true)
        .order("departamento");
      
      if (data) {
        const formattedDepartamentos = data.map(dept => ({
          value: dept.departamento,
          label: dept.departamento.charAt(0).toUpperCase() + dept.departamento.slice(1).replace(/_/g, ' ')
        }));
        setDepartamentos(formattedDepartamentos);
      }
    } catch (error) {
      console.error("Error loading departamentos:", error);
    }
  };

  // Memoized filtered transactions for performance
  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const matchesSearch = 
        transaction.referencia_unica.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.folio_factura?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDepartamento = 
        !filterDepartamento || filterDepartamento === "all" || transaction.departamento === filterDepartamento;
      
      const matchesTipoMovimiento = 
        !filterTipoMovimiento || filterTipoMovimiento === "all" || transaction.tipo_movimiento === filterTipoMovimiento;

      return matchesSearch && matchesDepartamento && matchesTipoMovimiento;
    });
  }, [transactions, searchTerm, filterDepartamento, filterTipoMovimiento]);

  // departamentos now loaded dynamically from state

  const handleDeleteModeToggle = () => {
    setIsDeleteMode(!isDeleteMode);
    setSelectedTransactions([]);
  };

  const handleTransactionSelect = (transactionId: string, checked: boolean) => {
    if (checked) {
      setSelectedTransactions([...selectedTransactions, transactionId]);
    } else {
      setSelectedTransactions(selectedTransactions.filter(id => id !== transactionId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTransactions(filteredTransactions.map(t => t.id));
    } else {
      setSelectedTransactions([]);
    }
  };

  const handleConfirmDelete = async () => {
    if (selectedTransactions.length === 0) {
      toast.error("Selecciona al menos una transacción para borrar");
      return;
    }

    setIsDeleting(true);
    
    try {
      // Usar la nueva función segura de eliminación masiva
      const { data: result, error } = await supabase.rpc(
        'bulk_delete_unified_transactions',
        { transaction_ids: selectedTransactions }
      );

      if (error) throw error;

      const typedResult = result as unknown as BulkDeleteResult;
      if (typedResult?.success) {
        toast.success(typedResult.message || `${typedResult.deleted_count} transacciones eliminadas exitosamente`);
        setSelectedTransactions([]);
        setIsDeleteMode(false);
        loadTransactions(); // Refresh the data
      } else {
        toast.error(typedResult?.error || "Error al eliminar las transacciones");
      }
    } catch (error: any) {
      console.error('Error deleting transactions:', error);
      toast.error(error.message || "Error al eliminar las transacciones");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-[200px]" />
          <Skeleton className="h-10 w-[150px]" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error && transactions.length === 0) {
    return (
      <Alert>
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={refreshData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {filteredTransactions.length} de {transactions.length} transacciones
          {filteredTransactions.length !== transactions.length && " (filtradas)"}
        </span>
        <span>Última actualización: {format(lastRefresh, "HH:mm:ss", { locale: es })}</span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por referencia, descripción o folio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterDepartamento} onValueChange={setFilterDepartamento}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los departamentos</SelectItem>
              {departamentos.map((dept) => (
                <SelectItem key={dept.value} value={dept.value}>
                  {dept.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterTipoMovimiento} onValueChange={setFilterTipoMovimiento}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Movimiento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ingreso">Ingreso</SelectItem>
              <SelectItem value="egreso">Egreso</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            variant={isDeleteMode ? "destructive" : "outline"}
            onClick={handleDeleteModeToggle}
            size="sm"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          {isDeleteMode && (
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={selectedTransactions.length === 0 || isDeleting}
              size="sm"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Eliminando...
                </>
              ) : (
                `Confirmar (${selectedTransactions.length})`
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              {isDeleteMode && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedTransactions.length === filteredTransactions.length && filteredTransactions.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
              )}
              <TableHead>Fecha</TableHead>
              <TableHead>Referencia</TableHead>
              <TableHead>Sucursal</TableHead>
              <TableHead>Proyecto</TableHead>
              <TableHead>Movimiento</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Mayor</TableHead>
              <TableHead>Partida</TableHead>
              <TableHead>Subpartida</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead>Factura</TableHead>
              <TableHead>Descripción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isDeleteMode ? 15 : 14} className="text-center py-8 text-muted-foreground">
                  No se encontraron transacciones
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  {isDeleteMode && (
                    <TableCell>
                      <Checkbox
                        checked={selectedTransactions.includes(transaction.id)}
                        onCheckedChange={(checked) => handleTransactionSelect(transaction.id, checked as boolean)}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    {format(new Date(transaction.fecha), "dd/MM/yyyy", { locale: es })}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {transaction.referencia_unica}
                  </TableCell>
                  <TableCell>
                    {transaction.branch_offices?.name || "-"}
                  </TableCell>
                  <TableCell>
                    {transaction.client_projects ? (
                      <div>
                        <div className="font-medium">{transaction.client_projects.project_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {transaction.client_projects.clients?.full_name}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Solo Empresa</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={transaction.tipo_movimiento === "ingreso" ? "default" : "destructive"}
                    >
                      {transaction.tipo_movimiento === "ingreso" ? "Ingreso" : "Egreso"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${transaction.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="capitalize">
                    {transaction.departamento.replace("_", " ")}
                  </TableCell>
                  <TableCell>
                    {transaction.chart_of_accounts_mayor ? (
                      <div className="text-sm">
                        <div>{transaction.chart_of_accounts_mayor.codigo}</div>
                        <div className="text-muted-foreground">
                          {transaction.chart_of_accounts_mayor.nombre}
                        </div>
                      </div>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    {transaction.chart_of_accounts_partidas ? (
                      <div className="text-sm">
                        <div>{transaction.chart_of_accounts_partidas.codigo}</div>
                        <div className="text-muted-foreground">
                          {transaction.chart_of_accounts_partidas.nombre}
                        </div>
                      </div>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    {transaction.chart_of_accounts_subpartidas ? (
                      <div className="text-sm">
                        <div>{transaction.chart_of_accounts_subpartidas.codigo}</div>
                        <div className="text-muted-foreground">
                          {transaction.chart_of_accounts_subpartidas.nombre}
                        </div>
                      </div>
                    ) : "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="px-2 py-1 bg-muted rounded text-sm font-medium">
                      {transaction.unidad || 'PZA'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {transaction.cantidad_requerida || 1}
                  </TableCell>
                  <TableCell>
                    {transaction.tiene_factura ? (
                      <div>
                        <Badge variant="outline">Con Factura</Badge>
                        {transaction.folio_factura && (
                          <div className="text-sm text-muted-foreground">
                            {transaction.folio_factura}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Badge variant="secondary">Sin Factura</Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {transaction.descripcion || "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
});

UnifiedTransactionsTable.displayName = "UnifiedTransactionsTable";