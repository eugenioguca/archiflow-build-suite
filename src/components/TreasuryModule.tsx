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

      {/* Treasury Dashboard - Always visible */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Dashboard de Tesorería
          </CardTitle>
          <CardDescription>
            Resumen ejecutivo y métricas clave de la situación financiera
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TreasuryDashboard 
            selectedClientId={effectiveClientId}
            selectedProjectId={effectiveProjectId}
          />
        </CardContent>
      </Card>

      {/* Collapsible Sections for Better Organization */}
      <Accordion type="multiple" className="space-y-4">
        
        {/* Banking Management Section */}
        <AccordionItem value="banking" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-primary" />
              <div className="text-left">
                <h3 className="font-semibold">Gestión Bancaria</h3>
                <p className="text-sm text-muted-foreground">Cuentas bancarias y movimientos</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 space-y-6">
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
          </AccordionContent>
        </AccordionItem>

        {/* Cash Management Section */}
        <AccordionItem value="cash" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <Wallet className="h-5 w-5 text-primary" />
              <div className="text-left">
                <h3 className="font-semibold">Gestión de Efectivo</h3>
                <p className="text-sm text-muted-foreground">Movimientos y control de efectivo</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
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
          </AccordionContent>
        </AccordionItem>

        {/* Payment Processing Section */}
        <AccordionItem value="payments" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-primary" />
              <div className="text-left">
                <h3 className="font-semibold">Procesamiento de Pagos</h3>
                <p className="text-sm text-muted-foreground">Gestión de pagos a proveedores</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <TreasuryPaymentProcessor 
              selectedClientId={effectiveClientId}
              selectedProjectId={effectiveProjectId}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Materials & Treasury Section */}
        <AccordionItem value="materials" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-primary" />
              <div className="text-left">
                <h3 className="font-semibold">Materiales y Tesorería</h3>
                <p className="text-sm text-muted-foreground">Exportación y pagos de materiales</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 space-y-6">
            <MaterialToTreasuryExporter 
              selectedClientId={effectiveClientId}
              selectedProjectId={effectiveProjectId}
            />
            <TreasuryMaterialsPayments 
              selectedClientId={effectiveClientId}
              selectedProjectId={effectiveProjectId}
            />
          </AccordionContent>
        </AccordionItem>

      </Accordion>

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