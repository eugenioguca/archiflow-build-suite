import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { GanttPlan, GanttLine, GanttActivity } from '@/hooks/gantt-v2/useGantt';
import { Mayor } from '@/hooks/gantt-v2/useMayoresTU';
import { ActivityRow } from './ActivityRow';
import { generateMonthRange } from '@/utils/gantt-v2/monthRange';
import { formatCurrency } from '@/utils/gantt-v2/currency';

interface GanttGridProps {
  plan?: GanttPlan | null;
  lines: GanttLine[];
  mayores: Mayor[];
  onUpdateLine: (params: {id: string, data: Partial<GanttLine>}) => Promise<any>;
  onDeleteLine: (id: string) => Promise<any>;
  onEditLine: (line: GanttLine) => void;
  isLoading: boolean;
  isFetching?: boolean;
}

export function GanttGrid({
  plan,
  lines,
  mayores,
  onUpdateLine,
  onDeleteLine,
  onEditLine,
  isLoading,
  isFetching = false
}: GanttGridProps) {
  if (!plan) return null;

  const monthRange = generateMonthRange(plan.start_month, plan.months_count);
  
  // Calculate totals
  const mayorLines = lines.filter(line => !line.is_discount);
  const discountLines = lines.filter(line => line.is_discount);
  const subtotal = mayorLines.reduce((sum, line) => sum + (line.amount || 0), 0);
  const totalDiscounts = discountLines.reduce((sum, line) => sum + (line.amount || 0), 0);
  const total = subtotal - totalDiscounts; // Subtract discounts from subtotal

  return (
    <Card className="relative">
      <CardHeader>
        <CardTitle>Cronograma de Gantt</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-max border-collapse w-full">
            <thead>
              <tr>
                {/* Fixed sticky columns */}
                <th className="sticky left-0 z-10 bg-background border-r min-w-[50px] p-2 text-left text-sm font-medium">
                  No.
                </th>
                <th className="sticky left-[50px] z-10 bg-background border-r min-w-[150px] p-2 text-left text-sm font-medium">
                  <span className="truncate block" title="Mayor">Mayor</span>
                </th>
                <th className="sticky left-[200px] z-10 bg-background border-r min-w-[100px] p-2 text-left text-sm font-medium">
                  <span className="truncate block" title="Importe">Importe</span>
                </th>
                <th className="sticky left-[300px] z-10 bg-background border-r min-w-[60px] p-2 text-left text-sm font-medium">
                  %
                </th>
                
                {/* Month columns - scrollable */}
                {monthRange.map((month) => (
                  <th key={month.value} className="text-center min-w-[100px] border-r p-2">
                    <div className="space-y-1">
                      <div className="font-semibold text-xs">{month.label}</div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>W1</span>
                        <span>W2</span>
                        <span>W3</span>
                        <span>W4</span>
                      </div>
                    </div>
                  </th>
                ))}
                
                {/* Actions column */}
                <th className="min-w-[80px] p-2 text-center text-sm font-medium">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Mayor Lines */}
              {mayorLines.map((line) => (
                <ActivityRow
                  key={line.id}
                  line={line}
                  lines={lines}
                  mayores={mayores}
                  monthRange={monthRange}
                  onUpdateLine={onUpdateLine}
                  onDeleteLine={onDeleteLine}
                  onEditLine={onEditLine}
                  isLoading={isLoading || isFetching}
                />
              ))}
              
              {/* Subtotal Row */}
              <tr className="bg-muted/50 font-medium">
                <td className="sticky left-0 z-10 bg-muted/50 border-r p-2"></td>
                <td className="sticky left-[50px] z-10 bg-muted/50 border-r p-2 text-sm">
                  <span className="truncate block" title="SUBTOTAL">SUBTOTAL</span>
                </td>
                <td className="sticky left-[200px] z-10 bg-muted/50 border-r p-2 text-sm text-right">
                  <span className="truncate block" title={formatCurrency(subtotal)}>
                    {formatCurrency(subtotal)}
                  </span>
                </td>
                <td className="sticky left-[300px] z-10 bg-muted/50 border-r p-2 text-sm text-right">100.00%</td>
                {monthRange.map((month) => (
                  <td key={month.value} className="border-r p-2"></td>
                ))}
                <td className="p-2"></td>
              </tr>
              
              {/* Discount Lines */}
              {discountLines.map((line) => (
                <tr key={line.id} className="bg-red-50/50">
                  <td className="sticky left-0 z-10 bg-red-50/50 border-r p-2"></td>
                  <td className="sticky left-[50px] z-10 bg-red-50/50 border-r p-2 text-sm font-medium">
                    <span className="truncate block" title={line.label || 'Descuento'}>
                      {line.label || 'Descuento'}
                    </span>
                  </td>
                  <td className="sticky left-[200px] z-10 bg-red-50/50 border-r p-2 text-sm text-right text-red-600">
                    <span className="truncate block" title={`-${formatCurrency(line.amount || 0)}`}>
                      -{formatCurrency(line.amount || 0)}
                    </span>
                  </td>
                  <td className="sticky left-[300px] z-10 bg-red-50/50 border-r p-2"></td>
                  {monthRange.map((month) => (
                    <td key={month.value} className="border-r bg-red-50/50 p-2"></td>
                  ))}
                  <td className="text-center bg-red-50/50 p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteLine(line.id)}
                      disabled={isLoading || isFetching}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
              
              {/* Total Row */}
              <tr className="bg-primary/10 font-bold border-t-2">
                <td className="sticky left-0 z-10 bg-primary/10 border-r p-2"></td>
                <td className="sticky left-[50px] z-10 bg-primary/10 border-r p-2 text-sm">
                  <span className="truncate block" title="TOTAL">TOTAL</span>
                </td>
                <td className="sticky left-[200px] z-10 bg-primary/10 border-r p-2 text-sm text-right">
                  <span className="truncate block" title={formatCurrency(total)}>
                    {formatCurrency(total)}
                  </span>
                </td>
                <td className="sticky left-[300px] z-10 bg-primary/10 border-r p-2 text-sm text-right">
                  {subtotal > 0 ? ((total / subtotal) * 100).toFixed(2) : '0.00'}%
                </td>
                {monthRange.map((month) => (
                  <td key={month.value} className="border-r p-2"></td>
                ))}
                <td className="p-2"></td>
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* Loading overlay - only show during initial load */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Cargando cronograma...</p>
            </div>
          </div>
        )}
        
        {lines.length === 0 && !isLoading && !isFetching && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-muted-foreground">
              <p className="text-lg font-medium mb-2">Sin líneas en el cronograma</p>
              <p className="text-sm">Usa los botones "Añadir Mayor" o "Añadir Descuento" para comenzar.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}