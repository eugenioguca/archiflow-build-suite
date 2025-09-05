import React, { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit2, Trash2, Plus, GripVertical } from 'lucide-react';
import { GanttLine, GanttActivity } from '@/hooks/gantt-v2/useGantt';
import { Mayor } from '@/hooks/gantt-v2/useMayoresTU';
import { MoneyInput } from '@/components/ui/money-input';
import { expandRangeToMonthWeekCells, keyMW } from '@/utils/gantt-v2/weekMath';

interface ActivityRowProps {
  line: GanttLine;
  mayores: Mayor[];
  monthRange: Array<{ value: string; label: string }>;
  subtotal: number;
  onUpdateLine: (params: {id: string, data: Partial<GanttLine>}) => Promise<any>;
  onDeleteLine: (id: string) => Promise<any>;
  onAddActivity: (lineId: string) => void;
  onEditActivity: (activity: GanttActivity) => void;
  onDeleteActivity: (id: string) => Promise<any>;
  isLoading: boolean;
}

export function ActivityRow({
  line,
  mayores,
  monthRange,
  subtotal,
  onUpdateLine,
  onDeleteLine,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
  isLoading
}: ActivityRowProps) {
  const [editingAmount, setEditingAmount] = useState(false);

  // Calculate which cells are active based on activities
  const activeCells = new Set<string>();
  if (line.activities) {
    line.activities.forEach(activity => {
      const cells = expandRangeToMonthWeekCells(
        activity.start_month,
        activity.start_week,
        activity.end_month,
        activity.end_week
      );
      cells.forEach(cell => {
        activeCells.add(keyMW(cell.month, cell.week));
      });
    });
  }

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

  const calculatedPercent = subtotal > 0 ? (line.amount / subtotal) * 100 : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(amount);
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
          <Select 
            value={line.mayor_id || ''} 
            onValueChange={handleMayorChange}
            disabled={isLoading}
          >
            <SelectTrigger className="border-none p-0 h-auto focus:ring-0">
              <SelectValue placeholder="Seleccionar Mayor" />
            </SelectTrigger>
            <SelectContent>
              {mayores.map((mayor) => (
                <SelectItem key={mayor.id} value={mayor.id}>
                  <div>
                    <span className="font-mono text-xs text-muted-foreground">{mayor.codigo}</span>
                    <span className="ml-2">{mayor.nombre}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </TableCell>

      {/* Amount */}
      <TableCell className="sticky left-[260px] z-10 bg-background border-r">
        {editingAmount ? (
          <MoneyInput
            value={line.amount}
            onChange={handleAmountSave}
            onBlur={() => setEditingAmount(false)}
            className="h-6 text-sm"
            autoFocus
          />
        ) : (
          <div 
            className="cursor-pointer hover:bg-accent px-1 py-1 rounded"
            onClick={() => setEditingAmount(true)}
          >
            {formatCurrency(line.amount)}
          </div>
        )}
      </TableCell>

      {/* Percentage */}
      <TableCell className="sticky left-[380px] z-10 bg-background border-r text-right">
        {!line.is_discount && (
          <span className="text-sm font-mono">
            {calculatedPercent.toFixed(2)}%
          </span>
        )}
      </TableCell>

      {/* Week Columns */}
      {monthRange.map((month) => (
        <TableCell key={month.value} className="p-0 border-r">
          <div className="grid grid-cols-4 gap-0 h-10">
            {[1, 2, 3, 4].map((week) => {
              const cellKey = keyMW(month.value, week);
              const isActive = activeCells.has(cellKey);
              
              return (
                <div
                  key={week}
                  className={`flex items-center justify-center border-r last:border-r-0 ${
                    !line.is_discount ? 'cursor-pointer hover:bg-accent' : ''
                  }`}
                  onClick={() => !line.is_discount && onAddActivity(line.id)}
                >
                  {isActive && !line.is_discount && (
                    <div className="bg-blue-500 h-3 w-full rounded-sm" />
                  )}
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