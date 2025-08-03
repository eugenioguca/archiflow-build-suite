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
// import BudgetControlSystem from '@/components/BudgetControlSystem'; // Component removed
import ProfitabilityAnalysis from '@/components/ProfitabilityAnalysis';
import { ElectronicInvoicingDashboard } from '@/components/ElectronicInvoicingDashboard';
import { PaymentPlansFinance } from '@/components/PaymentPlansFinance';
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
  Target,
  Package,
  Calculator,
  BarChart3,
  Calendar,
  AlertTriangle,
  Banknote
} from 'lucide-react';
import { MaterialFinanceRequests } from '@/components/MaterialFinanceRequests';
import { GlobalFilters } from '@/components/GlobalFilters';

const FinancesNew: React.FC = () => {
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; company_name: string; rfc?: string }>>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [clients, setClients] = useState<Array<{ id: string; full_name: string }>>([]);
  const [refreshExpenses, setRefreshExpenses] = useState(0);
  
  // Estado para filtros cliente-proyecto
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>();
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();

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
    <div className="container mx-auto p-2 sm:p-4 max-w-full">
      <div className="mb-3">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Sistema ERP Financiero</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Gestión integral de finanzas, contabilidad y tesorería empresarial
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-3">
        <div className="w-full">
          {/* Two-row navigation */}
          <div className="space-y-2">
            {/* First row - Main modules */}
            <TabsList className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-7 w-full h-auto gap-1 p-1 bg-muted">
              <TabsTrigger value="dashboard" className="flex items-center gap-2 py-2 px-3 text-sm">
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="treasury" className="flex items-center gap-2 py-2 px-3 text-sm">
                <Wallet className="h-4 w-4" />
                <span>Tesorería</span>
              </TabsTrigger>
              <TabsTrigger value="accounts" className="flex items-center gap-2 py-2 px-3 text-sm">
                <Building2 className="h-4 w-4" />
                <span>Cuentas</span>
              </TabsTrigger>
              <TabsTrigger value="cashflow" className="flex items-center gap-2 py-2 px-3 text-sm">
                <TrendingUp className="h-4 w-4" />
                <span>Flujo Caja</span>
              </TabsTrigger>
              <TabsTrigger value="materials" className="flex items-center gap-2 py-2 px-3 text-sm">
                <Package className="h-4 w-4" />
                <span>Materiales</span>
              </TabsTrigger>
              <TabsTrigger value="advances" className="flex items-center gap-2 py-2 px-3 text-sm">
                <Banknote className="h-4 w-4" />
                <span>Anticipos</span>
              </TabsTrigger>
              <TabsTrigger value="payment-plans" className="flex items-center gap-2 py-2 px-3 text-sm">
                <Calendar className="h-4 w-4" />
                <span>Planes Pago</span>
              </TabsTrigger>
            </TabsList>
            
            {/* Second row - Operations and reports */}
            <TabsList className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-7 w-full h-auto gap-1 p-1 bg-muted">
              <TabsTrigger value="transactions" className="flex items-center gap-2 py-2 px-3 text-sm">
                <List className="h-4 w-4" />
                <span>Transacciones</span>
              </TabsTrigger>
              <TabsTrigger value="expenses" className="flex items-center gap-2 py-2 px-3 text-sm">
                <Receipt className="h-4 w-4" />
                <span>Gastos</span>
              </TabsTrigger>
              <TabsTrigger value="operations" className="flex items-center gap-2 py-2 px-3 text-sm">
                <CreditCard className="h-4 w-4" />
                <span>Operaciones</span>
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-2 py-2 px-3 text-sm">
                <BarChart3 className="h-4 w-4" />
                <span>Reportes</span>
              </TabsTrigger>
              <TabsTrigger value="profitability" className="flex items-center gap-2 py-2 px-3 text-sm">
                <Calculator className="h-4 w-4" />
                <span>Rentabilidad</span>
              </TabsTrigger>
              <TabsTrigger value="ppd" className="flex items-center gap-2 py-2 px-3 text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>PPD</span>
              </TabsTrigger>
              <TabsTrigger value="invoicing" className="flex items-center gap-2 py-2 px-3 text-sm">
                <FileText className="h-4 w-4" />
                <span>Facturación</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="dashboard" className="space-y-4">
          <ERPDashboard 
            selectedClientId={selectedClientId}
            selectedProjectId={selectedProjectId}
          />
        </TabsContent>

        <TabsContent value="treasury" className="space-y-4">
          <TreasuryDashboard 
            selectedClientId={selectedClientId}
            selectedProjectId={selectedProjectId}
            onFiltersChange={(clientId, projectId) => {
              setSelectedClientId(clientId || undefined);
              setSelectedProjectId(projectId || undefined);
            }}
          />
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4">
          <CashAccountManager />
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-4">
          <CashFlowProjections />
        </TabsContent>

        <TabsContent value="materials" className="space-y-4">
          <MaterialFinanceRequests 
            selectedClientId={selectedClientId}
            selectedProjectId={selectedProjectId}
          />
        </TabsContent>

        <TabsContent value="advances" className="space-y-4">
          <EmployeeAdvanceManager />
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <DetailedTransactionsTable />
        </TabsContent>

        <TabsContent value="ppd" className="space-y-4">
          <PPDMonitoringDashboard />
        </TabsContent>

        <TabsContent value="operations" className="space-y-4">
          <div className="grid gap-4">
            <CashTransactionForm />
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <ExpenseTable 
            onNewExpense={() => setIsExpenseDialogOpen(true)}
            refreshTrigger={refreshExpenses}
            selectedClientId={selectedClientId}
            selectedProjectId={selectedProjectId}
            onClientChange={setSelectedClientId}
            onProjectChange={setSelectedProjectId}
          />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <FinancialReportsManager />
        </TabsContent>

        <TabsContent value="profitability" className="space-y-4">
          <GlobalFilters
            selectedClientId={selectedClientId}
            selectedProjectId={selectedProjectId}
            onClientChange={setSelectedClientId}
            onProjectChange={setSelectedProjectId}
            onClearFilters={() => {
              setSelectedClientId(undefined);
              setSelectedProjectId(undefined);
            }}
          />
          <ProfitabilityAnalysis 
            selectedClientId={selectedClientId}
            selectedProjectId={selectedProjectId}
          />
        </TabsContent>

        <TabsContent value="payment-plans" className="space-y-4">
          <GlobalFilters
            selectedClientId={selectedClientId}
            selectedProjectId={selectedProjectId}
            onClientChange={setSelectedClientId}
            onProjectChange={setSelectedProjectId}
            onClearFilters={() => {
              setSelectedClientId(undefined);
              setSelectedProjectId(undefined);
            }}
          />
          <PaymentPlansFinance 
            selectedClientId={selectedClientId}
            selectedProjectId={selectedProjectId}
          />
        </TabsContent>

        <TabsContent value="invoicing" className="space-y-4">
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