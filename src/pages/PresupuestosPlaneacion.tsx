import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PresupuestoParametrico } from '@/components/PresupuestoParametrico';
import { GanttPage } from '@/components/gantt-v2/GanttPage';
import { PresupuestoEjecutivoManager } from '@/components/PresupuestoEjecutivoManager';
import { PaymentPlanManager } from '@/components/PaymentPlanManager';
import { ClientProjectSelector } from '@/components/ClientProjectSelector';
import { useClientProjectFilters } from '@/hooks/useClientProjectFilters';
import { DollarSign } from 'lucide-react';
import { Suspense } from 'react';

// Wrapper component for Payment Plan integration
function PaymentPlanRoot({ selectedClientId, selectedProjectId }: {
  selectedClientId: string;
  selectedProjectId: string;
}) {
  // Normalize IDs (critical for proper matching)
  const clientId = String(selectedClientId ?? '').trim();
  const projectId = String(selectedProjectId ?? '').trim();
  
  // Debug logging (temporary - remove after testing)
  console.debug('[PP] filters', { clientId, projectId });
  console.debug('[PP] env', { module: 'presupuestos-planeacion' });
  
  const bothSelected = Boolean(clientId && projectId);
  
  if (!bothSelected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Planes de Pago</h2>
            <p className="text-muted-foreground">
              Gestión de planes de pago integrados del sistema existente
            </p>
          </div>
        </div>
        
        <div className="bg-muted/30 border border-dashed rounded-lg p-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <DollarSign className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Selecciona Cliente y Proyecto</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Usa los filtros en la parte superior para seleccionar un cliente y proyecto específico.
              Los planes de pago se mostrarán una vez que hagas la selección.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Cargando plan de pago...</p>
        </div>
      </div>
    }>
      <PaymentPlanManager 
        clientProjectId={projectId}
        planType="construction_payment"
        compact={false}
      />
    </Suspense>
  );
}

export default function PresupuestosPlaneacion() {
  const {
    selectedClientId,
    selectedProjectId,
    setClientId,
    setProjectId,
    clearFilters,
    hasFilters
  } = useClientProjectFilters();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Presupuestos y Planeación</h1>
        <p className="text-muted-foreground text-lg">
          Gestión completa de presupuestos, cronogramas y planes de pago para proyectos
        </p>
      </div>

      <ClientProjectSelector
        selectedClientId={selectedClientId}
        selectedProjectId={selectedProjectId}
        onClientChange={setClientId}
        onProjectChange={setProjectId}
        showAllOption={false}
        showProjectFilter={true}
      />

      <Tabs defaultValue="parametrico" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="parametrico">Presupuesto Paramétrico</TabsTrigger>
          <TabsTrigger value="gantt">Cronograma de Gantt</TabsTrigger>
          <TabsTrigger value="pagos">Planes de Pago</TabsTrigger>
          <TabsTrigger value="ejecutivo">Presupuesto Ejecutivo</TabsTrigger>
        </TabsList>

        <TabsContent value="parametrico" className="space-y-6">
          <PresupuestoParametrico 
            selectedClientId={selectedClientId}
            selectedProjectId={selectedProjectId}
          />
        </TabsContent>

        <TabsContent value="gantt" className="space-y-6">
          <GanttPage 
            selectedClientId={selectedClientId}
            selectedProjectId={selectedProjectId}
          />
        </TabsContent>

        <TabsContent value="pagos" className="space-y-6">
          <PaymentPlanRoot
            selectedClientId={selectedClientId}
            selectedProjectId={selectedProjectId}
          />
        </TabsContent>

        <TabsContent value="ejecutivo" className="space-y-6">
          <PresupuestoEjecutivoManager 
            selectedClientId={selectedClientId}
            selectedProjectId={selectedProjectId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}