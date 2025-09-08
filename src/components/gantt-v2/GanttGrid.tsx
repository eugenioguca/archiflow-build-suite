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
      <CardHeader className="pb-2 sm:pb-4">
        <CardTitle className="text-lg sm:text-xl">Cronograma de Gantt</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className="min-w-max">
            <TableHeader>
              <TableRow>
                {/* Fixed columns with proper sticky positioning */}
                <TableHead className="sticky left-0 z-20 bg-background border-r w-12 sm:w-16 text-xs sm:text-sm">
                  No.
                </TableHead>
                <TableHead className="sticky left-12 sm:left-16 z-20 bg-background border-r w-32 sm:w-48 lg:w-56 text-xs sm:text-sm">
                  Mayor
                </TableHead>
                <TableHead className="sticky left-44 sm:left-64 lg:left-72 z-20 bg-background border-r w-20 sm:w-28 text-xs sm:text-sm text-right">
                  Importe
                </TableHead>
                <TableHead className="sticky left-64 sm:left-92 lg:left-100 z-20 bg-background border-r w-12 sm:w-16 text-xs sm:text-sm text-right">
                  %
                </TableHead>
                
                {/* Month columns */}
                {monthRange.map((month) => (
                  <TableHead key={month.value} className="text-center min-w-[100px] sm:min-w-[120px] border-r">
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
                
                {/* Actions column */}
                <TableHead className="min-w-[80px] sm:min-w-[100px] text-xs sm:text-sm">Acciones</TableHead>
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
                <TableCell className="sticky left-0 z-20 bg-muted/50 border-r"></TableCell>
                <TableCell className="sticky left-12 sm:left-16 z-20 bg-muted/50 border-r text-xs sm:text-sm">
                  SUBTOTAL
                </TableCell>
                <TableCell className="sticky left-44 sm:left-64 lg:left-72 z-20 bg-muted/50 border-r text-right text-xs sm:text-sm">
                  {formatCurrency(subtotal)}
                </TableCell>
                <TableCell className="sticky left-64 sm:left-92 lg:left-100 z-20 bg-muted/50 border-r text-right text-xs sm:text-sm">
                  100.00%
                </TableCell>
                {monthRange.map((month) => (
                  <TableCell key={month.value} className="border-r"></TableCell>
                ))}
                <TableCell></TableCell>
              </TableRow>
              
              {/* Discount Lines */}
              {discountLines.map((line) => (
                <TableRow key={line.id} className="bg-red-50/50">
                  <TableCell className="sticky left-0 z-20 bg-red-50/50 border-r"></TableCell>
                  <TableCell className="sticky left-12 sm:left-16 z-20 bg-red-50/50 border-r font-medium text-xs sm:text-sm truncate" title={line.label || 'Descuento'}>
                    {line.label || 'Descuento'}
                  </TableCell>
                  <TableCell className="sticky left-44 sm:left-64 lg:left-72 z-20 bg-red-50/50 border-r text-right text-red-600 text-xs sm:text-sm">
                    -{formatCurrency(line.amount || 0)}
                  </TableCell>
                  <TableCell className="sticky left-64 sm:left-92 lg:left-100 z-20 bg-red-50/50 border-r"></TableCell>
                  {monthRange.map((month) => (
                    <TableCell key={month.value} className="border-r bg-red-50/50"></TableCell>
                  ))}
                  <TableCell className="text-center bg-red-50/50">
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
                </TableRow>
              ))}
              
              {/* Total Row */}
              <TableRow className="bg-primary/10 font-bold border-t-2">
                <TableCell className="sticky left-0 z-20 bg-primary/10 border-r"></TableCell>
                <TableCell className="sticky left-12 sm:left-16 z-20 bg-primary/10 border-r text-xs sm:text-sm">
                  TOTAL
                </TableCell>
                <TableCell className="sticky left-44 sm:left-64 lg:left-72 z-20 bg-primary/10 border-r text-right text-xs sm:text-sm">
                  {formatCurrency(total)}
                </TableCell>
                <TableCell className="sticky left-64 sm:left-92 lg:left-100 z-20 bg-primary/10 border-r text-right text-xs sm:text-sm">
                  {subtotal > 0 ? ((total / subtotal) * 100).toFixed(2) : '0.00'}%
                </TableCell>
                {monthRange.map((month) => (
                  <TableCell key={month.value} className="border-r"></TableCell>
                ))}
                <TableCell></TableCell>
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