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
    <Card className="gantt-container relative">
      <CardHeader className="pb-2 sm:pb-4">
        <CardTitle className="text-lg sm:text-xl">Cronograma de Gantt</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="gantt-scroll-container">
          <Table className="gantt-table">
            <TableHeader className="gantt-header">
              <TableRow>
                {/* Actions column - moved to first position */}
                <TableHead className="gantt-freeze-actions col-actions text-xs sm:text-sm bg-muted/30 border-r">Acciones</TableHead>
                
                {/* Fixed columns with proper sticky positioning */}
                <TableHead className="gantt-freeze-no col-no text-xs sm:text-sm text-center font-semibold bg-muted/30 border-r">
                  No.
                </TableHead>
                <TableHead className="gantt-freeze-mayor col-mayor text-xs sm:text-sm font-semibold bg-muted/30 border-r">
                  Mayor
                </TableHead>
                <TableHead className="gantt-freeze-importe col-importe text-xs sm:text-sm text-right font-semibold bg-muted/30 border-r">
                  Importe
                </TableHead>
                <TableHead className="gantt-freeze-pct col-pct text-xs sm:text-sm text-right font-semibold bg-muted/30 border-r">
                  %
                </TableHead>
                
                {/* Month columns */}
                {monthRange.map((month) => (
                  <TableHead key={month.value} className="gantt-month-col text-center bg-muted/20 border-x">
                    <div className="space-y-1">
                      <div className="font-semibold text-xs">{month.label}</div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>W1</span>
                        <span>W2</span>
                        <span>W3</span>
                        <span>W4</span>
                      </div>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
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
              <TableRow className="bg-muted/50 font-medium">
                <TableCell className="gantt-freeze-actions col-actions bg-muted/50 border-r"></TableCell>
                <TableCell className="gantt-freeze-no col-no text-center font-semibold bg-muted/50 border-r"></TableCell>
                <TableCell className="gantt-freeze-mayor col-mayor font-semibold bg-muted/50 border-r text-xs sm:text-sm">
                  SUBTOTAL
                </TableCell>
                <TableCell className="gantt-freeze-importe col-importe text-right font-semibold bg-muted/50 border-r text-xs sm:text-sm">
                  {formatCurrency(subtotal)}
                </TableCell>
                <TableCell className="gantt-freeze-pct col-pct text-center font-semibold bg-muted/50 border-r text-xs sm:text-sm">
                  100.00%
                </TableCell>
                {monthRange.map((month) => (
                  <TableCell key={month.value} className="border-r"></TableCell>
                ))}
              </TableRow>
              
              {/* Discount Lines */}
              {discountLines.map((line) => (
                <TableRow key={line.id} className="bg-red-50/50 border-l-2 border-red-200">
                  <TableCell className="gantt-freeze-actions col-actions text-center bg-red-50/50 border-r">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteLine(line.id)}
                      disabled={isLoading || isFetching}
                      className="h-6 w-6 sm:h-8 sm:w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-2 w-2 sm:h-3 sm:w-3" />
                    </Button>
                  </TableCell>
                  <TableCell className="gantt-freeze-no col-no text-center bg-red-50/50 border-r"></TableCell>
                  <TableCell className="gantt-freeze-mayor col-mayor bg-red-50/50 border-r font-medium text-xs sm:text-sm truncate" title={line.label || 'Descuento'}>
                    {line.label || 'Descuento'}
                  </TableCell>
                  <TableCell className="gantt-freeze-importe col-importe bg-red-50/50 border-r text-right text-red-600 text-xs sm:text-sm">
                    -{formatCurrency(line.amount || 0)}
                  </TableCell>
                  <TableCell className="gantt-freeze-pct col-pct text-center bg-red-50/50 border-r text-xs sm:text-sm">
                    {subtotal > 0 ? (((line.amount || 0) / subtotal) * 100).toFixed(2) : '0.00'}%
                  </TableCell>
                  {monthRange.map((month) => (
                    <TableCell key={month.value} className="border-r bg-red-50/50"></TableCell>
                  ))}
                </TableRow>
              ))}
              
              {/* Total Row */}
              <TableRow className="font-bold bg-primary/10 border-l-2 border-primary border-t-2">
                <TableCell className="gantt-freeze-actions col-actions bg-primary/10 border-r"></TableCell>
                <TableCell className="gantt-freeze-no col-no text-center bg-primary/10 border-r"></TableCell>
                <TableCell className="gantt-freeze-mayor col-mayor bg-primary/10 border-r text-xs sm:text-sm">
                  TOTAL
                </TableCell>
                <TableCell className="gantt-freeze-importe col-importe text-right bg-primary/10 border-r text-xs sm:text-sm">
                  {formatCurrency(total)}
                </TableCell>
                <TableCell className="gantt-freeze-pct col-pct text-center bg-primary/10 border-r text-xs sm:text-sm">
                  100%
                </TableCell>
                {monthRange.map((month) => (
                  <TableCell key={month.value} className="border-r"></TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
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