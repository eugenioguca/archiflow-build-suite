import { useState, useEffect } from 'react';
import { Plus, Receipt, Calculator, FileText, TrendingUp, PieChart } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';

interface ExpenseWithTax {
  id: string;
  description: string;
  amount: number;
  category: string;
  invoice_number: string | null;
  invoice_date: string | null;
  tax_amount: number | null;
  created_at: string;
  project?: {
    name: string;
  };
  client?: {
    full_name: string;
  };
}

const categoryLabels = {
  administration: 'Administración',
  sales: 'Ventas',
  financial: 'Financieros',
  construction: 'Construcción'
};

export default function Accounting() {
  const [expenses, setExpenses] = useState<ExpenseWithTax[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          project:projects(name),
          client:clients(full_name)
        `)
        .order('created_at', { ascending: false });

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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No especificado';
    return new Date(dateString).toLocaleDateString('es-MX');
  };

  // Cálculos contables
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalTaxes = expenses.reduce((sum, expense) => sum + (expense.tax_amount || 0), 0);
  const totalWithTaxes = totalExpenses + totalTaxes;
  
  // Gastos con facturas vs sin facturas
  const expensesWithInvoice = expenses.filter(e => e.invoice_number);
  const expensesWithoutInvoice = expenses.filter(e => !e.invoice_number);
  const invoiceComplianceRate = expenses.length > 0 ? (expensesWithInvoice.length / expenses.length) * 100 : 0;

  // IVA por categoría (asumiendo 16% IVA estándar en México)
  const VAT_RATE = 0.16;
  const categoryTaxBreakdown = expenses.reduce((acc, expense) => {
    const category = expense.category;
    const subtotal = expense.amount;
    const iva = expense.tax_amount || (subtotal * VAT_RATE);
    
    if (!acc[category]) {
      acc[category] = { subtotal: 0, iva: 0, total: 0 };
    }
    
    acc[category].subtotal += subtotal;
    acc[category].iva += iva;
    acc[category].total += subtotal + iva;
    
    return acc;
  }, {} as Record<string, { subtotal: number; iva: number; total: number }>);

  // Gastos por mes para tendencias
  const monthlyExpenses = expenses.reduce((acc, expense) => {
    const month = new Date(expense.created_at).toLocaleDateString('es-MX', { 
      year: 'numeric', 
      month: 'long' 
    });
    
    if (!acc[month]) {
      acc[month] = { amount: 0, taxes: 0, count: 0 };
    }
    
    acc[month].amount += expense.amount;
    acc[month].taxes += expense.tax_amount || 0;
    acc[month].count += 1;
    
    return acc;
  }, {} as Record<string, { amount: number; taxes: number; count: number }>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contabilidad</h1>
          <p className="text-muted-foreground">Control contable y fiscal</p>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gastos</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              Subtotal sin impuestos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IVA Total</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalTaxes)}</div>
            <p className="text-xs text-muted-foreground">
              Impuestos aplicados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total con IVA</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalWithTaxes)}</div>
            <p className="text-xs text-muted-foreground">
              Monto total final
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cumplimiento Fiscal</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoiceComplianceRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Gastos con factura
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="breakdown" className="space-y-4">
        <TabsList>
          <TabsTrigger value="breakdown">Desglose por Categoría</TabsTrigger>
          <TabsTrigger value="invoices">Control de Facturas</TabsTrigger>
          <TabsTrigger value="trends">Tendencias Mensuales</TabsTrigger>
        </TabsList>

        <TabsContent value="breakdown">
          <Card>
            <CardHeader>
              <CardTitle>Desglose Fiscal por Categoría</CardTitle>
              <CardDescription>
                Análisis de gastos e impuestos por categoría según la legislación mexicana
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(categoryTaxBreakdown).map(([category, data]) => (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{categoryLabels[category as keyof typeof categoryLabels]}</h4>
                      <Badge variant="outline">{formatCurrency(data.total)}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Subtotal:</span>
                        <div className="font-medium">{formatCurrency(data.subtotal)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">IVA (16%):</span>
                        <div className="font-medium">{formatCurrency(data.iva)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total:</span>
                        <div className="font-medium">{formatCurrency(data.total)}</div>
                      </div>
                    </div>
                    
                    <Progress 
                      value={(data.total / totalWithTaxes) * 100} 
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Gastos con Factura</CardTitle>
                <CardDescription>
                  {expensesWithInvoice.length} gastos debidamente facturados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {expensesWithInvoice.slice(0, 5).map((expense) => (
                    <div key={expense.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{expense.description}</div>
                        <div className="text-sm text-muted-foreground">
                          Factura: {expense.invoice_number}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(expense.amount)}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(expense.invoice_date)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {expensesWithInvoice.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center">
                      +{expensesWithInvoice.length - 5} gastos más...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Gastos sin Factura</CardTitle>
                <CardDescription>
                  {expensesWithoutInvoice.length} gastos pendientes de facturación
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {expensesWithoutInvoice.slice(0, 5).map((expense) => (
                    <div key={expense.id} className="flex justify-between items-center p-3 border rounded-lg border-red-200">
                      <div>
                        <div className="font-medium">{expense.description}</div>
                        <div className="text-sm text-red-600">
                          Requiere facturación
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(expense.amount)}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(expense.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {expensesWithoutInvoice.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center">
                      +{expensesWithoutInvoice.length - 5} gastos más...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Tendencias Mensuales</CardTitle>
              <CardDescription>
                Evolución de gastos e impuestos por mes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(monthlyExpenses).slice(0, 6).map(([month, data]) => (
                  <div key={month} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{month}</h4>
                      <div className="text-sm text-muted-foreground">
                        {data.count} gasto(s)
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Gastos:</span>
                        <div className="font-medium">{formatCurrency(data.amount)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Impuestos:</span>
                        <div className="font-medium">{formatCurrency(data.taxes)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total:</span>
                        <div className="font-medium">{formatCurrency(data.amount + data.taxes)}</div>
                      </div>
                    </div>
                    
                    <Progress 
                      value={Math.min((data.amount / Math.max(...Object.values(monthlyExpenses).map(m => m.amount))) * 100, 100)} 
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}