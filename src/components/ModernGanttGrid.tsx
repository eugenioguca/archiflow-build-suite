import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  generateMonthRange, 
  formatMonthShort, 
  expandRangeToMonthWeekCells,
  isCellFilled,
  GanttCell
} from '@/utils/cronogramaWeekUtils';

interface GanttActivity {
  id: string;
  cliente_id: string;
  proyecto_id: string;
  departamento: string;
  mayor_id: string;
  start_month: string; // YYYY-MM
  start_week: number;
  end_month: string; // YYYY-MM
  end_week: number;
  duration_weeks: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  mayor?: { id: string; codigo: string; nombre: string };
}

interface Mayor {
  id: string;
  codigo: string;
  nombre: string;
}

interface ModernGanttGridProps {
  activities: GanttActivity[];
  mayores: Mayor[];
  months: number;
  isLoading: boolean;
  onAddActivity: (monthStr: string, week: number, mayorId: string) => void;
  onEditActivity: (activity: GanttActivity) => void;
  onDeleteActivity: (activityId: string) => void;
}

export const ModernGanttGrid: React.FC<ModernGanttGridProps> = ({
  activities,
  mayores,
  months,
  isLoading,
  onAddActivity,
  onEditActivity,
  onDeleteActivity
}) => {
  const [zoom, setZoom] = useState<'normal' | 'compact' | 'wide'>('normal');
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  
  const gridRef = useRef<HTMLDivElement>(null);
  
  // Generate month headers
  const monthHeaders = generateMonthRange(0, months);
  
  // Process activities for individual row display
  const processedActivities = React.useMemo(() => {
    return activities.map(activity => {
      const cells = expandRangeToMonthWeekCells(
        { month: activity.start_month, week: activity.start_week },
        { month: activity.end_month, week: activity.end_week }
      );
      
      return {
        activity,
        cells,
        mayor: activity.mayor || mayores.find(m => m.id === activity.mayor_id)
      };
    });
  }, [activities, mayores]);

  // Get cell dimensions based on zoom level
  const getCellDimensions = useCallback(() => {
    switch (zoom) {
      case 'compact':
        return { width: 'w-4', height: 'h-8', fontSize: 'text-xs' };
      case 'wide':
        return { width: 'w-10', height: 'h-12', fontSize: 'text-sm' };
      default:
        return { width: 'w-6', height: 'h-10', fontSize: 'text-xs' };
    }
  }, [zoom]);

  const cellDims = getCellDimensions();

  // Handle activity bar click for editing
  const handleActivityClick = useCallback((activity: GanttActivity, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedActivity(activity.id);
  }, []);

  // Handle activity edit
  const handleEditClick = useCallback((activity: GanttActivity, e: React.MouseEvent) => {
    e.stopPropagation();
    onEditActivity(activity);
  }, [onEditActivity]);

  // Handle activity delete
  const handleDeleteClick = useCallback((activityId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteActivity(activityId);
  }, [onDeleteActivity]);

  // Render activity bar within a cell for individual activity rows
  const renderActivityBar = useCallback((processedActivity: any, monthStr: string, week: number) => {
    const { activity, cells } = processedActivity;
    const isInCell = isCellFilled(monthStr, week, cells);
    if (!isInCell) return null;

    const isSelected = selectedActivity === activity.id;
    const isFirstCell = cells[0]?.month === monthStr && cells[0]?.week === week;
    const isLastCell = cells[cells.length - 1]?.month === monthStr && cells[cells.length - 1]?.week === week;

    return (
      <div
        key={`${activity.id}-${monthStr}-${week}`}
        className={cn(
          "absolute inset-1 rounded-sm cursor-pointer transition-all duration-200",
          "bg-primary hover:bg-primary/80 border border-primary-foreground/20",
          "flex items-center justify-center text-xs font-medium text-primary-foreground",
          "hover:shadow-md hover:z-10",
          isSelected && "ring-2 ring-ring ring-offset-1 z-20",
          isFirstCell && "rounded-l-md",
          isLastCell && "rounded-r-md"
        )}
        onClick={(e) => handleActivityClick(activity, e)}
        title={`${activity.start_month} S${activity.start_week} → ${activity.end_month} S${activity.end_week}\nDuración: ${activity.duration_weeks} semanas`}
      >
        {isFirstCell && (
          <div className="flex items-center gap-1 px-1 w-full justify-between">
            <span className="truncate text-xs font-medium">{activity.duration_weeks}s</span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-4 w-4 p-0 hover:bg-primary-foreground/20"
                onClick={(e) => handleEditClick(activity, e)}
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-4 w-4 p-0 hover:bg-destructive/20 text-destructive-foreground"
                onClick={(e) => handleDeleteClick(activity.id, e)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }, [selectedActivity, handleActivityClick, handleEditClick, handleDeleteClick]);

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
    <Card className="shadow-lg border-0 bg-gradient-to-br from-background to-accent/5">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            📊 Cronograma Visual Interactivo
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddActivity(monthHeaders[0], 1, mayores[0]?.id || '')}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Añadir Actividad
            </Button>
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button
                variant={zoom === 'compact' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setZoom('compact')}
                className="h-8 px-2"
              >
                <ZoomOut className="h-3 w-3" />
              </Button>
              <Button
                variant={zoom === 'normal' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setZoom('normal')}
                className="h-8 px-2"
              >
                Normal
              </Button>
              <Button
                variant={zoom === 'wide' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setZoom('wide')}
                className="h-8 px-2"
              >
                <ZoomIn className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-auto border-t">
          <div className="min-w-max" ref={gridRef}>
            {/* Header with months and weeks */}
            <div className="sticky top-0 z-30 bg-background border-b-2 border-border">
              <div className="flex">
                <div className="w-56 p-3 bg-muted font-semibold border-r border-border sticky left-0 z-40">
                  <div className="text-sm font-bold">Actividades</div>
                  <div className="text-xs text-muted-foreground">
                    {activities.length} actividad{activities.length !== 1 ? 'es' : ''}
                  </div>
                </div>
                {monthHeaders.map(monthStr => (
                  <div key={monthStr} className="border-r border-border">
                    <div className="p-2 bg-primary text-primary-foreground text-center font-semibold text-sm">
                      {formatMonthShort(monthStr)}
                    </div>
                    <div className="flex">
                      {[1, 2, 3, 4].map(week => (
                        <div 
                          key={`${monthStr}-${week}`} 
                          className={cn(
                            cellDims.width,
                            "p-1 bg-muted text-center border-r border-border last:border-r-0",
                            cellDims.fontSize,
                            "font-medium"
                          )}
                        >
                          W{week}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gantt rows - One row per activity */}
            <div className="relative">
              {processedActivities.map((processedActivity, activityIndex) => {
                const { activity, mayor } = processedActivity;
                
                return (
                  <div 
                    key={activity.id} 
                    className={cn(
                      "flex border-b border-border hover:bg-accent/30 transition-colors",
                      activityIndex % 2 === 0 ? "bg-background" : "bg-accent/10"
                    )}
                    style={{ height: '48px' }} // Fixed compact height
                  >
                    {/* Mayor info column */}
                    <div className="w-56 p-3 border-r border-border flex items-center sticky left-0 z-20 bg-inherit">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">
                          {mayor?.codigo || 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {mayor?.nombre || 'Mayor no encontrado'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Timeline cells */}
                    <div className="flex-1 relative h-full">
                      <div className="flex h-full">
                        {monthHeaders.map(monthStr =>
                          [1, 2, 3, 4].map(week => (
                            <div
                              key={`${monthStr}-${week}`}
                              className={cn(
                                "relative border-r border-border/30",
                                cellDims.width,
                                "h-full"
                              )}
                            >
                              {/* Render activity bar for this cell */}
                              {renderActivityBar(processedActivity, monthStr, week)}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Empty state */}
        {activities.length === 0 && !isLoading && (
          <div className="text-center py-12 px-4">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Sin actividades programadas</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Comienza creando tu primera actividad. Las actividades se mostrarán como barras 
                horizontales que se pueden editar y eliminar directamente desde el cronograma.
              </p>
              <Button
                onClick={() => onAddActivity(monthHeaders[0], 1, mayores[0]?.id || '')}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Crear Primera Actividad
              </Button>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="p-4 bg-muted/30 border-t text-sm">
          <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 bg-primary rounded-sm"></div>
              <span>Actividad programada</span>
            </div>
            <div className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              <span>Editar actividad</span>
            </div>
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              <span>Eliminar actividad</span>
            </div>
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>Usar botón "Añadir Actividad" para crear nueva</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};