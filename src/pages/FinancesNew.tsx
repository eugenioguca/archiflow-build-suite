import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ERPDashboard from '@/components/ERPDashboard';
import { TreasuryModule } from '@/components/TreasuryModule';
import PPDMonitoringDashboard from '@/components/PPDMonitoringDashboard';
import { PaymentComplementsDashboard } from '@/components/PaymentComplementsDashboard';
import ProfitabilityAnalysis from '@/components/ProfitabilityAnalysis';
import { ElectronicInvoicingDashboard } from '@/components/ElectronicInvoicingDashboard';
import { PaymentPlansUnified } from '@/components/PaymentPlansUnified';
import { supabase } from '@/integrations/supabase/client';
import { 
  LayoutDashboard, 
  Wallet, 
  FileText, 
  CreditCard,
  Calculator,
  AlertTriangle,
  Package
} from 'lucide-react';
import { MaterialFinanceRequests } from '@/components/MaterialFinanceRequests';
import { GlobalFilters } from '@/components/GlobalFilters';

const FinancesNew: React.FC = () => {
  // Estado para filtros cliente-proyecto
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>();
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();

  return (
    <div className="container mx-auto p-2 sm:p-4 max-w-full">
      <div className="mb-3">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Sistema Financiero ERP</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Módulo de finanzas empresarial - Conectado a arquitectura cliente-proyecto
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-3">
        {/* MENÚ LIMPIO - Solo 7 funcionalidades esenciales */}
        <TabsList className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 w-full h-auto gap-1 p-1 bg-muted">
          <TabsTrigger value="dashboard" className="flex items-center gap-2 py-2 px-3 text-sm">
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="treasury" className="flex items-center gap-2 py-2 px-3 text-sm">
            <Wallet className="h-4 w-4" />
            <span>Tesorería</span>
          </TabsTrigger>
          <TabsTrigger value="materials" className="flex items-center gap-2 py-2 px-3 text-sm">
            <Package className="h-4 w-4" />
            <span>Materiales</span>
          </TabsTrigger>
          <TabsTrigger value="payment-plans" className="flex items-center gap-2 py-2 px-3 text-sm">
            <CreditCard className="h-4 w-4" />
            <span>Planes Pago</span>
          </TabsTrigger>
          <TabsTrigger value="ppd" className="flex items-center gap-2 py-2 px-3 text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>PPD</span>
          </TabsTrigger>
          <TabsTrigger value="invoicing" className="flex items-center gap-2 py-2 px-3 text-sm">
            <FileText className="h-4 w-4" />
            <span>Facturación</span>
          </TabsTrigger>
          <TabsTrigger value="profitability" className="flex items-center gap-2 py-2 px-3 text-sm">
            <Calculator className="h-4 w-4" />
            <span>Rentabilidad</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <ERPDashboard 
            selectedClientId={selectedClientId}
            selectedProjectId={selectedProjectId}
          />
        </TabsContent>

        <TabsContent value="treasury" className="space-y-4">
          <TreasuryModule 
            selectedClientId={selectedClientId}
            selectedProjectId={selectedProjectId}
          />
        </TabsContent>

        <TabsContent value="materials" className="space-y-4">
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
          <MaterialFinanceRequests 
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
          <PaymentPlansUnified 
            mode="finance"
            selectedClientId={selectedClientId}
            selectedProjectId={selectedProjectId}
          />
        </TabsContent>

        <TabsContent value="ppd" className="space-y-4">
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
          <PaymentComplementsDashboard 
            selectedClientId={selectedClientId}
            selectedProjectId={selectedProjectId}
          />
        </TabsContent>

        <TabsContent value="invoicing" className="space-y-4">
          <ElectronicInvoicingDashboard />
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
      </Tabs>
    </div>
  );
};

export default FinancesNew;