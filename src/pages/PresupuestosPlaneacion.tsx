import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PresupuestoParametrico } from '@/components/PresupuestoParametrico';
import { CronogramaGantt } from '@/components/CronogramaGantt';
import { PresupuestoEjecutivoManager } from '@/components/PresupuestoEjecutivoManager';
import { PaymentPlanManager } from '@/components/PaymentPlanManager';
import { useClientProjectFilters } from '@/hooks/useClientProjectFilters';
import { DollarSign } from 'lucide-react';

export default function PresupuestosPlaneacion() {
  const {
    selectedClientId,
    selectedProjectId,
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

      <Tabs defaultValue="parametrico" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="parametrico">Presupuesto Paramétrico</TabsTrigger>
          <TabsTrigger value="gantt">Cronograma de Gantt</TabsTrigger>
          <TabsTrigger value="pagos">Planes de Pago</TabsTrigger>
          <TabsTrigger value="ejecutivo">Presupuesto Ejecutivo</TabsTrigger>
        </TabsList>

        <TabsContent value="parametrico" className="space-y-6">
          <PresupuestoParametrico />
        </TabsContent>

        <TabsContent value="gantt" className="space-y-6">
          <CronogramaGantt />
        </TabsContent>

        <TabsContent value="pagos" className="space-y-6">
          {hasFilters && selectedClientId && selectedProjectId ? (
            <PaymentPlanManager 
              clientProjectId={selectedProjectId} 
              planType="construction_payment"
              compact={false}
            />
          ) : (
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
          )}
        </TabsContent>

        <TabsContent value="ejecutivo" className="space-y-6">
          <PresupuestoEjecutivoManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}