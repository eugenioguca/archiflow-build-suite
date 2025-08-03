import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { ClientProjectSelector } from '@/components/ClientProjectSelector';
import { Plus, Eye, Edit, Trash2, Receipt, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  expense_date?: string | null;
  invoice_number?: string | null;
  status?: string;
  created_at: string;
  suppliers?: { company_name: string } | null;
  client_projects?: { project_name: string } | null;
  clients?: { full_name: string } | null;
  [key: string]: any; // Para campos adicionales de la base de datos
}

interface ExpenseTableProps {
  onNewExpense: () => void;
  refreshTrigger?: number;
  selectedClientId?: string;
  selectedProjectId?: string;
  onClientChange?: (clientId: string | undefined) => void;
  onProjectChange?: (projectId: string | undefined) => void;
}

const ExpenseTable: React.FC<ExpenseTableProps> = ({ 
  onNewExpense, 
  refreshTrigger, 
  selectedClientId,
  selectedProjectId,
  onClientChange,
  onProjectChange 
}) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [internalClientId, setInternalClientId] = useState<string | undefined>(selectedClientId);
  const [internalProjectId, setInternalProjectId] = useState<string | undefined>(selectedProjectId);

  useEffect(() => {
    fetchExpenses();
  }, [refreshTrigger, internalClientId, internalProjectId]);

  // Manejar cambios externos de filtros
  useEffect(() => {
    setInternalClientId(selectedClientId);
  }, [selectedClientId]);

  useEffect(() => {
    setInternalProjectId(selectedProjectId);
  }, [selectedProjectId]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('expenses')
        .select(`
          *,
          suppliers (company_name),
          clients (full_name),
          client_projects (project_name)
        `)
        .order('created_at', { ascending: false });

      // Aplicar filtros si están seleccionados
      if (internalClientId) {
        query = query.eq('client_id', internalClientId);
      }
      
      if (internalProjectId) {
        query = query.eq('project_id', internalProjectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setExpenses((data || []) as Expense[]);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const getCategoryLabel = (category: string) => {
    const categories = {
      construction: 'Construcción',
      design: 'Diseño',
      administration: 'Administrativos',
      materials: 'Materiales',
      labor: 'Mano de Obra',
      equipment: 'Equipo',
      sales: 'Ventas',
      marketing: 'Marketing',
      legal: 'Legal',
      financial: 'Financieros',
      maintenance: 'Mantenimiento',
      utilities: 'Servicios',
      travel: 'Viajes',
      office: 'Oficina',
      other: 'Otros'
    };
    return categories[category as keyof typeof categories] || category;
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: 'Pendiente', variant: 'secondary' as const },
      approved: { label: 'Aprobado', variant: 'default' as const },
      rejected: { label: 'Rechazado', variant: 'destructive' as const },
      paid: { label: 'Pagado', variant: 'default' as const }
    };
    
    const config = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'secondary' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleClientChange = (clientId: string | undefined) => {
    setInternalClientId(clientId);
    onClientChange?.(clientId);
  };

  const handleProjectChange = (projectId: string | undefined) => {
    setInternalProjectId(projectId);
    onProjectChange?.(projectId);
  };

  const getFilterSummary = () => {
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const expenseCount = expenses.length;
    
    return {
      count: expenseCount,
      total: totalExpenses,
      categories: [...new Set(expenses.map(e => e.category))].length
    };
  };

  const summary = getFilterSummary();

  return (
    <div className="space-y-6">
      {/* Selector Cliente-Proyecto */}
      <ClientProjectSelector
        selectedClientId={internalClientId}
        selectedProjectId={internalProjectId}
        onClientChange={handleClientChange}
        onProjectChange={handleProjectChange}
        showAllOption={true}
        showProjectFilter={true}
      />

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Gastos y Egresos</CardTitle>
              <CardDescription>
                Gestión de gastos empresariales y seguimiento de egresos
                {(internalClientId || internalProjectId) && (
                  <span className="block text-sm text-primary mt-1">
                    Filtrado por {internalClientId ? 'cliente' : ''}{internalClientId && internalProjectId ? ' y ' : ''}{internalProjectId ? 'proyecto' : ''} seleccionado
                  </span>
                )}
              </CardDescription>
            </div>
            <Button onClick={onNewExpense}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Gasto
            </Button>
          </div>
          
          {/* Resumen de filtros */}
          {(internalClientId || internalProjectId) && (
            <div className="grid grid-cols-3 gap-4 mt-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{summary.count}</div>
                <div className="text-sm text-muted-foreground">Gastos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.total)}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.categories}</div>
                <div className="text-sm text-muted-foreground">Categorías</div>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground mb-4">
                {(internalClientId || internalProjectId) 
                  ? 'No hay gastos registrados para esta selección'
                  : 'No hay gastos registrados'
                }
              </div>
              <Button onClick={onNewExpense} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                {(internalClientId || internalProjectId) 
                  ? 'Registrar Gasto para esta Selección'
                  : 'Registrar Primer Gasto'
                }
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Proyecto</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{expense.description}</div>
                          {expense.invoice_number && (
                            <div className="text-sm text-muted-foreground">
                              Factura: {expense.invoice_number}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono font-medium">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getCategoryLabel(expense.category)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {expense.clients?.full_name || '-'}
                      </TableCell>
                      <TableCell>
                        {expense.client_projects?.project_name || '-'}
                      </TableCell>
                      <TableCell>
                        {expense.suppliers?.company_name || '-'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(expense.status || 'pending')}
                      </TableCell>
                      <TableCell>
                        {expense.expense_date 
                          ? format(new Date(expense.expense_date), 'dd/MMM/yyyy', { locale: es })
                          : format(new Date(expense.created_at), 'dd/MMM/yyyy', { locale: es })
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

export default ExpenseTable;