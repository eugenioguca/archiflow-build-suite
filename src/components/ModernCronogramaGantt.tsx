import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Calculator, Calendar, BarChart3 } from 'lucide-react';
import { useClientProjectFilters } from '@/hooks/useClientProjectFilters';
import { CollapsibleFilters } from '@/components/CollapsibleFilters';
import { ModernGanttGrid } from '@/components/ModernGanttGrid';
import { MonthlyNumericMatrix } from '@/components/MonthlyNumericMatrix';
import { GanttPDFExport } from '@/components/GanttPDFExport';
import { ModernGanttActivityModal } from '@/components/modals/ModernGanttActivityModal';
import { MatrixBulkEditorModal } from '@/components/modals/MatrixBulkEditorModal';
import { useModernCronograma } from '@/hooks/useModernCronograma';
import { getCurrentMonth } from '@/utils/cronogramaWeekUtils';

export function ModernCronogramaGantt() {
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
    matrixOverrides,
    calculations,
    isLoading,
    createActivity,
    updateActivity,
    deleteActivity,
    saveMatrixOverrides,
    deleteMatrixOverride
  } = useModernCronograma(selectedClientId, selectedProjectId);

  const [months, setMonths] = useState(12);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showMatrixModal, setShowMatrixModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<any>(null);
  const [newActivityData, setNewActivityData] = useState<{monthStr: string, week: number, mayorId: string} | null>(null);

  // Handle adding new activity
  const handleAddActivity = (monthStr: string, week: number, mayorId: string) => {
    setNewActivityData({ monthStr, week, mayorId });
    setEditingActivity(null);
    setShowActivityModal(true);
  };

  // Handle editing activity
  const handleEditActivity = (activity: any) => {
    setEditingActivity(activity);
    setNewActivityData(null);
    setShowActivityModal(true);
  };

  // Handle activity form submission
  const handleActivitySubmit = async (formData: any) => {
    await createActivity.mutateAsync(formData);
    setShowActivityModal(false);
    setNewActivityData(null);
    setEditingActivity(null);
  };

  // Handle matrix overrides
  const handleSaveMatrixOverrides = async (overrides: any[]) => {
    await saveMatrixOverrides.mutateAsync(overrides);
  };

  const handleDeleteMatrixOverride = async (mes: string, concepto: string) => {
    await deleteMatrixOverride.mutateAsync({ mes, concepto });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-card p-6 rounded-lg border shadow-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-8 w-8 text-primary" />
            Cronograma de Gantt
          </h1>
          <p className="text-muted-foreground mt-1">
            Cronograma visual interactivo con matriz de flujo de caja
          </p>
        </div>
        <div className="flex gap-2">
          {hasFilters && selectedClientId && selectedProjectId && (
            <>
              <div className="flex items-center gap-2 text-sm">
                <label htmlFor="months-select" className="font-medium">Meses:</label>
                <select
                  id="months-select"
                  value={months}
                  onChange={(e) => setMonths(Number(e.target.value))}
                  className="px-3 py-2 border rounded-md bg-background"
                >
                  <option value={6}>6 meses</option>
                  <option value={12}>12 meses</option>
                  <option value={18}>18 meses</option>
                  <option value={24}>24 meses</option>
                </select>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMatrixModal(true)}
                className="gap-2"
              >
                <Calculator className="h-4 w-4" />
                Editar Matriz
              </Button>
              <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Fixed Filters - Always visible when needed */}
      {!hasFilters ? (
        <CollapsibleFilters
          selectedClientId={selectedClientId}
          selectedProjectId={selectedProjectId}
          onClientChange={setClientId}
          onProjectChange={setProjectId}
          onClearFilters={clearFilters}
        />
      ) : (
        <div className="bg-muted/30 p-4 rounded-lg border">
          <CollapsibleFilters
            selectedClientId={selectedClientId}
            selectedProjectId={selectedProjectId}
            onClientChange={setClientId}
            onProjectChange={setProjectId}
            onClearFilters={clearFilters}
          />
        </div>
      )}

      {hasFilters && selectedClientId && selectedProjectId ? (
        <div className="space-y-6">
          {/* Visual Gantt Grid */}
          <ModernGanttGrid
            activities={activities}
            mayores={mayores}
            months={months}
            isLoading={isLoading}
            onAddActivity={handleAddActivity}
            onEditActivity={handleEditActivity}
            onDeleteActivity={(id) => deleteActivity.mutateAsync(id)}
          />
          
          {/* Monthly Numeric Matrix */}
          <MonthlyNumericMatrix
            calculations={calculations}
            manualOverrides={{}}
            onSaveOverride={async () => {}}
            onDeleteOverride={async () => {}}
            months={months}
          />
          
          {/* PDF Export - Temporarily disabled during redesign */}
          {activities.length > 0 && (
            <div className="flex justify-end">
              <Button variant="outline" disabled>
                Exportar PDF (En desarrollo)
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Selecciona un proyecto</h3>
            <p className="text-muted-foreground">
              Selecciona un cliente y proyecto para ver y gestionar el cronograma de Gantt moderno.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Activity Modal */}
      <ModernGanttActivityModal
        open={showActivityModal}
        onOpenChange={setShowActivityModal}
        onSubmit={handleActivitySubmit}
        initialData={editingActivity ? {
          departamento_id: editingActivity.departamento,
          mayor_id: editingActivity.mayor_id,
          start_month: editingActivity.start_month,
          start_week: editingActivity.start_week,
          end_month: editingActivity.end_month,
          end_week: editingActivity.end_week,
          duration_weeks: editingActivity.duration_weeks
        } : newActivityData ? {
          start_month: newActivityData.monthStr,
          start_week: newActivityData.week,
          end_month: newActivityData.monthStr,
          end_week: newActivityData.week,
          mayor_id: newActivityData.mayorId
        } : undefined}
        clienteId={selectedClientId}
        proyectoId={selectedProjectId}
        title={editingActivity ? "Editar Actividad" : "Nueva Actividad"}
      />

      {/* Matrix Editor Modal */}
      {selectedClientId && selectedProjectId && (
        <MatrixBulkEditorModal
          open={showMatrixModal}
          onOpenChange={setShowMatrixModal}
          clienteId={selectedClientId}
          proyectoId={selectedProjectId}
          months={months}
          existingOverrides={{}}
          calculations={calculations}
          onSaveOverrides={handleSaveMatrixOverrides}
          onDeleteOverride={handleDeleteMatrixOverride}
        />
      )}
    </div>
  );
}