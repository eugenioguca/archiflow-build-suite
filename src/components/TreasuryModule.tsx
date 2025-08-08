import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Wallet, Plus, BarChart3, CreditCard, Package, ArrowUpDown } from "lucide-react";
import { BankAccountsManager } from "./BankAccountsManager";
import { BankTransactionsTable } from "./BankTransactionsTable";
import { CashTransactionsTable } from "./CashTransactionsTable";
import { TreasuryTransactionForm } from "./TreasuryTransactionForm";
import { MaterialToTreasuryExporter } from "./MaterialToTreasuryExporter";
import { TreasuryPaymentProcessor } from "./TreasuryPaymentProcessor";
import { TreasuryMaterialsPayments } from "./TreasuryMaterialsPayments";
import { TreasuryCompactDashboard } from "./TreasuryCompactDashboard";
import { CollapsibleFilters } from "./CollapsibleFilters";
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

  const [activeSection, setActiveSection] = useState("dashboard");
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

      {/* Collapsible Filters */}
      <CollapsibleFilters
        selectedClientId={effectiveClientId}
        selectedProjectId={effectiveProjectId}
        onClientChange={setClientId}
        onProjectChange={setProjectId}
        onClearFilters={clearFilters}
      />

      {/* Compact Navigation Menu - Inspired by FinancesNew */}
      <Tabs value={activeSection} onValueChange={setActiveSection} className="space-y-4">
        <TabsList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 w-full h-auto gap-1 p-1 bg-muted sticky top-0 z-10">
          <TabsTrigger value="dashboard" className="flex items-center gap-2 py-2 px-3 text-sm">
            <BarChart3 className="h-4 w-4" />
            <span>Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="banking" className="flex items-center gap-2 py-2 px-3 text-sm">
            <Building2 className="h-4 w-4" />
            <span>Bancaria</span>
          </TabsTrigger>
          <TabsTrigger value="cash" className="flex items-center gap-2 py-2 px-3 text-sm">
            <Wallet className="h-4 w-4" />
            <span>Efectivo</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2 py-2 px-3 text-sm">
            <CreditCard className="h-4 w-4" />
            <span>Pagos</span>
          </TabsTrigger>
          <TabsTrigger value="materials" className="flex items-center gap-2 py-2 px-3 text-sm">
            <Package className="h-4 w-4" />
            <span>Materiales</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <TreasuryCompactDashboard 
            selectedClientId={effectiveClientId}
            selectedProjectId={effectiveProjectId}
          />
        </TabsContent>

        <TabsContent value="banking" className="space-y-6">
          {/* Bank Accounts Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Cuentas Bancarias
                </div>
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
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Movimientos Bancarios
                </div>
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
        </TabsContent>

        <TabsContent value="cash" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  Movimientos de Efectivo
                </div>
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

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Procesamiento de Pagos
              </CardTitle>
              <CardDescription>
                Gestión de pagos a proveedores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TreasuryPaymentProcessor 
                selectedClientId={effectiveClientId}
                selectedProjectId={effectiveProjectId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Exportación de Materiales
              </CardTitle>
              <CardDescription>
                Exportación de materiales a tesorería
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MaterialToTreasuryExporter 
                selectedClientId={effectiveClientId}
                selectedProjectId={effectiveProjectId}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Pagos de Materiales
              </CardTitle>
              <CardDescription>
                Gestión de pagos a proveedores de materiales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TreasuryMaterialsPayments 
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