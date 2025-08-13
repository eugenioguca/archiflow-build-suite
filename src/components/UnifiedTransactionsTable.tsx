import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { Search, ArrowUpDown, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Transaction {
  id: string;
  fecha: string;
  referencia_unica: string;
  tipo_movimiento: string;
  monto: number;
  departamento: string;
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

export function UnifiedTransactionsTable() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartamento, setFilterDepartamento] = useState("");
  const [filterTipoMovimiento, setFilterTipoMovimiento] = useState("");
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("unified_financial_transactions")
        .select(`
          *,
          branch_offices(name),
          client_projects(project_name, clients(full_name)),
          chart_of_accounts_mayor(nombre, codigo),
          chart_of_accounts_partidas(nombre, codigo),
          chart_of_accounts_subpartidas(nombre, codigo)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter((transaction) => {
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

  const departamentos = [
    { value: "ventas", label: "Ventas" },
    { value: "diseño", label: "Diseño" },
    { value: "construccion", label: "Construcción" },
    { value: "finanzas", label: "Finanzas" },
    { value: "contabilidad", label: "Contabilidad" },
    { value: "recursos_humanos", label: "Recursos Humanos" },
    { value: "direccion_general", label: "Dirección General" },
  ];

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
    return <div className="text-center py-8">Cargando transacciones...</div>;
  }

  return (
    <div className="space-y-4">
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
              {isDeleting ? "Eliminando..." : `Confirmar (${selectedTransactions.length})`}
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
              <TableHead>Factura</TableHead>
              <TableHead>Descripción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isDeleteMode ? 13 : 12} className="text-center py-8 text-muted-foreground">
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
}