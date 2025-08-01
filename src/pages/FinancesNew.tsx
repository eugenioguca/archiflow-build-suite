import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ERPDashboard from '@/components/ERPDashboard';
import { TreasuryDashboard } from '@/components/TreasuryDashboard';
import { CashAccountManager } from '@/components/CashAccountManager';
import { CashFlowProjections } from '@/components/CashFlowProjections';
import { EmployeeAdvanceManager } from '@/components/EmployeeAdvanceManager';
import DetailedTransactionsTable from '@/components/DetailedTransactionsTable';
import PPDMonitoringDashboard from '@/components/PPDMonitoringDashboard';
import { CashTransactionForm } from '@/components/CashTransactionForm';
import { ExpenseFormDialog } from '@/components/ExpenseFormDialog';
import FinancialReportsManager from '@/components/FinancialReportsManager';
import BudgetControlSystem from '@/components/BudgetControlSystem';
import ProfitabilityAnalysis from '@/components/ProfitabilityAnalysis';
import { ElectronicInvoicingDashboard } from '@/components/ElectronicInvoicingDashboard';
import { 
  LayoutDashboard, 
  Wallet, 
  Building2, 
  TrendingUp, 
  Users, 
  List, 
  FileText, 
  CreditCard,
  Receipt,
  Target
} from 'lucide-react';

const FinancesNew: React.FC = () => {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-4xl font-bold tracking-tight">Sistema ERP Financiero</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Gestión integral de finanzas, contabilidad y tesorería empresarial
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="flex w-full overflow-x-auto h-auto gap-2 p-2">
          <TabsTrigger value="dashboard" className="flex items-center gap-2 py-3">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:block">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="treasury" className="flex items-center gap-2 py-3">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:block">Tesorería</span>
          </TabsTrigger>
          <TabsTrigger value="accounts" className="flex items-center gap-2 py-3">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:block">Cuentas</span>
          </TabsTrigger>
          <TabsTrigger value="cashflow" className="flex items-center gap-2 py-3">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:block">Flujo</span>
          </TabsTrigger>
          <TabsTrigger value="advances" className="flex items-center gap-2 py-3">
            <Users className="h-4 w-4" />
            <span className="hidden sm:block">Anticipos</span>
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2 py-3">
            <List className="h-4 w-4" />
            <span className="hidden sm:block">Transacciones</span>
          </TabsTrigger>
          <TabsTrigger value="ppd" className="flex items-center gap-2 py-3">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:block">PPD</span>
          </TabsTrigger>
          <TabsTrigger value="operations" className="flex items-center gap-2 py-3">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:block">Operaciones</span>
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center gap-2 py-3">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:block">Gastos</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2 py-3">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:block">Reportes</span>
          </TabsTrigger>
          <TabsTrigger value="budgets" className="flex items-center gap-2 py-3">
            <Target className="h-4 w-4" />
            <span className="hidden sm:block">Presupuestos</span>
          </TabsTrigger>
          <TabsTrigger value="profitability" className="flex items-center gap-2 py-3">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:block">Rentabilidad</span>
          </TabsTrigger>
          <TabsTrigger value="invoicing" className="flex items-center gap-2 py-3">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:block">Facturación</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <ERPDashboard />
        </TabsContent>

        <TabsContent value="treasury" className="space-y-6">
          <TreasuryDashboard />
        </TabsContent>

        <TabsContent value="accounts" className="space-y-6">
          <CashAccountManager />
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-6">
          <CashFlowProjections />
        </TabsContent>

        <TabsContent value="advances" className="space-y-6">
          <EmployeeAdvanceManager />
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <DetailedTransactionsTable />
        </TabsContent>

        <TabsContent value="ppd" className="space-y-6">
          <PPDMonitoringDashboard />
        </TabsContent>

        <TabsContent value="operations" className="space-y-6">
          <div className="grid gap-6">
            <div className="grid gap-6 md:grid-cols-1">
              <CashTransactionForm />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          <div className="grid gap-6">
            <div className="text-center py-8">
              <Receipt className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Registro de Gastos</h3>
              <p className="text-muted-foreground mb-4">
                Registra y gestiona los gastos de la empresa con soporte para CFDI
              </p>
              <div className="p-4 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">
                  Módulo de gastos integrado con sistema CFDI
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <FinancialReportsManager />
        </TabsContent>

        <TabsContent value="budgets" className="space-y-6">
          <BudgetControlSystem />
        </TabsContent>

        <TabsContent value="profitability" className="space-y-6">
          <ProfitabilityAnalysis />
        </TabsContent>

        <TabsContent value="invoicing" className="space-y-6">
          <ElectronicInvoicingDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancesNew;