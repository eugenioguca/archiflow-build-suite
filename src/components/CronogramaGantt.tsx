import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, Calendar, BarChart3 } from 'lucide-react';
import { useInteractiveGantt } from '@/hooks/useInteractiveGantt';
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
    ganttBars,
    mayores,
    isLoading,
    monthlyCalculations,
    manualOverrides,
    createGanttBar,
    updateGanttBar, 
    deleteGanttBar,
    saveManualOverride,
    deleteManualOverride,
    refetch
  } = useInteractiveGantt(selectedClientId, selectedProjectId);

  const [months, setMonths] = useState(12);

  // Handle bar creation from form
  const handleCreateBar = async (data: any) => {
    if (!selectedClientId || !selectedProjectId) return;
    
    await createGanttBar.mutateAsync({
      ...data,
      cliente_id: selectedClientId,
      proyecto_id: selectedProjectId
    });
  };

  // Handle bar update
  const handleUpdateBar = async (id: string, data: any) => {
    await updateGanttBar.mutateAsync({ id, data });
  };

  // Handle bar deletion
  const handleDeleteBar = async (id: string) => {
    await deleteGanttBar.mutateAsync(id);
  };

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
              <Button onClick={refetch} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
            <GanttPDFExport
              ganttBars={ganttBars}
              mayores={mayores}
              calculations={monthlyCalculations}
              manualOverrides={manualOverrides}
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
                ganttBars={ganttBars}
                mayores={mayores}
                onCreateBar={handleCreateBar}
                onUpdateBar={handleUpdateBar}
                onDeleteBar={handleDeleteBar}
                clienteId={selectedClientId}
                proyectoId={selectedProjectId}
                months={months}
              />
              
               <MonthlyNumericMatrix
                 calculations={monthlyCalculations}
                 manualOverrides={manualOverrides}
                 onSaveOverride={async (data) => {
                   await saveManualOverride.mutateAsync(data);
                 }}
                 onDeleteOverride={async (data) => {
                   await deleteManualOverride.mutateAsync(data);
                 }}
                 months={months}
               />
              
              {ganttBars.length === 0 && (
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