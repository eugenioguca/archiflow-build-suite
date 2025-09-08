import React from 'react';
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
    <tr className={line.is_discount ? "bg-red-50/50" : ""}>
      {/* Fixed columns */}
      <td className="sticky left-0 z-10 bg-background border-r p-2 text-center text-xs sm:text-sm font-medium">
        {line.line_no}
      </td>
      
      <td className="sticky left-[50px] z-10 bg-background border-r p-2 text-xs sm:text-sm font-medium">
        <span className="truncate block" title={line.is_discount ? line.label || 'Descuento' : mayorName}>
          {line.is_discount ? line.label || 'Descuento' : mayorName}
        </span>
      </td>
      
      <td className="sticky left-[170px] sm:left-[230px] z-10 bg-background border-r p-2 text-xs sm:text-sm text-right">
        <span className="truncate block" title={formatCurrency(line.amount || 0)}>
          {formatCurrency(line.amount || 0)}
        </span>
      </td>
      
      <td className="sticky left-[250px] sm:left-[330px] z-10 bg-background border-r p-2 text-xs sm:text-sm text-right">
        {line.is_discount ? '' : `${percentage.toFixed(2)}%`}
      </td>

      {/* Month columns */}
      {monthRange.map((month) => (
        <td key={month.value} className="p-1 border-r">
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
        </td>
      ))}
      
      {/* Actions column */}
      <td className="text-center p-2">
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEditLine(line)}
            disabled={isLoading}
            className="h-6 w-6 sm:h-8 sm:w-8 p-0"
            title="Editar"
          >
            <Edit className="h-2 w-2 sm:h-3 sm:w-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDeleteLine(line.id)}
            disabled={isLoading}
            className="h-6 w-6 sm:h-8 sm:w-8 p-0 text-destructive hover:text-destructive"
            title="Eliminar"
          >
            <Trash2 className="h-2 w-2 sm:h-3 sm:w-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
}