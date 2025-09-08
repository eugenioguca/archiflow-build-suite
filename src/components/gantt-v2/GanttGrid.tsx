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
        <div className="relative">
          {/* Scroll indicator for mobile */}
          <div className="sm:hidden absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-background/80 to-transparent z-20 pointer-events-none opacity-60" />
          
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  {/* Fixed columns - responsive widths */}
                  <TableHead className="sticky left-0 z-20 bg-background border-r w-12 sm:w-16 min-w-[48px] sm:min-w-[60px] text-xs sm:text-sm">
                    No.
                  </TableHead>
                  <TableHead className="sticky left-12 sm:left-16 z-20 bg-background border-r w-28 sm:w-48 md:w-52 min-w-[120px] sm:min-w-[200px] text-xs sm:text-sm">
                    Mayor
                  </TableHead>
                  <TableHead className="sticky left-40 sm:left-64 md:left-68 z-20 bg-background border-r w-20 sm:w-28 md:w-32 min-w-[80px] sm:min-w-[120px] text-xs sm:text-sm">
                    Importe
                  </TableHead>
                  <TableHead className="sticky left-60 sm:left-92 md:left-100 z-20 bg-background border-r w-16 sm:w-20 min-w-[60px] sm:min-w-[80px] text-xs sm:text-sm">
                    %
                  </TableHead>
                  
                  {/* Month columns - responsive */}
                  {monthRange.map((month) => (
                    <TableHead key={month.value} className="text-center border-r w-20 sm:w-28 md:w-32 min-w-[80px] sm:min-w-[120px]">
                      <div className="space-y-1">
                        <div className="font-semibold text-xs sm:text-sm">{month.label}</div>
                        <div className="hidden sm:flex justify-between text-xs text-muted-foreground">
                          <span>W1</span>
                          <span>W2</span>
                          <span>W3</span>
                          <span>W4</span>
                        </div>
                        {/* Mobile week indicators */}
                        <div className="flex sm:hidden justify-center text-xs text-muted-foreground">
                          <span>Sem</span>
                        </div>
                      </div>
                    </TableHead>
                  ))}
                  
                  {/* Actions column - responsive */}
                  <TableHead className="w-16 sm:w-24 min-w-[64px] sm:min-w-[100px] text-xs sm:text-sm">
                    Acciones
                  </TableHead>
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
                <TableCell className="sticky left-0 z-20 bg-muted/50 border-r text-xs sm:text-sm"></TableCell>
                <TableCell className="sticky left-12 sm:left-16 z-20 bg-muted/50 border-r text-xs sm:text-sm font-semibold">
                  SUBTOTAL
                </TableCell>
                <TableCell className="sticky left-40 sm:left-64 md:left-68 z-20 bg-muted/50 border-r text-xs sm:text-sm">
                  {formatCurrency(subtotal)}
                </TableCell>
                <TableCell className="sticky left-60 sm:left-92 md:left-100 z-20 bg-muted/50 border-r text-xs sm:text-sm">
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
                  <TableCell className="sticky left-0 z-20 bg-red-50/50 border-r text-xs sm:text-sm"></TableCell>
                  <TableCell className="sticky left-12 sm:left-16 z-20 bg-red-50/50 border-r font-medium text-xs sm:text-sm">
                    {line.label || 'Descuento'}
                  </TableCell>
                  <TableCell className="sticky left-40 sm:left-64 md:left-68 z-20 bg-red-50/50 border-r text-right text-red-600 text-xs sm:text-sm">
                    -{formatCurrency(line.amount || 0)}
                  </TableCell>
                  <TableCell className="sticky left-60 sm:left-92 md:left-100 z-20 bg-red-50/50 border-r text-xs sm:text-sm"></TableCell>
                  {monthRange.map((month) => (
                    <TableCell key={month.value} className="border-r bg-red-50/50"></TableCell>
                  ))}
                  <TableCell className="text-center bg-red-50/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteLine(line.id)}
                      disabled={isLoading || isFetching}
                      className="h-6 w-6 sm:h-8 sm:w-8 p-0 text-destructive hover:text-destructive touch-manipulation"
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              
              {/* Total Row */}
              <TableRow className="bg-primary/10 font-bold border-t-2">
                <TableCell className="sticky left-0 z-20 bg-primary/10 border-r text-xs sm:text-sm"></TableCell>
                <TableCell className="sticky left-12 sm:left-16 z-20 bg-primary/10 border-r text-xs sm:text-sm font-bold">
                  TOTAL
                </TableCell>
                <TableCell className="sticky left-40 sm:left-64 md:left-68 z-20 bg-primary/10 border-r text-xs sm:text-sm">
                  {formatCurrency(total)}
                </TableCell>
                <TableCell className="sticky left-60 sm:left-92 md:left-100 z-20 bg-primary/10 border-r text-xs sm:text-sm">
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