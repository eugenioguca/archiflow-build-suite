import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { ClientProjectSelector } from '@/components/ClientProjectSelector';
import { Plus, Eye, Edit, Trash2, Receipt, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';

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
  [key: string]: any;
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
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchExpenses();
  }, [refreshTrigger, internalClientId, internalProjectId]);

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

  const summary = {
    count: expenses.length,
    total: expenses.reduce((sum, expense) => sum + expense.amount, 0),
    categories: [...new Set(expenses.map(e => e.category))].length
  };

  return (
    <div className="w-full max-w-full space-y-4">
      {/* Compact Header with Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Gastos</CardTitle>
              <CardDescription className="text-sm">Gestión de gastos empresariales</CardDescription>
            </div>
            <Button onClick={onNewExpense} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Gasto
            </Button>
          </div>
          
          {/* Compact Filters */}
          <div className="mt-3">
            <ClientProjectSelector
              selectedClientId={internalClientId}
              selectedProjectId={internalProjectId}
              onClientChange={handleClientChange}
              onProjectChange={handleProjectChange}
              showAllOption={true}
              showProjectFilter={true}
            />
          </div>

          {/* Compact Summary */}
          {(internalClientId || internalProjectId) && (
            <div className="grid grid-cols-3 gap-3 mt-3 p-3 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-bold text-primary">{summary.count}</div>
                <div className="text-xs text-muted-foreground">Gastos</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{formatCurrency(summary.total)}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{summary.categories}</div>
                <div className="text-xs text-muted-foreground">Categorías</div>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8 px-4">
              <div className="text-muted-foreground mb-4">
                {(internalClientId || internalProjectId) 
                  ? 'No hay gastos para esta selección'
                  : 'No hay gastos registrados'
                }
              </div>
              <Button onClick={onNewExpense} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Agregar primer gasto
              </Button>
            </div>
          ) : (
            <div className="w-full">
              {/* Desktop Table */}
              {!isMobile ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium">Descripción</th>
                        <th className="text-left p-3 text-sm font-medium">Categoría</th>
                        <th className="text-right p-3 text-sm font-medium">Monto</th>
                        <th className="text-left p-3 text-sm font-medium">Proveedor</th>
                        <th className="text-left p-3 text-sm font-medium">Estado</th>
                        <th className="text-left p-3 text-sm font-medium">Fecha</th>
                        <th className="text-center p-3 text-sm font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {expenses.map((expense, index) => (
                        <tr key={expense.id} className={`${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'} hover:bg-muted/40 transition-colors`}>
                          <td className="p-3">
                            <div className="space-y-1">
                              <div className="font-medium text-sm">{expense.description}</div>
                              {expense.invoice_number && (
                                <div className="text-xs text-muted-foreground">#{expense.invoice_number}</div>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs">{getCategoryLabel(expense.category)}</Badge>
                          </td>
                          <td className="p-3 text-right">
                            <div className="font-semibold text-sm">{formatCurrency(expense.amount)}</div>
                          </td>
                          <td className="p-3">
                            <div className="text-sm">{expense.suppliers?.company_name || 'N/A'}</div>
                          </td>
                          <td className="p-3">
                            {expense.status && getStatusBadge(expense.status)}
                          </td>
                          <td className="p-3">
                            <div className="text-sm">
                              {format(new Date(expense.created_at), 'dd/MM/yyyy', { locale: es })}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex justify-center gap-1">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Mobile Cards */
                <div className="divide-y">
                  {expenses.map((expense) => (
                    <div key={expense.id} className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{expense.description}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{getCategoryLabel(expense.category)}</Badge>
                            {expense.status && getStatusBadge(expense.status)}
                          </div>
                        </div>
                        <div className="text-right ml-3">
                          <div className="font-bold text-lg">{formatCurrency(expense.amount)}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(expense.created_at), 'dd/MM/yyyy', { locale: es })}
                          </div>
                        </div>
                      </div>
                      
                      {expense.suppliers?.company_name && (
                        <div className="text-sm text-muted-foreground">
                          Proveedor: {expense.suppliers.company_name}
                        </div>
                      )}
                      
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseTable;