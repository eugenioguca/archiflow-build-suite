import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Edit } from 'lucide-react';
import { GanttLine, GanttActivity } from '@/hooks/gantt-v2/useGantt';
import { Mayor } from '@/hooks/gantt-v2/useMayoresTU';
import { expandRangeToMonthWeekCells } from '@/utils/gantt-v2/weekMath';
import { formatCurrency } from '@/utils/gantt-v2/currency';

interface ActivityRowProps {
  line: GanttLine;
  lines: GanttLine[];
  mayores: Mayor[];
  monthRange: Array<{ value: string; label: string }>;
  onUpdateLine: (params: {id: string, data: Partial<GanttLine>}) => Promise<any>;
  onDeleteLine: (id: string) => Promise<any>;
  onAddActivity: (lineId: string) => void;
  onEditActivity: (activity: GanttActivity) => void;
  onDeleteActivity: (id: string) => Promise<any>;
  isLoading: boolean;
}

export function ActivityRow({
  line,
  lines,
  mayores,
  monthRange,
  onUpdateLine,
  onDeleteLine,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
  isLoading
}: ActivityRowProps) {
  // Calculate subtotal for percentage calculation
  const subtotal = lines.filter(l => !l.is_discount).reduce((sum, l) => sum + (l.amount || 0), 0);
  const percentage = subtotal > 0 && !line.is_discount ? ((line.amount || 0) / subtotal) * 100 : 0;
  
  // Get activities for this line
  const activities = line.activities || [];
  
  // Generate cells covered by activities
  const coveredCells = new Set(
    activities.flatMap(activity =>
      expandRangeToMonthWeekCells(
        activity.start_month,
        activity.start_week,
        activity.end_month,
        activity.end_week
      ).map(cell => `${cell.month}:W${cell.week}`)
    )
  );

  // Find mayor name
  const mayorName = line.mayor?.nombre || line.mayor?.codigo || 'Sin mayor';

  return (
    <TableRow className={line.is_discount ? "bg-red-50/50" : ""}>
      {/* Fixed columns */}
      <TableCell className="sticky left-0 z-10 bg-background border-r text-center font-medium">
        {line.line_no}
      </TableCell>
      
      <TableCell className="sticky left-[60px] z-10 bg-background border-r font-medium">
        {line.is_discount ? line.label || 'Descuento' : mayorName}
      </TableCell>
      
      <TableCell className="sticky left-[260px] z-10 bg-background border-r text-right">
        {formatCurrency(line.amount || 0)}
      </TableCell>
      
      <TableCell className="sticky left-[380px] z-10 bg-background border-r text-right">
        {line.is_discount ? '' : `${percentage.toFixed(2)}%`}
      </TableCell>

      {/* Month columns */}
      {monthRange.map((month) => (
        <TableCell key={month.value} className="p-1 border-r">
          <div className="grid grid-cols-4 gap-0.5 h-8">
            {[1, 2, 3, 4].map((week) => {
              const cellKey = `${month.value}:W${week}`;
              const isCovered = coveredCells.has(cellKey);
              
              return (
                <div key={week} className="relative flex items-center justify-center">
                  {isCovered && (
                    <div className="bg-blue-600 h-3 w-full rounded-sm" />
                  )}
                </div>
              );
            })}
          </div>
        </TableCell>
      ))}
      
      {/* Actions column */}
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddActivity(line.id)}
            disabled={isLoading}
            className="h-8 w-8 p-0"
          >
            <Plus className="h-3 w-3" />
          </Button>
          
          {activities.map((activity) => (
            <Button
              key={activity.id}
              variant="ghost"
              size="sm"
              onClick={() => onEditActivity(activity)}
              disabled={isLoading}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-3 w-3" />
            </Button>
          ))}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDeleteLine(line.id)}
            disabled={isLoading}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}