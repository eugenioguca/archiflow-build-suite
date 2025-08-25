import { useState, useRef, useEffect, useCallback, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { UnifiedTransactionsTable } from "./UnifiedTransactionsTable";
import { ChartOfAccountsManager } from "./ChartOfAccountsManager";
import { ChartOfAccountsExcelManager } from "./ChartOfAccountsExcelManager";
import { ImportReportsDashboard } from "./ImportReportsDashboard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UnifiedFinancialTransactionsProps {
  onBulkFormOpen?: () => void;
}

export const UnifiedFinancialTransactions = memo(({ onBulkFormOpen }: UnifiedFinancialTransactionsProps) => {
  const [activeTab, setActiveTab] = useState("transactions");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('connected');
  const tableRef = useRef<{ refreshData: () => void }>(null);
  const chartRef = useRef<{ refreshData: () => void }>(null);

  // Real-time subscription for data changes
  useEffect(() => {
    const channel = supabase
      .channel('unified-financial-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'unified_financial_transactions'
        },
        (payload) => {
          console.log('Real-time transaction change:', payload);
          // Refresh on any change (INSERT, UPDATE, DELETE)
          tableRef.current?.refreshData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chart_of_accounts_departamentos'
        },
        (payload) => {
          console.log('Real-time chart change:', payload);
          // Refresh on any change (INSERT, UPDATE, DELETE)
          chartRef.current?.refreshData();
          tableRef.current?.refreshData(); // Refresh transactions too in case department filtering is affected
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
        setConnectionStatus(status === 'SUBSCRIBED' ? 'connected' : 'error');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Global refresh handler
  const handleGlobalRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        tableRef.current?.refreshData(),
        chartRef.current?.refreshData()
      ]);
      toast.success("Datos actualizados correctamente");
    } catch (error) {
      toast.error("Error al actualizar datos");
      console.error("Refresh error:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Form handlers with optimization
  const handleFormClose = useCallback((open: boolean) => {
    if (!open) {
      // Optimized refresh - only refresh if form was likely successful
      tableRef.current?.refreshData();
    }
  }, []);

  const handleImportComplete = useCallback(() => {
    chartRef.current?.refreshData();
    tableRef.current?.refreshData();
  }, []);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transacciones Unificadas (Desarrollo)</h1>
          <p className="text-muted-foreground">
            Módulo temporal para desarrollo del sistema unificado de transacciones financieras
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 
              connectionStatus === 'disconnected' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <span className="text-xs text-muted-foreground">
              {connectionStatus === 'connected' ? 'Conectado (Tiempo Real)' : 
               connectionStatus === 'disconnected' ? 'Conectando...' : 'Sin conexión'}
            </span>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={handleGlobalRefresh}
          disabled={isRefreshing}
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Actualizando...' : 'Actualizar'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="transactions">Transacciones</TabsTrigger>
          <TabsTrigger value="chart-accounts">Catálogo de Cuentas</TabsTrigger>
          <TabsTrigger value="reports">Reportes</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Transacciones Financieras Unificadas</CardTitle>
              <div className="flex gap-2">
                <Button 
                  onClick={onBulkFormOpen}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  📦 Nueva Carga
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <UnifiedTransactionsTable ref={tableRef} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chart-accounts" className="space-y-6">
          <ChartOfAccountsExcelManager 
            onImportComplete={handleImportComplete} 
          />
          <ChartOfAccountsManager ref={chartRef} />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <ImportReportsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
});

UnifiedFinancialTransactions.displayName = "UnifiedFinancialTransactions";