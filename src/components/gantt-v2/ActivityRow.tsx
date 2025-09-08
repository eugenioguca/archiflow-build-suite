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
  onEditLine: (line: GanttLine) => void;
  isLoading: boolean;
}

export function ActivityRow({
  line,
  lines,
  mayores,
  monthRange,
  onUpdateLine,
  onDeleteLine,
  onEditLine,
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
      {/* Fixed columns - responsive */}
      <TableCell className="sticky left-0 z-20 bg-background border-r text-center font-medium text-xs sm:text-sm">
        {line.line_no}
      </TableCell>
      
      <TableCell className="sticky left-12 sm:left-16 z-20 bg-background border-r font-medium text-xs sm:text-sm">
        <div className="truncate max-w-[120px] sm:max-w-none" title={line.is_discount ? line.label || 'Descuento' : mayorName}>
          {line.is_discount ? line.label || 'Descuento' : mayorName}
        </div>
      </TableCell>
      
      <TableCell className="sticky left-40 sm:left-64 md:left-68 z-20 bg-background border-r text-right text-xs sm:text-sm">
        {formatCurrency(line.amount || 0)}
      </TableCell>
      
      <TableCell className="sticky left-60 sm:left-92 md:left-100 z-20 bg-background border-r text-right text-xs sm:text-sm">
        {line.is_discount ? '' : `${percentage.toFixed(2)}%`}
      </TableCell>

      {/* Month columns - responsive */}
      {monthRange.map((month) => (
        <TableCell key={month.value} className="p-0.5 sm:p-1 border-r">
          <div className="grid grid-cols-4 gap-0.5 h-6 sm:h-8">
            {[1, 2, 3, 4].map((week) => {
              const cellKey = `${month.value}:W${week}`;
              const isCovered = coveredCells.has(cellKey);
              
              return (
                <div key={week} className="relative flex items-center justify-center">
                  {isCovered && (
                    <div className="bg-blue-600 h-2 sm:h-3 w-full rounded-sm" />
                  )}
                </div>
              );
            })}
          </div>
        </TableCell>
      ))}
      
      {/* Actions column - responsive */}
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-0.5 sm:gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEditLine(line)}
            disabled={isLoading}
            className="h-6 w-6 sm:h-8 sm:w-8 p-0 touch-manipulation"
          >
            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDeleteLine(line.id)}
            disabled={isLoading}
            className="h-6 w-6 sm:h-8 sm:w-8 p-0 text-destructive hover:text-destructive touch-manipulation"
          >
            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}