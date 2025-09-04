import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CronogramaGanttFormModal } from '@/components/modals/CronogramaGanttFormModal';
import { useCronogramaGantt, GanttActivity } from '@/hooks/useCronogramaGantt';
import { groupActivitiesByMayor, isCellFilled } from '@/utils/expandRangeToCells';

interface InteractiveGanttChartProps {
  clienteId: string;
  proyectoId: string;
  months?: number;
}

export const InteractiveGanttChart: React.FC<InteractiveGanttChartProps> = ({
  clienteId,
  proyectoId,
  months = 12
}) => {
  // Use the dedicated Gantt hook
  const {
    activities,
    mayores,
    isLoading,
    createActivity,
    updateActivity,
    deleteActivity,
    refetch
  } = useCronogramaGantt(clienteId, proyectoId);
  
  const [selectedMayor, setSelectedMayor] = useState<string>('');
  const [isDragging, setIsDragging] = useState<{
    barId: string;
    type: 'move' | 'resize-start' | 'resize-end';
    startX: number;
  } | null>(null);
  
  const chartRef = useRef<HTMLDivElement>(null);

  // Generate month headers starting from current month
  const monthHeaders = Array.from({ length: months }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() + i);
    return {
      number: i + 1,
      name: date.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' }),
      weeks: ['W1', 'W2', 'W3', 'W4'],
      actualMonth: date.getMonth() + 1 // 1-12
    };
  });

  // Get base month for grid positioning
  const baseMonth = new Date().getMonth() + 1;

  // Group activities by mayor with proper grid positioning
  const activitiesByMayor = React.useMemo(() => {
    return groupActivitiesByMayor(activities, baseMonth);
  }, [activities, baseMonth]);

  // Calculate bar position and width for continuous bars  
  const getBarStyle = (activity: any, barIndex: number = 0) => {
    const weekWidth = 24; // Match w-6 Tailwind class (24px)
    
    // Convert actual months to grid positions
    const gridStartMonth = Math.max(1, activity.start_month - baseMonth + 1);
    const gridEndMonth = Math.max(1, activity.end_month - baseMonth + 1);
    
    // Handle year wrapping
    const adjustedGridStartMonth = gridStartMonth <= 0 ? gridStartMonth + 12 : gridStartMonth;
    const adjustedGridEndMonth = gridEndMonth <= 0 ? gridEndMonth + 12 : gridEndMonth;
    
    const startPosition = ((adjustedGridStartMonth - 1) * 4 + (activity.start_week - 1)) * weekWidth;
    const width = Math.max(24, activity.duration_weeks * weekWidth);
    
    return {
      left: `${startPosition}px`,
      width: `${width}px`,
      top: `${8 + (barIndex * 36)}px`,
      height: '28px',
    };
  };

  // Handle mouse events for dragging (simplified for now)
  const handleMouseDown = (e: React.MouseEvent, activityId: string, type: 'move' | 'resize-start' | 'resize-end') => {
    e.preventDefault();
    // Disable dragging for now - focus on display first
    console.log('Dragging disabled - showing data first');
  };

  // Create new activity modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newActivityData, setNewActivityData] = useState<{month: number, week: number, mayorId: string} | null>(null);

  // Handle cell click to create new activity
  const handleCellClick = (month: number, week: number, mayorId: string) => {
    if (isDragging) return;
    
    setNewActivityData({ month, week, mayorId });
    setShowCreateModal(true);
  };

  const handleCreateNewActivity = async (formData: any) => {
    await createActivity.mutateAsync({
      ...formData,
      cliente_id: clienteId,
      proyecto_id: proyectoId
    });
    
    setShowCreateModal(false);
    setNewActivityData(null);
  };

  const handleDeleteActivity = async (activityId: string) => {
    await deleteActivity.mutateAsync(activityId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground">Cargando cronograma...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Cronograma Interactivo de Gantt</span>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowCreateModal(true)}
              variant="default"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Añadir Actividad
            </Button>
            <select 
              value={selectedMayor}
              onChange={(e) => setSelectedMayor(e.target.value)}
              className="px-3 py-1 border rounded text-sm"
            >
              <option value="">Seleccionar Mayor para vista rápida</option>
              {mayores.map(mayor => (
                <option key={mayor.id} value={mayor.id}>
                  {mayor.codigo} - {mayor.nombre}
                </option>
              ))}
            </select>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* Header with months and weeks */}
            <div className="flex border-b border-border">
              <div className="w-48 p-2 bg-muted font-semibold border-r border-border">
                Mayor
              </div>
              {monthHeaders.map(month => (
                <div key={month.number} className="flex-1 border-r border-border">
                  <div className="p-2 bg-primary text-primary-foreground text-center font-semibold text-sm">
                    {month.name}
                  </div>
                  <div className="flex">
                    {month.weeks.map((week, weekIdx) => (
                      <div key={`${month.number}-${weekIdx}`} 
                           className="w-6 p-1 bg-muted text-center text-xs border-r border-border last:border-r-0 min-w-6">
                        {week}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Gantt rows */}
            <div ref={chartRef} className="relative">
              {mayores.map(mayor => {
                const mayorActivities = activitiesByMayor[mayor.id] || [];
                
                return (
                  <div key={mayor.id} className="flex border-b border-border min-h-16 hover:bg-muted/30">
                    <div className="w-48 p-2 border-r border-border flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{mayor.codigo}</div>
                        <div className="text-xs text-muted-foreground truncate">{mayor.nombre}</div>
                      </div>
                      {mayorActivities.length > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => mayorActivities.forEach(item => handleDeleteActivity(item.activity.id))}
                          className="text-destructive hover:text-destructive p-1 h-auto"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="flex-1 relative overflow-x-auto" style={{ minWidth: `${months * 96}px`, minHeight: `${Math.max(60, mayorActivities.length * 40)}px` }}>
                      {/* Week grid cells - clickable background */}
                      {monthHeaders.map(month =>
                        month.weeks.map((_, weekIdx) => {
                          const cellIsFilled = mayorActivities.some(item => 
                            isCellFilled(month.number, weekIdx + 1, item.gridCells)
                          );
                          
                          return (
                            <div
                              key={`${month.number}-${weekIdx}`}
                              className={cn(
                                "absolute w-6 h-full border-r border-border/30 cursor-pointer transition-all",
                                cellIsFilled 
                                  ? "bg-primary hover:bg-primary/80" 
                                  : "hover:bg-accent/20"
                              )}
                              style={{ 
                                left: `${((month.number - 1) * 4 + weekIdx) * 24}px`,
                                height: '100%'
                              }}
                              onClick={() => handleCellClick(month.number, weekIdx + 1, mayor.id)}
                              title={cellIsFilled ? `Actividad programada` : `Clic para agregar actividad`}
                            />
                          );
                        })
                      )}

                      {/* Activity labels and info */}
                      {mayorActivities.map((item, activityIndex) => {
                        const barStyle = getBarStyle(item.activity, activityIndex);
                        return (
                          <div
                            key={item.activity.id}
                            className={cn(
                              "absolute bg-primary/90 text-primary-foreground rounded-sm px-2 py-1",
                              "flex items-center justify-center cursor-pointer select-none",
                              "hover:bg-primary transition-colors text-xs font-medium shadow-sm",
                              "border border-primary-foreground/20 backdrop-blur-sm"
                            )}
                            style={{ 
                              ...barStyle,
                              zIndex: 20 + activityIndex,
                              minWidth: '24px',
                              minHeight: '28px'
                            }}
                            onClick={() => handleDeleteActivity(item.activity.id)}
                            title={`${mayor.codigo} - ${mayor.nombre}\nMes ${item.activity.start_month} Sem ${item.activity.start_week} → Mes ${item.activity.end_month} Sem ${item.activity.end_week}\nDuración: ${item.activity.duration_weeks} semanas\nClic para eliminar`}
                          >
                            <span className="truncate text-center flex-1 px-1">
                              {item.activity.duration_weeks}w
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {activities.length === 0 && !isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No hay actividades programadas.</p>
            <p className="text-sm">Selecciona un Mayor y haz clic en las celdas de semanas para crear barras.</p>
          </div>
        )}
        
        {/* Create Activity Modal */}
        <CronogramaGanttFormModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onSubmit={handleCreateNewActivity}
          clienteId={clienteId}
          proyectoId={proyectoId}
          title="Nueva Actividad - Cronograma de Gantt"
        />
      </CardContent>
    </Card>
  );
};