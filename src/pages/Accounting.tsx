import { useState, useEffect } from 'react';
import { Plus, Receipt, Calculator, FileText, TrendingUp, PieChart, BookOpen, CreditCard } from 'lucide-react';
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

interface IncomeWithTax {
  id: string;
  description: string;
  amount: number;
  category: string;
  invoice_number: string | null;
  invoice_date: string | null;
  tax_amount: number | null;
  payment_status: string;
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
  construction: 'Construcción',
  construction_service: 'Servicio de Construcción',
  consultation: 'Consultoría',
  project_management: 'Gestión de Proyectos',
  maintenance: 'Mantenimiento',
  other: 'Otros'
};

export default function Accounting() {
  const [expenses, setExpenses] = useState<ExpenseWithTax[]>([]);
  const [incomes, setIncomes] = useState<IncomeWithTax[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([fetchExpenses(), fetchIncomes()]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

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
    }
  };

  const fetchIncomes = async () => {
    try {
      const { data, error } = await supabase
        .from('incomes')
        .select(`
          *,
          project:projects(name),
          client:clients(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIncomes(data || []);
    } catch (error) {
      console.error('Error fetching incomes:', error);
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

  // Cálculos contables principales
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalIncomes = incomes.reduce((sum, income) => sum + income.amount, 0);
  const totalExpenseTaxes = expenses.reduce((sum, expense) => sum + (expense.tax_amount || 0), 0);
  const totalIncomeTaxes = incomes.reduce((sum, income) => sum + (income.tax_amount || 0), 0);
  
  // IVA por pagar/cobrar (diferencia entre IVA cobrado e IVA pagado)
  const ivaBalance = totalIncomeTaxes - totalExpenseTaxes;
  
  // Utilidad bruta
  const grossProfit = totalIncomes - totalExpenses;
  
  // Gastos con facturas vs sin facturas (compliance fiscal)
  const expensesWithInvoice = expenses.filter(e => e.invoice_number);
  const expensesWithoutInvoice = expenses.filter(e => !e.invoice_number);
  const expenseComplianceRate = expenses.length > 0 ? (expensesWithInvoice.length / expenses.length) * 100 : 0;
  
  // Ingresos con facturas vs sin facturas
  const incomesWithInvoice = incomes.filter(i => i.invoice_number);
  const incomesWithoutInvoice = incomes.filter(i => !i.invoice_number);
  const incomeComplianceRate = incomes.length > 0 ? (incomesWithInvoice.length / incomes.length) * 100 : 0;

  // IVA por categoría para gastos
  const VAT_RATE = 0.16;
  const expenseCategoryTaxBreakdown = expenses.reduce((acc, expense) => {
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

  // IVA por categoría para ingresos
  const incomeCategoryTaxBreakdown = incomes.reduce((acc, income) => {
    const category = income.category;
    const subtotal = income.amount;
    const iva = income.tax_amount || (subtotal * VAT_RATE);
    
    if (!acc[category]) {
      acc[category] = { subtotal: 0, iva: 0, total: 0 };
    }
    
    acc[category].subtotal += subtotal;
    acc[category].iva += iva;
    acc[category].total += subtotal + iva;
    
    return acc;
  }, {} as Record<string, { subtotal: number; iva: number; total: number }>);

  // Análisis mensual
  const monthlyAnalysis = [...expenses, ...incomes].reduce((acc, item) => {
    const month = new Date(item.created_at).toLocaleDateString('es-MX', { 
      year: 'numeric', 
      month: 'long' 
    });
    
    if (!acc[month]) {
      acc[month] = { income: 0, expense: 0, incomeTax: 0, expenseTax: 0, netProfit: 0 };
    }
    
    if ('payment_status' in item) {
      // Es un ingreso
      acc[month].income += item.amount;
      acc[month].incomeTax += item.tax_amount || 0;
    } else {
      // Es un gasto
      acc[month].expense += item.amount;
      acc[month].expenseTax += item.tax_amount || 0;
    }
    
    acc[month].netProfit = acc[month].income - acc[month].expense;
    
    return acc;
  }, {} as Record<string, { income: number; expense: number; incomeTax: number; expenseTax: number; netProfit: number }>);

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
          <h1 className="text-3xl font-bold">Contabilidad Fiscal</h1>
          <p className="text-muted-foreground">Control contable y fiscal conforme a la legislación mexicana</p>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIncomes)}</div>
            <p className="text-xs text-muted-foreground">
              Subtotal sin IVA
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Totales</CardTitle>
            <Calculator className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              Subtotal sin IVA
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilidad Bruta</CardTitle>
            <BookOpen className={`h-4 w-4 ${grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(grossProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              Antes de impuestos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IVA por {ivaBalance >= 0 ? 'Pagar' : 'Recuperar'}</CardTitle>
            <CreditCard className={`h-4 w-4 ${ivaBalance >= 0 ? 'text-red-600' : 'text-green-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${ivaBalance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(Math.abs(ivaBalance))}
            </div>
            <p className="text-xs text-muted-foreground">
              IVA cobrado vs pagado
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen Fiscal</TabsTrigger>
          <TabsTrigger value="income-breakdown">Ingresos por Categoría</TabsTrigger>
          <TabsTrigger value="expense-breakdown">Gastos por Categoría</TabsTrigger>
          <TabsTrigger value="compliance">Cumplimiento Fiscal</TabsTrigger>
          <TabsTrigger value="monthly">Análisis Mensual</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Estado de Resultados Simplificado</CardTitle>
                <CardDescription>Resumen de ingresos y gastos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">Ingresos Totales</span>
                  <span className="text-green-600 font-bold">{formatCurrency(totalIncomes)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">IVA Cobrado</span>
                  <span className="text-green-600">{formatCurrency(totalIncomeTaxes)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">Gastos Totales</span>
                  <span className="text-red-600 font-bold">{formatCurrency(totalExpenses)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">IVA Pagado</span>
                  <span className="text-red-600">{formatCurrency(totalExpenseTaxes)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-t-2 border-primary">
                  <span className="font-bold">Utilidad Bruta</span>
                  <span className={`font-bold text-lg ${grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(grossProfit)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="font-bold">IVA por {ivaBalance >= 0 ? 'Pagar' : 'Recuperar'}</span>
                  <span className={`font-bold ${ivaBalance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(Math.abs(ivaBalance))}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Indicadores de Cumplimiento Fiscal</CardTitle>
                <CardDescription>Porcentajes de cumplimiento con SAT</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Ingresos Facturados</span>
                    <span className="text-sm font-bold">{incomeComplianceRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={incomeComplianceRate} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {incomesWithInvoice.length} de {incomes.length} ingresos con factura
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Gastos Facturados</span>
                    <span className="text-sm font-bold">{expenseComplianceRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={expenseComplianceRate} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {expensesWithInvoice.length} de {expenses.length} gastos con factura
                  </p>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Recomendaciones Fiscales</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    {incomeComplianceRate < 90 && (
                      <li>• Asegurar facturación de todos los ingresos</li>
                    )}
                    {expenseComplianceRate < 80 && (
                      <li>• Solicitar facturas de gastos deducibles</li>
                    )}
                    {ivaBalance > 50000 && (
                      <li>• Considerar estrategias de optimización fiscal</li>
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="income-breakdown">
          <Card>
            <CardHeader>
              <CardTitle>Desglose Fiscal de Ingresos por Categoría</CardTitle>
              <CardDescription>
                Análisis de ingresos e IVA por tipo de servicio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(incomeCategoryTaxBreakdown).map(([category, data]) => (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{categoryLabels[category as keyof typeof categoryLabels]}</h4>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        {formatCurrency(data.total)}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Subtotal:</span>
                        <div className="font-medium text-green-600">{formatCurrency(data.subtotal)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">IVA Cobrado (16%):</span>
                        <div className="font-medium text-green-600">{formatCurrency(data.iva)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total:</span>
                        <div className="font-medium text-green-600">{formatCurrency(data.total)}</div>
                      </div>
                    </div>
                    
                    <Progress 
                      value={(data.total / (totalIncomes + totalIncomeTaxes)) * 100} 
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expense-breakdown">
          <Card>
            <CardHeader>
              <CardTitle>Desglose Fiscal de Gastos por Categoría</CardTitle>
              <CardDescription>
                Análisis de gastos deducibles e IVA por categoría
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(expenseCategoryTaxBreakdown).map(([category, data]) => (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{categoryLabels[category as keyof typeof categoryLabels]}</h4>
                      <Badge variant="outline" className="text-red-600 border-red-600">
                        {formatCurrency(data.total)}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Subtotal:</span>
                        <div className="font-medium text-red-600">{formatCurrency(data.subtotal)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">IVA Pagado (16%):</span>
                        <div className="font-medium text-red-600">{formatCurrency(data.iva)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total:</span>
                        <div className="font-medium text-red-600">{formatCurrency(data.total)}</div>
                      </div>
                    </div>
                    
                    <Progress 
                      value={(data.total / (totalExpenses + totalExpenseTaxes)) * 100} 
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Ingresos con Factura</CardTitle>
                <CardDescription>
                  {incomesWithInvoice.length} ingresos debidamente facturados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {incomesWithInvoice.slice(0, 5).map((income) => (
                    <div key={income.id} className="flex justify-between items-center p-3 border rounded-lg border-green-200">
                      <div>
                        <div className="font-medium">{income.description}</div>
                        <div className="text-sm text-muted-foreground">
                          Factura: {income.invoice_number}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-green-600">{formatCurrency(income.amount)}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(income.invoice_date)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {incomesWithInvoice.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center">
                      +{incomesWithInvoice.length - 5} ingresos más...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Ingresos sin Factura</CardTitle>
                <CardDescription>
                  {incomesWithoutInvoice.length} ingresos pendientes de facturación
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {incomesWithoutInvoice.slice(0, 5).map((income) => (
                    <div key={income.id} className="flex justify-between items-center p-3 border rounded-lg border-red-200">
                      <div>
                        <div className="font-medium">{income.description}</div>
                        <div className="text-sm text-red-600">
                          Requiere facturación urgente
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-red-600">{formatCurrency(income.amount)}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(income.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {incomesWithoutInvoice.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center">
                      +{incomesWithoutInvoice.length - 5} ingresos más...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle>Análisis Mensual</CardTitle>
              <CardDescription>
                Evolución de ingresos, gastos y utilidad por mes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(monthlyAnalysis).slice(0, 6).map(([month, data]) => (
                  <div key={month} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{month}</h4>
                      <div className={`text-sm font-bold ${data.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Utilidad: {formatCurrency(data.netProfit)}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Ingresos:</span>
                        <div className="font-medium text-green-600">{formatCurrency(data.income)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Gastos:</span>
                        <div className="font-medium text-red-600">{formatCurrency(data.expense)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">IVA Cobrado:</span>
                        <div className="font-medium">{formatCurrency(data.incomeTax)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">IVA Pagado:</span>
                        <div className="font-medium">{formatCurrency(data.expenseTax)}</div>
                      </div>
                    </div>
                    
                    <Progress 
                      value={data.income > 0 ? Math.min((data.income / Math.max(...Object.values(monthlyAnalysis).map(m => m.income))) * 100, 100) : 0} 
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