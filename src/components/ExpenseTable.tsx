import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Eye, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  invoice_date: string | null;
  invoice_number: string | null;
  status_cfdi: string;
  created_at: string;
  suppliers: { company_name: string } | null;
  projects: { name: string } | null;
  clients: { full_name: string } | null;
}

interface ExpenseTableProps {
  onNewExpense: () => void;
  refreshTrigger?: number;
}

const ExpenseTable: React.FC<ExpenseTableProps> = ({ onNewExpense, refreshTrigger }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpenses();
  }, [refreshTrigger]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          id,
          description,
          amount,
          category,
          invoice_date,
          invoice_number,
          status_cfdi,
          created_at,
          suppliers(company_name),
          projects(name),
          clients(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setExpenses(data || []);
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
      administration: 'Administrativos',
      sales: 'Ventas',
      financial: 'Financieros'
    };
    return categories[category as keyof typeof categories] || category;
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: 'Pendiente', variant: 'secondary' as const },
      processed: { label: 'Procesado', variant: 'default' as const },
      error: { label: 'Error', variant: 'destructive' as const }
    };
    
    const config = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'secondary' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Gastos Registrados</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Gestiona y revisa todos los gastos de la empresa
            </p>
          </div>
          <Button onClick={onNewExpense} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Gasto
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground mb-4">
              No hay gastos registrados
            </div>
            <Button onClick={onNewExpense} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Registrar Primer Gasto
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
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>Estado CFDI</TableHead>
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
                      {expense.suppliers?.company_name || '-'}
                    </TableCell>
                    <TableCell>
                      {expense.projects?.name || '-'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(expense.status_cfdi)}
                    </TableCell>
                    <TableCell>
                      {expense.invoice_date 
                        ? format(new Date(expense.invoice_date), 'dd/MMM/yyyy', { locale: es })
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
  );
};

export default ExpenseTable;