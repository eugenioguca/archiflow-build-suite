import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { UnifiedTransactionForm } from "./UnifiedTransactionForm";
import { UnifiedTransactionsTable } from "./UnifiedTransactionsTable";
import { ChartOfAccountsManager } from "./ChartOfAccountsManager";
import { ChartOfAccountsExcelManager } from "./ChartOfAccountsExcelManager";

export function UnifiedFinancialTransactions() {
  const [activeTab, setActiveTab] = useState("transactions");
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transacciones Unificadas (Desarrollo)</h1>
          <p className="text-muted-foreground">
            Módulo temporal para desarrollo del sistema unificado de transacciones financieras
          </p>
        </div>
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
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Transacción
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <UnifiedTransactionsTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chart-accounts" className="space-y-6">
          <ChartOfAccountsExcelManager />
          <ChartOfAccountsManager />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Reportes y Análisis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Reportes y análisis del sistema unificado - Pendiente de implementación
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showForm && (
        <UnifiedTransactionForm 
          open={showForm} 
          onOpenChange={setShowForm}
        />
      )}
    </div>
  );
}