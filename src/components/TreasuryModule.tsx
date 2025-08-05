import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Wallet, Plus } from "lucide-react";
import { BankAccountsManager } from "./BankAccountsManager";
import { BankTransactionsTable } from "./BankTransactionsTable";
import { CashTransactionsTable } from "./CashTransactionsTable";
import { TreasuryTransactionForm } from "./TreasuryTransactionForm";
import { MaterialToTreasuryExporter } from "./MaterialToTreasuryExporter";
import { TreasuryPaymentProcessor } from "./TreasuryPaymentProcessor";
import { TreasuryEmptyState } from "./TreasuryEmptyState";
import { TreasuryDashboard } from "./TreasuryDashboard";
import { TreasuryMaterialsPayments } from "./TreasuryMaterialsPayments";
import { GlobalFilters } from "./GlobalFilters";
import { useClientProjectFilters } from "@/hooks/useClientProjectFilters";

interface TreasuryModuleProps {
  selectedClientId?: string;
  selectedProjectId?: string;
}

export const TreasuryModule: React.FC<TreasuryModuleProps> = ({
  selectedClientId: propClientId,
  selectedProjectId: propProjectId
}) => {
  const {
    selectedClientId,
    selectedProjectId,
    setClientId,
    setProjectId,
    clearFilters,
    hasFilters
  } = useClientProjectFilters();

  // Use prop values if provided, otherwise use filter values
  const effectiveClientId = propClientId || selectedClientId;
  const effectiveProjectId = propProjectId || selectedProjectId;

  const [activeTab, setActiveTab] = useState("banks");
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [formAccountType, setFormAccountType] = useState<"bank" | "cash">("bank");
  const [formTransactionType, setFormTransactionType] = useState<"income" | "expense">("income");

  const handleNewTransaction = (accountType: "bank" | "cash", transactionType: "income" | "expense") => {
    setFormAccountType(accountType);
    setFormTransactionType(transactionType);
    setIsFormDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tesorería</h2>
          <p className="text-muted-foreground">
            Gestión integral de bancos y efectivo con control granular de ingresos y egresos
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {hasFilters ? "Con Filtros" : "Todos los Datos"}
        </Badge>
      </div>


      {/* Treasury Dashboard */}
      <TreasuryDashboard 
        selectedClientId={effectiveClientId}
        selectedProjectId={effectiveProjectId}
      />

      {/* Material Export Section */}
      <MaterialToTreasuryExporter 
        selectedClientId={effectiveClientId}
        selectedProjectId={effectiveProjectId}
      />

      {/* Treasury Payment Processor */}
      <TreasuryPaymentProcessor 
        selectedClientId={effectiveClientId}
        selectedProjectId={effectiveProjectId}
      />

      {/* Treasury Materials Payments */}
      <TreasuryMaterialsPayments 
        selectedClientId={effectiveClientId}
        selectedProjectId={effectiveProjectId}
      />

      {/* Main Treasury Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="banks" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Bancos
          </TabsTrigger>
          <TabsTrigger value="cash" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Efectivo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="banks" className="space-y-6">
          <div className="grid gap-6">
            {/* Bank Accounts Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Cuentas Bancarias
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Cuenta
                  </Button>
                </CardTitle>
                <CardDescription>
                  Gestión de cuentas bancarias y sus saldos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BankAccountsManager />
              </CardContent>
            </Card>

            {/* Bank Transactions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Movimientos Bancarios
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleNewTransaction("bank", "income")}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Ingreso
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => handleNewTransaction("bank", "expense")}
                      variant="destructive"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Egreso
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  Registro detallado de ingresos y egresos bancarios con información granular
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BankTransactionsTable 
                  selectedClientId={effectiveClientId}
                  selectedProjectId={effectiveProjectId}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cash" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Movimientos de Efectivo
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => handleNewTransaction("cash", "income")}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ingreso
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => handleNewTransaction("cash", "expense")}
                    variant="destructive"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Egreso
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Control de efectivo con facturación opcional y seguimiento detallado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CashTransactionsTable 
                selectedClientId={effectiveClientId}
                selectedProjectId={effectiveProjectId}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transaction Form Dialog */}
      {isFormDialogOpen && (
        <TreasuryTransactionForm
          isOpen={isFormDialogOpen}
          onClose={() => setIsFormDialogOpen(false)}
          accountType={formAccountType}
          transactionType={formTransactionType}
          selectedClientId={effectiveClientId}
          selectedProjectId={effectiveProjectId}
        />
      )}
    </div>
  );
};