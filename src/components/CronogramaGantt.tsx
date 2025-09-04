import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, Calendar, BarChart3 } from 'lucide-react';
import { useCronogramaGantt } from '@/hooks/useCronogramaGantt';
import { useClientProjectFilters } from '@/hooks/useClientProjectFilters';
import { CollapsibleFilters } from '@/components/CollapsibleFilters';
import { InteractiveGanttChart } from '@/components/InteractiveGanttChart';
import { MonthlyNumericMatrix } from '@/components/MonthlyNumericMatrix';
import { GanttPDFExport } from '@/components/GanttPDFExport';

export function CronogramaGantt() {
  const {
    selectedClientId,
    selectedProjectId,
    setClientId,
    setProjectId,
    clearFilters,
    hasFilters
  } = useClientProjectFilters();

  const {
    activities,
    mayores,
    isLoading
  } = useCronogramaGantt(selectedClientId, selectedProjectId);

  const [months, setMonths] = useState(12);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-8 w-8 text-primary" />
            Cronograma de Gantt
          </h1>
          <p className="text-muted-foreground">
            Cronograma visual interactivo con matriz de flujo de caja y ministraciones
          </p>
        </div>
        <div className="flex gap-2">
          {hasFilters && selectedClientId && selectedProjectId && (
            <>
              <div className="flex items-center gap-2 text-sm">
                <label htmlFor="months-select">Meses:</label>
                <select
                  id="months-select"
                  value={months}
                  onChange={(e) => setMonths(Number(e.target.value))}
                  className="px-3 py-1 border rounded text-sm"
                >
                  <option value={6}>6 meses</option>
                  <option value={12}>12 meses</option>
                  <option value={18}>18 meses</option>
                  <option value={24}>24 meses</option>
                </select>
              </div>
              <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
            <GanttPDFExport
              ganttBars={activities.map(a => ({
                ...a,
                departamento_id: a.departamento,
                mayor: a.mayor || { codigo: '', nombre: '' }
              }))}
              mayores={mayores}
              calculations={{
                gastoPorMes: {},
                avanceParcial: {},
                avanceAcumulado: {},
                ministraciones: {},
                inversionAcumulada: {},
                fechasPago: {},
                totalPresupuesto: 0
              }}
              manualOverrides={{}}
              clienteId={selectedClientId}
              proyectoId={selectedProjectId}
              months={months}
            />
            </>
          )}
        </div>
      </div>

      <CollapsibleFilters
        selectedClientId={selectedClientId}
        selectedProjectId={selectedProjectId}
        onClientChange={setClientId}
        onProjectChange={setProjectId}
        onClearFilters={clearFilters}
      />

      {hasFilters && selectedClientId && selectedProjectId ? (
        <div className="space-y-6">
          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-muted-foreground">Cargando cronograma...</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <InteractiveGanttChart
                clienteId={selectedClientId}
                proyectoId={selectedProjectId}
                months={months}
              />
              
              <MonthlyNumericMatrix
                calculations={{
                  gastoPorMes: {},
                  avanceParcial: {},
                  avanceAcumulado: {},
                  ministraciones: {},
                  inversionAcumulada: {},
                  fechasPago: {},
                  totalPresupuesto: 0
                }}
                manualOverrides={{}}
                onSaveOverride={async () => {}}
                onDeleteOverride={async () => {}}
                months={months}
              />
              
              {activities.length === 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Sin actividades programadas</h3>
                    <p className="text-muted-foreground max-w-md">
                      Para comenzar, selecciona un Mayor en el cronograma y haz clic en las celdas de semanas 
                      para crear barras de actividades. Las barras se pueden arrastrar y redimensionar.
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Selecciona un proyecto</h3>
            <p className="text-muted-foreground">
              Selecciona un cliente y proyecto para ver y gestionar el cronograma de Gantt interactivo 
              con matriz de flujo de caja.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}