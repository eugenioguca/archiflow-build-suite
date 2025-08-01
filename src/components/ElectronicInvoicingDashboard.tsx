import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Receipt, Package, Settings, TrendingUp, AlertTriangle, Download, Plus } from 'lucide-react';
import { ProductCatalogManager } from './ProductCatalogManager';
import { InvoiceCreator } from './InvoiceCreator';
import { InvoiceViewer } from './InvoiceViewer';
import { ContpaqiExporter } from './ContpaqiExporter';
import { PACConfigManager } from './PACConfigManager';
import { BillingClientsManager } from './BillingClientsManager';
import { InvoiceTemplateManager } from './InvoiceTemplateManager';

interface DashboardStats {
  totalInvoices: number;
  invoicesThisMonth: number;
  totalProducts: number;
  pendingInvoices: number;
  cancelledInvoices: number;
  monthlyRevenue: number;
}

export function ElectronicInvoicingDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<DashboardStats>({
    totalInvoices: 0,
    invoicesThisMonth: 0,
    totalProducts: 0,
    pendingInvoices: 0,
    cancelledInvoices: 0,
    monthlyRevenue: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setIsLoading(true);
      
      // Get total invoices
      const { count: totalInvoices } = await supabase
        .from('electronic_invoices')
        .select('*', { count: 'exact', head: true });

      // Get invoices this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { count: invoicesThisMonth } = await supabase
        .from('electronic_invoices')
        .select('*', { count: 'exact', head: true })
        .gte('fecha_emision', startOfMonth.toISOString());

      // Get total products
      const { count: totalProducts } = await supabase
        .from('products_services')
        .select('*', { count: 'exact', head: true })
        .eq('activo', true);

      // Get pending invoices (borrador)
      const { count: pendingInvoices } = await supabase
        .from('electronic_invoices')
        .select('*', { count: 'exact', head: true })
        .eq('estatus', 'borrador');

      // Get cancelled invoices
      const { count: cancelledInvoices } = await supabase
        .from('electronic_invoices')
        .select('*', { count: 'exact', head: true })
        .eq('estatus', 'cancelada');

      // Get monthly revenue
      const { data: monthlyInvoices } = await supabase
        .from('electronic_invoices')
        .select('total')
        .eq('estatus', 'timbrada')
        .gte('fecha_emision', startOfMonth.toISOString());

      const monthlyRevenue = monthlyInvoices?.reduce((sum, invoice) => sum + (invoice.total || 0), 0) || 0;

      setStats({
        totalInvoices: totalInvoices || 0,
        invoicesThisMonth: invoicesThisMonth || 0,
        totalProducts: totalProducts || 0,
        pendingInvoices: pendingInvoices || 0,
        cancelledInvoices: cancelledInvoices || 0,
        monthlyRevenue
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las estadísticas del dashboard',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Facturación Electrónica 4.0</h2>
          <p className="text-muted-foreground">
            Sistema completo de facturación electrónica con PAC integrado
          </p>
        </div>
        <Button className="gap-2" onClick={() => setActiveTab('creator')}>
          <Plus className="h-4 w-4" />
          Nueva Factura
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Facturas Totales
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInvoices}</div>
            <p className="text-xs text-muted-foreground">
              {stats.invoicesThisMonth} este mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ingresos del Mes
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.monthlyRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Facturas timbradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Productos Activos
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              En catálogo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Facturas Pendientes
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pendingInvoices}</div>
            <p className="text-xs text-muted-foreground">
              Por timbrar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Facturas Canceladas
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.cancelledInvoices}</div>
            <p className="text-xs text-muted-foreground">
              Canceladas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Exportar CONTPAQi
            </CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">CSV</div>
            <p className="text-xs text-muted-foreground">
              Listo para exportar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="invoices">Facturas</TabsTrigger>
          <TabsTrigger value="clients">Clientes</TabsTrigger>
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="creator">Crear Factura</TabsTrigger>
          <TabsTrigger value="export">Exportar</TabsTrigger>
          <TabsTrigger value="config">Configuración</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Facturas Recientes</CardTitle>
                <CardDescription>
                  Últimas facturas creadas en el sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">FAC-001-2024</p>
                      <p className="text-sm text-muted-foreground">Cliente ABC S.A. de C.V.</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">Timbrada</Badge>
                      <p className="text-sm font-medium">{formatCurrency(15000)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">FAC-002-2024</p>
                      <p className="text-sm text-muted-foreground">Cliente XYZ S.A. de C.V.</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">Borrador</Badge>
                      <p className="text-sm font-medium">{formatCurrency(8500)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alertas Fiscales</CardTitle>
                <CardDescription>
                  Notificaciones importantes del sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 border rounded-lg bg-yellow-50">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">Certificado próximo a vencer</p>
                      <p className="text-sm text-yellow-700">El certificado CSD vence en 30 días</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 border rounded-lg bg-blue-50">
                    <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-800">Actualización SAT</p>
                      <p className="text-sm text-blue-700">Nuevos catálogos SAT disponibles</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invoices">
          <InvoiceViewer onStatsUpdate={fetchDashboardStats} />
        </TabsContent>

        <TabsContent value="clients">
          <BillingClientsManager />
        </TabsContent>

        <TabsContent value="products">
          <ProductCatalogManager />
        </TabsContent>

        <TabsContent value="creator">
          <InvoiceCreator onInvoiceCreated={fetchDashboardStats} />
        </TabsContent>

        <TabsContent value="export">
          <ContpaqiExporter />
        </TabsContent>

        <TabsContent value="config">
          <div className="space-y-6">
            <div className="grid gap-6">
              <InvoiceTemplateManager />
              <div className="border-t pt-6">
                <PACConfigManager />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}