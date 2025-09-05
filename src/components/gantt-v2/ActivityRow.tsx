import React, { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit2, Trash2, Plus, GripVertical } from 'lucide-react';
import { GanttLine, GanttActivity } from '@/hooks/gantt-v2/useGantt';
import { Mayor } from '@/hooks/gantt-v2/useMayoresTU';
import { MoneyInput } from '@/components/ui/money-input';
import { formatCurrency } from '@/utils/gantt-v2/currency';
import { expandRangeToMonthWeekCells, keyMW } from '@/utils/gantt-v2/weekMath';

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
  const [editingAmount, setEditingAmount] = useState(false);

  // Calculate subtotal for percentage calculation
  const subtotal = lines
    .filter((l: any) => !l.is_discount)
    .reduce((sum: number, l: any) => sum + (l.amount || 0), 0);
  
  const percentage = subtotal > 0 ? ((line.amount || 0) / subtotal * 100) : 0;

  // Calculate which cells to fill
  const cellsToFill = new Set(
    (line.activities || []).flatMap((activity: any) =>
      expandRangeToMonthWeekCells(
        activity.start_month,
        activity.start_week,
        activity.end_month,
        activity.end_week
      ).map(cell => `${cell.month}:W${cell.week}`)
    )
  );

  const handleAmountSave = async (newAmount: number) => {
    if (newAmount !== line.amount) {
      await onUpdateLine({
        id: line.id,
        data: { amount: newAmount }
      });
    }
    setEditingAmount(false);
  };

  const handleMayorChange = async (mayorId: string) => {
    await onUpdateLine({
      id: line.id,
      data: { mayor_id: mayorId }
    });
  };

  const handleLabelChange = async (label: string) => {
    await onUpdateLine({
      id: line.id,
      data: { label }
    });
  };

  return (
    <TableRow>
      {/* Line Number */}
      <TableCell className="sticky left-0 z-10 bg-background border-r text-center">
        <div className="flex items-center justify-center gap-1">
          <GripVertical className="h-3 w-3 text-muted-foreground" />
          <span className="font-mono text-sm">{line.line_no}</span>
        </div>
      </TableCell>

      {/* Mayor/Label */}
      <TableCell className="sticky left-[60px] z-10 bg-background border-r">
        {line.is_discount ? (
          <Input
            value={line.label || ''}
            onChange={(e) => handleLabelChange(e.target.value)}
            placeholder="Nombre del descuento"
            className="border-none p-0 h-auto focus:ring-0"
            disabled={isLoading}
          />
        ) : (
          <div className="text-sm">
            {line.mayor ? (
              <div>
                <span className="font-mono text-xs text-muted-foreground">{line.mayor.codigo}</span>
                <span className="ml-2">{line.mayor.nombre}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">Sin mayor asignado</span>
            )}
          </div>
        )}
      </TableCell>

      {/* Amount */}
      <TableCell className="px-2 py-3 text-right font-medium">
        {formatCurrency(line.amount || 0)}
      </TableCell>
      <TableCell className="px-2 py-3 text-right text-sm text-muted-foreground">
        {percentage.toFixed(2)}%
      </TableCell>

      {/* Week Columns */}
      {monthRange.map((month) => (
        <TableCell key={month.value} className="p-0 border-r">
          <div className="grid grid-cols-4 gap-0 h-10">
            {[1, 2, 3, 4].map((week) => {
              const cellKey = `${month.value}:W${week}`;
              const filled = cellsToFill.has(cellKey);
              
              return (
                <div
                  key={week}
                  className={`flex items-center justify-center border-r last:border-r-0 ${
                    !line.is_discount ? 'cursor-pointer hover:bg-accent' : ''
                  }`}
                  onClick={() => !line.is_discount && onAddActivity(line.id)}
                >
                  {filled && <div className="bg-blue-600 h-3 w-full rounded-sm" />}
                </div>
              );
            })}
          </div>
        </TableCell>
      ))}

      {/* Actions */}
      <TableCell>
        <div className="flex items-center gap-1">
          {!line.is_discount && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onAddActivity(line.id)}
              disabled={isLoading}
              className="h-6 w-6 p-0"
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDeleteLine(line.id)}
            disabled={isLoading}
            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}