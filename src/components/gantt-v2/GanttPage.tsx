import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, BarChart3, RefreshCw } from 'lucide-react';
import { GanttToolbar } from './GanttToolbar';
import { GanttGrid } from './GanttGrid';
import { MatrixSection } from './MatrixSection';
import { ActivityModal } from './ActivityModal';
import { MayorSelectionModal } from './MayorSelectionModal';
import { useGantt } from '@/hooks/gantt-v2/useGantt';
import { useMayoresTU } from '@/hooks/gantt-v2/useMayoresTU';
import { useMatrixOverrides } from '@/hooks/gantt-v2/useMatrixOverrides';

interface GanttPageProps {
  selectedClientId: string;
  selectedProjectId: string;
}

export function GanttPage({ selectedClientId, selectedProjectId }: GanttPageProps) {

  const {
    plan,
    lines,
    isLoading,
    updatePlan,
    createLine,
    updateLine,
    deleteLine,
    createActivity,
    updateActivity,
    deleteActivity
  } = useGantt(selectedClientId, selectedProjectId);

  const { data: mayores = [] } = useMayoresTU();
  const { overrides } = useMatrixOverrides(selectedClientId, selectedProjectId);

  // Modal state
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<any>(null);
  const [newActivityData, setNewActivityData] = useState<{lineId: string} | null>(null);
  const [showMayorModal, setShowMayorModal] = useState(false);

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
    if (!plan) return;
    
    // First create the line
    const result = await createLine.mutateAsync({
      plan_id: plan.id,
      line_no: 0, // Will be set automatically
      mayor_id: mayorData.mayor_id,
      is_discount: false,
      amount: mayorData.amount,
      order_index: lines.length,
    });

    // Then create an activity for the timeline
    if (result && result.id) {
      await createActivity.mutateAsync({
        line_id: result.id,
        start_month: mayorData.start_month,
        start_week: mayorData.start_week,
        end_month: mayorData.end_month,
        end_week: mayorData.end_week,
      });
    }
  };

  const handleAddDiscount = async () => {
    if (!plan) return;
    
    await createLine.mutateAsync({
      plan_id: plan.id,
      line_no: 0, // Will be set automatically
      label: 'Descuento',
      is_discount: true,
      amount: 0,
      order_index: lines.length,
    });
  };

  const handleAddActivity = (lineId: string) => {
    setNewActivityData({ lineId });
    setEditingActivity(null);
    setShowActivityModal(true);
  };

  const handleEditActivity = (activity: any) => {
    setEditingActivity(activity);
    setNewActivityData(null);
    setShowActivityModal(true);
  };

  const handleActivitySubmit = async (formData: any) => {
    if (editingActivity) {
      await updateActivity.mutateAsync({
        id: editingActivity.id,
        data: formData
      });
    } else if (newActivityData) {
      await createActivity.mutateAsync({
        ...formData,
        line_id: newActivityData.lineId
      });
    }
    
    setShowActivityModal(false);
    setNewActivityData(null);
    setEditingActivity(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-card p-6 rounded-lg border shadow-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-8 w-8 text-primary" />
            Cronograma de Gantt (v2)
          </h1>
          <p className="text-muted-foreground mt-1">
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
        <div className="space-y-6">
          {/* Toolbar */}
          <GanttToolbar
            plan={plan}
            onUpdatePlan={updatePlan.mutateAsync}
            onAddMayor={handleAddMayor}
            onAddDiscount={handleAddDiscount}
            isLoading={isLoading}
          />

          {/* Gantt Grid */}
          <GanttGrid
            plan={plan}
            lines={lines as any}
            mayores={mayores}
            onUpdateLine={updateLine.mutateAsync}
            onDeleteLine={deleteLine.mutateAsync}
            onAddActivity={handleAddActivity}
            onEditActivity={handleEditActivity}
            onDeleteActivity={deleteActivity.mutateAsync}
            isLoading={isLoading}
          />

          {/* Matrix Section */}
          <MatrixSection
            plan={plan}
            lines={lines as any}
            overrides={overrides as any}
            clientId={selectedClientId}
            projectId={selectedProjectId}
          />

          {/* Activity Modal */}
          <ActivityModal
            open={showActivityModal}
            onOpenChange={setShowActivityModal}
            onSubmit={handleActivitySubmit}
            initialData={editingActivity ? {
              start_month: editingActivity.start_month,
              start_week: editingActivity.start_week,
              end_month: editingActivity.end_month,
              end_week: editingActivity.end_week,
            } : undefined}
            title={editingActivity ? "Editar Actividad" : "Nueva Actividad"}
          />

          {/* Mayor Selection Modal */}
          <MayorSelectionModal
            open={showMayorModal}
            onOpenChange={setShowMayorModal}
            onSubmit={handleMayorSubmit}
            title="Añadir Mayor"
          />
        </div>
      )}
    </div>
  );
}