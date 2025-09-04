import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { GanttBar } from '@/hooks/useInteractiveGantt';
import { cn } from '@/lib/utils';
import { CronogramaGanttFormModal } from '@/components/modals/CronogramaGanttFormModal';
import { expandRangeToMonthWeekCells, weeksBetween } from '@/utils/cronogramaWeekUtils';

interface InteractiveGanttChartProps {
  ganttBars: GanttBar[];
  mayores: Array<{ id: string; codigo: string; nombre: string }>;
  onCreateBar: (data: Omit<GanttBar, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'mayor'>) => void;
  onUpdateBar: (id: string, data: Partial<GanttBar>) => void;
  onDeleteBar: (id: string) => void;
  clienteId: string;
  proyectoId: string;
  months?: number;
}

export const InteractiveGanttChart: React.FC<InteractiveGanttChartProps> = ({
  ganttBars,
  mayores,
  onCreateBar,
  onUpdateBar,
  onDeleteBar,
  clienteId,
  proyectoId,
  months = 12
}) => {
  const [selectedMayor, setSelectedMayor] = useState<string>('');
  const [isDragging, setIsDragging] = useState<{
    barId: string;
    type: 'move' | 'resize-start' | 'resize-end';
    startX: number;
  } | null>(null);
  
  const chartRef = useRef<HTMLDivElement>(null);

  // Generate month headers
  const monthHeaders = Array.from({ length: months }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() + i);
    return {
      number: i + 1,
      name: date.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' }),
      weeks: ['W1', 'W2', 'W3', 'W4']
    };
  });

  // Expand activities into individual cells for rendering
  const expandedCells = React.useMemo(() => {
    const cellsMap: Record<string, Array<{
      bar: GanttBar;
      cells: Array<{month: number; week: number}>;
      barIndex: number;
    }>> = {};
    
    ganttBars.forEach((bar, barIndex) => {
      const cells = expandRangeToMonthWeekCells(
        { month: bar.start_month, week: bar.start_week },
        { month: bar.end_month, week: bar.end_week }
      );
      
      if (!cellsMap[bar.mayor_id]) {
        cellsMap[bar.mayor_id] = [];
      }
      
      cellsMap[bar.mayor_id].push({
        bar,
        cells,
        barIndex
      });
    });
    
    return cellsMap;
  }, [ganttBars]);

  // Calculate bar position and width for continuous bars
  const getBarStyle = (bar: GanttBar, barIndex: number = 0) => {
    const weekWidth = 24; // Match w-6 Tailwind class (24px)
    const startPosition = ((bar.start_month - 1) * 4 + (bar.start_week - 1)) * weekWidth;
    const width = Math.max(24, bar.duration_weeks * weekWidth); // Ensure minimum width
    
    return {
      left: `${startPosition}px`,
      width: `${width}px`,
      top: `${8 + (barIndex * 36)}px`, // Better spacing for stacking
      height: '28px', // Slightly taller bars
    };
  };

  // Handle mouse events for dragging
  const handleMouseDown = (e: React.MouseEvent, barId: string, type: 'move' | 'resize-start' | 'resize-end') => {
    e.preventDefault();
    setIsDragging({
      barId,
      type,
      startX: e.clientX
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !chartRef.current) return;

    const rect = chartRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const weekWidth = 24; // Match CSS width
    const weekPosition = Math.floor(relativeX / weekWidth);
    
    const bar = ganttBars.find(b => b.id === isDragging.barId);
    if (!bar) return;

    const newMonth = Math.floor(weekPosition / 4) + 1;
    const newWeek = (weekPosition % 4) + 1;

    let updates: Partial<GanttBar> = {};

    if (isDragging.type === 'move') {
      updates = {
        start_month: Math.max(1, Math.min(months, newMonth)),
        start_week: Math.max(1, Math.min(4, newWeek)),
        end_month: Math.max(1, Math.min(months, newMonth + Math.floor((bar.duration_weeks - 1) / 4))),
        end_week: Math.max(1, Math.min(4, newWeek + ((bar.duration_weeks - 1) % 4)))
      };
    } else if (isDragging.type === 'resize-start') {
      const endPosition = (bar.end_month - 1) * 4 + bar.end_week - 1;
      const newDuration = Math.max(1, endPosition - weekPosition + 1);
      updates = {
        start_month: Math.max(1, Math.min(months, newMonth)),
        start_week: Math.max(1, Math.min(4, newWeek)),
        duration_weeks: newDuration
      };
    } else if (isDragging.type === 'resize-end') {
      const startPosition = (bar.start_month - 1) * 4 + bar.start_week - 1;
      const newDuration = Math.max(1, weekPosition - startPosition + 1);
      updates = {
        duration_weeks: newDuration,
        end_month: Math.max(1, Math.min(months, newMonth)),
        end_week: Math.max(1, Math.min(4, newWeek))
      };
    }

    onUpdateBar(isDragging.barId, updates);
  }, [isDragging, ganttBars, onUpdateBar, months]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  // Add event listeners
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Create new bar modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBarData, setNewBarData] = useState<{month: number, week: number, mayorId: string} | null>(null);

  // Handle cell click to create new bar
  const handleCellClick = (month: number, week: number, mayorId: string) => {
    if (!selectedMayor || isDragging) return;
    
    setNewBarData({ month, week, mayorId });
    setShowCreateModal(true);
  };

  const handleCreateNewBar = async (formData: any) => {
    // Pass form data directly to onCreateBar - the hook will handle the format detection
    await onCreateBar(formData);
    
    setShowCreateModal(false);
    setNewBarData(null);
  };

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
                const mayorActivities = expandedCells[mayor.id] || [];
                
                return (
                  <div key={mayor.id} className="flex border-b border-border min-h-12 hover:bg-muted/30">
                    <div className="w-48 p-2 border-r border-border flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{mayor.codigo}</div>
                        <div className="text-xs text-muted-foreground truncate">{mayor.nombre}</div>
                      </div>
                      {mayorActivities.length > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => mayorActivities.forEach(activity => onDeleteBar(activity.bar.id))}
                          className="text-destructive hover:text-destructive p-1 h-auto"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    
                     <div className="flex-1 relative overflow-x-auto" style={{ minWidth: `${months * 96}px`, minHeight: `${Math.max(60, mayorActivities.length * 40)}px` }}>
                       {/* Week grid cells - clickable background */}
                       {monthHeaders.map(month =>
                         month.weeks.map((_, weekIdx) => (
                           <div
                             key={`${month.number}-${weekIdx}`}
                             className="absolute w-6 h-full border-r border-border/30 hover:bg-accent/20 cursor-pointer"
                             style={{ 
                               left: `${((month.number - 1) * 4 + weekIdx) * 24}px`,
                               height: '100%'
                             }}
                             onClick={() => handleCellClick(month.number, weekIdx + 1, mayor.id)}
                           />
                         ))
                       )}

                       {/* Render activity bars */}
                       {mayorActivities.map((activity, activityIndex) => {
                         const barStyle = getBarStyle(activity.bar, activityIndex);
                         return (
                           <div
                             key={activity.bar.id}
                             className={cn(
                               "absolute bg-primary text-primary-foreground rounded-sm px-2 py-1",
                               "flex items-center justify-center cursor-move select-none",
                               "hover:bg-primary/90 transition-colors text-xs font-medium shadow-sm",
                               "border border-primary-foreground/20",
                               isDragging?.barId === activity.bar.id && "opacity-60"
                             )}
                             style={{ 
                               ...barStyle,
                               zIndex: 20 + activityIndex,
                               minWidth: '24px', // Ensure minimum visibility
                               minHeight: '28px'
                             }}
                             onMouseDown={(e) => handleMouseDown(e, activity.bar.id, 'move')}
                             title={`${activity.bar.mayor?.codigo || 'N/A'} - ${activity.bar.mayor?.nombre || 'Sin nombre'}\nMes ${activity.bar.start_month} Sem ${activity.bar.start_week} → Mes ${activity.bar.end_month} Sem ${activity.bar.end_week}\nDuración: ${activity.bar.duration_weeks} semanas`}
                           >
                             <div 
                               className="absolute left-0 top-0 w-1 h-full bg-primary-foreground/40 cursor-ew-resize rounded-l"
                               onMouseDown={(e) => {
                                 e.stopPropagation();
                                 handleMouseDown(e, activity.bar.id, 'resize-start');
                               }}
                             />
                             <span className="truncate text-center flex-1 px-1">
                               {activity.bar.duration_weeks}w
                             </span>
                             <div 
                               className="absolute right-0 top-0 w-1 h-full bg-primary-foreground/40 cursor-ew-resize rounded-r"
                               onMouseDown={(e) => {
                                 e.stopPropagation();
                                 handleMouseDown(e, activity.bar.id, 'resize-end');
                               }}
                             />
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

        {ganttBars.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No hay actividades programadas.</p>
            <p className="text-sm">Selecciona un Mayor y haz clic en las celdas de semanas para crear barras.</p>
          </div>
        )}
        
        {/* Create Activity Modal */}
        <CronogramaGanttFormModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onSubmit={handleCreateNewBar}
          clienteId={clienteId}
          proyectoId={proyectoId}
          title="Nueva Actividad - Cronograma de Gantt"
        />
      </CardContent>
    </Card>
  );
};