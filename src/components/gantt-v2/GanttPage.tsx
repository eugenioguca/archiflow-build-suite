import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, BarChart3, RefreshCw } from 'lucide-react';
import { GanttToolbar } from './GanttToolbar';
import { GanttGrid } from './GanttGrid';
import { MatrixSection } from './MatrixSection';
import { ActivityModal } from './ActivityModal';
import { MayorSelectionModal } from './MayorSelectionModal';
import { DiscountModal } from './DiscountModal';
import { MatrixExplanationsManager } from '@/components/MatrixExplanationsManager';
import { useGantt } from '@/hooks/gantt-v2/useGantt';
import { useMayoresTU } from '@/hooks/gantt-v2/useMayoresTU';
import { useMatrixOverrides } from '@/hooks/gantt-v2/useMatrixOverrides';
import { useGanttSync } from './hooks/useGanttSync';
import { useParametricGanttSync } from '@/hooks/useParametricGanttSync';

interface GanttPageProps {
  selectedClientId: string;
  selectedProjectId: string;
}

export function GanttPage({ selectedClientId, selectedProjectId }: GanttPageProps) {

  const {
    plan,
    lines,
    isLoading,
    isFetching,
    updatePlan,
    addLineWithActivity,
    createLine,
    updateLine,
    deleteLine,
    createActivity,
    updateActivity,
    deleteActivity
  } = useGantt(selectedClientId, selectedProjectId);

  const { data: mayores = [] } = useMayoresTU();
  const { overrides } = useMatrixOverrides(selectedClientId, selectedProjectId);
  const { syncFromParametric, isSyncing } = useParametricGanttSync(selectedClientId, selectedProjectId);
  
  // Enable automatic sync on parametric changes
  useGanttSync(selectedClientId, selectedProjectId);

  // Modal state
  const [showMayorModal, setShowMayorModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [editingLine, setEditingLine] = useState<any>(null);

  const handleAddMayor = () => {
    setShowMayorModal(true);
  };

  const handleMayorSubmit = async (mayorData: { 
    mayor_id: string; 
    amount: number;
    start_month: string;
    start_week: number;
    end_month: string;
    end_week: number;
  }) => {
    console.log('[GANTT-PAGE] handleMayorSubmit called with:', mayorData);
    
    if (!plan?.id) {
      console.error('[GANTT-PAGE] No plan available');
      throw new Error('No hay plan activo');
    }

    if (editingLine) {
      // Update existing line and its activity
      console.log('[GANTT-PAGE] Updating existing line:', editingLine.id);
      
      // Update line data
      await updateLine.mutateAsync({
        id: editingLine.id,
        data: {
          mayor_id: mayorData.mayor_id,
          amount: mayorData.amount
        }
      });
      
      // Update or create activity for the line
      const activity = editingLine.activities?.[0];
      if (activity) {
        // Update existing activity
        await updateActivity.mutateAsync({
          id: activity.id,
          data: {
            start_month: mayorData.start_month,
            start_week: mayorData.start_week,
            end_month: mayorData.end_month,
            end_week: mayorData.end_week
          }
        });
      } else {
        // Create new activity for imported line
        await createActivity.mutateAsync({
          line_id: editingLine.id,
          start_month: mayorData.start_month,
          start_week: mayorData.start_week,
          end_month: mayorData.end_month,
          end_week: mayorData.end_week
        });
      }

      // Update sync status to complete for imported lines
      if (editingLine.es_importado) {
        await updateLine.mutateAsync({
          id: editingLine.id,
          data: { estado_sync: 'completo' }
        });
      }
      
      setEditingLine(null);
    } else {
      // Create new line
      console.log('[GANTT-PAGE] Calling addLineWithActivity mutation...');
      
      await addLineWithActivity.mutateAsync({
        mayor_id: mayorData.mayor_id,
        amount: mayorData.amount,
        is_discount: false,
        start_month: mayorData.start_month,
        start_week: mayorData.start_week,
        end_month: mayorData.end_month,
        end_week: mayorData.end_week,
      });
    }
    
    console.log('[GANTT-PAGE] Mutation completed successfully');
    setShowMayorModal(false);
  };

  const handleAddDiscount = () => {
    // Check if discount already exists
    const existingDiscount = lines.find(line => line.is_discount);
    if (existingDiscount) {
      setShowDiscountModal(true);
      return;
    }
    
    setShowDiscountModal(true);
  };

  const handleDiscountSubmit = async (amount: number) => {
    if (!plan) return;
    
    // Check if discount already exists
    const existingDiscount = lines.find(line => line.is_discount);
    
    if (existingDiscount) {
      // Update existing discount
      await updateLine.mutateAsync({
        id: existingDiscount.id,
        data: { amount }
      });
    } else {
      // Create new discount line
      await createLine.mutateAsync({
        plan_id: plan.id,
        line_no: 0, // Discount lines don't get numbered
        label: 'Descuento',
        is_discount: true,
        amount,
        order_index: lines.length + 100, // Place after regular lines
      });
    }
  };

  const handleEditLine = (line: any) => {
    setEditingLine(line);
    setShowMayorModal(true);
  };

  return (
    <div className="gantt-container">
      <div className="space-y-3 sm:space-y-4 lg:space-y-6 px-2 sm:px-4 lg:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-card p-3 sm:p-4 lg:p-6 rounded-lg border shadow-sm">
          <div className="mb-2 sm:mb-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Calendar className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-primary" />
              <span className="hidden sm:inline">Cronograma de Gantt (v2)</span>
              <span className="sm:hidden">Gantt v2</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Sistema moderno de cronograma con matriz numérica mensual
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => window.location.reload()} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

      {/* Show empty state if no filters */}
      {(!selectedClientId || !selectedProjectId) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Selecciona un proyecto</h3>
            <p className="text-muted-foreground">
              Selecciona un cliente y proyecto para ver y gestionar el cronograma de Gantt v2.
            </p>
          </CardContent>
        </Card>
      )}

        {/* Main content */}
        {selectedClientId && selectedProjectId && (
          <div className="space-y-3 sm:space-y-4 lg:space-y-6">
          {/* Toolbar - Made sticky */}
          <div className="gantt-toolbar">
            <GanttToolbar
              plan={plan}
              lines={lines as any}
              mayores={mayores}
              overrides={overrides as any}
              onUpdatePlan={updatePlan.mutateAsync}
              onAddMayor={handleAddMayor}
              onAddDiscount={handleAddDiscount}
              onSync={() => syncFromParametric.mutate()}
              isLoading={isLoading || isFetching}
              isSyncing={isSyncing}
              canAddMayor={!!plan?.id}
              clientId={selectedClientId}
              projectId={selectedProjectId}
            />
          </div>

          {/* Gantt Grid */}
          <GanttGrid
            plan={plan}
            lines={lines as any}
            mayores={mayores}
            onUpdateLine={updateLine.mutateAsync}
            onDeleteLine={deleteLine.mutateAsync}
            onEditLine={handleEditLine}
            isLoading={isLoading || isFetching}
            isFetching={isFetching}
          />

          {/* Matrix Section */}
          <MatrixSection
            plan={plan}
            lines={lines as any}
            overrides={overrides as any}
            clientId={selectedClientId}
            projectId={selectedProjectId}
          />

          {/* Matrix Explanations Manager */}
          {plan?.id && (
            <MatrixExplanationsManager 
              planId={plan.id} 
              className="lg:col-span-2"
            />
          )}

          {/* Mayor Selection Modal */}
          <MayorSelectionModal
            open={showMayorModal}
            onOpenChange={(open) => {
              setShowMayorModal(open);
              if (!open) setEditingLine(null);
            }}
            onSubmit={handleMayorSubmit}
            initialData={editingLine ? {
              mayor_id: editingLine.mayor_id,
              amount: editingLine.amount,
              start_month: editingLine.activities?.[0]?.start_month,
              start_week: editingLine.activities?.[0]?.start_week,
              end_month: editingLine.activities?.[0]?.end_month,
              end_week: editingLine.activities?.[0]?.end_week,
            } : undefined}
            title={editingLine ? "Editar Mayor" : "Añadir Mayor"}
          />

          {/* Discount Modal */}
          <DiscountModal
            open={showDiscountModal}
            onOpenChange={setShowDiscountModal}
            onSubmit={handleDiscountSubmit}
            currentDiscount={lines.find(line => line.is_discount)?.amount}
            subtotal={lines.filter(l => !l.is_discount).reduce((sum, l) => sum + (l.amount || 0), 0)}
            title={lines.find(line => line.is_discount) ? "Editar Descuento" : "Añadir Descuento"}
          />
          </div>
        )}
      </div>
    </div>
  );
}