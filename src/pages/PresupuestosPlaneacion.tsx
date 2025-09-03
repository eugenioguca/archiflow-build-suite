import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PresupuestoParametrico } from '@/components/PresupuestoParametrico';
import { CronogramaGantt } from '@/components/CronogramaGantt';
import { PresupuestoEjecutivoManager } from '@/components/PresupuestoEjecutivoManager';
import { PaymentPlanManager } from '@/components/PaymentPlanManager';

export default function PresupuestosPlaneacion() {
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
          <PaymentPlanManager clientProjectId="" />
        </TabsContent>

        <TabsContent value="ejecutivo" className="space-y-6">
          <PresupuestoEjecutivoManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}