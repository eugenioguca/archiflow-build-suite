import React, { useState, useEffect } from 'react';
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
import ExpenseTable from '@/components/ExpenseTable';
import FinancialReportsManager from '@/components/FinancialReportsManager';
import BudgetControlSystem from '@/components/BudgetControlSystem';
import ProfitabilityAnalysis from '@/components/ProfitabilityAnalysis';
import { ElectronicInvoicingDashboard } from '@/components/ElectronicInvoicingDashboard';
import { supabase } from '@/integrations/supabase/client';
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
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; company_name: string; rfc?: string }>>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [clients, setClients] = useState<Array<{ id: string; full_name: string }>>([]);
  const [refreshExpenses, setRefreshExpenses] = useState(0);

  useEffect(() => {
    fetchSupportData();
  }, []);

  const fetchSupportData = async () => {
    try {
      const [suppliersResult, projectsResult, clientsResult] = await Promise.all([
        supabase.from('suppliers').select('id, company_name, rfc'),
        supabase.from('client_projects').select('id, project_name'),
        supabase.from('clients').select('id, full_name')
      ]);

      if (suppliersResult.data) setSuppliers(suppliersResult.data);
      if (projectsResult.data) setProjects(projectsResult.data.map(p => ({ ...p, name: p.project_name })));
      if (clientsResult.data) setClients(clientsResult.data);
    } catch (error) {
      console.error('Error fetching support data:', error);
    }
  };

  const handleExpenseSuccess = () => {
    setRefreshExpenses(prev => prev + 1);
  };

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
          <ExpenseTable 
            onNewExpense={() => setIsExpenseDialogOpen(true)}
            refreshTrigger={refreshExpenses}
          />
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

      <ExpenseFormDialog
        isOpen={isExpenseDialogOpen}
        onClose={() => setIsExpenseDialogOpen(false)}
        onSuccess={handleExpenseSuccess}
        suppliers={suppliers}
        projects={projects}
        clients={clients}
      />
    </div>
  );
};

export default FinancesNew;