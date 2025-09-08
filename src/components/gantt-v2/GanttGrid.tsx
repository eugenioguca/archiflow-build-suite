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
    <Card className="relative flex-1 min-h-0 flex flex-col">
      <CardHeader className="flex-shrink-0 pb-3">
        <CardTitle className="text-lg">Cronograma de Gantt</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0">
        <div className="relative h-full flex flex-col">
          {/* Scroll indicator for mobile */}
          <div className="sm:hidden absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-background/80 to-transparent z-20 pointer-events-none opacity-60" />
          
          <div className="flex-1 min-h-0 overflow-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  {/* Fixed columns - dynamic widths */}
                  <TableHead className="sticky left-0 z-20 bg-background border-r w-8 sm:w-10 text-xs">
                    No.
                  </TableHead>
                  <TableHead className="sticky left-8 sm:left-10 z-20 bg-background border-r w-28 sm:w-32 lg:w-36 text-xs">
                    <span className="truncate">Mayor</span>
                  </TableHead>
                  <TableHead className="sticky left-36 sm:left-42 lg:left-46 z-20 bg-background border-r w-20 sm:w-24 lg:w-28 text-xs">
                    <span className="truncate">Importe</span>
                  </TableHead>
                  <TableHead className="sticky left-56 sm:left-66 lg:left-74 z-20 bg-background border-r w-12 sm:w-14 lg:w-16 text-xs">
                    %
                  </TableHead>
                  
                  {/* Month columns - responsive */}
                  {monthRange.map((month) => (
                    <TableHead key={month.value} className="text-center border-r w-16 sm:w-20 md:w-24 lg:w-28 xl:w-32 min-w-[64px] sm:min-w-[80px]">
                      <div className="space-y-1">
                        <div className="font-semibold text-xs">{month.label}</div>
                        <div className="hidden md:flex justify-between text-xs text-muted-foreground">
                          <span>W1</span>
                          <span>W2</span>
                          <span>W3</span>
                          <span>W4</span>
                        </div>
                        {/* Mobile week indicators */}
                        <div className="flex md:hidden justify-center text-xs text-muted-foreground">
                          <span>Sem</span>
                        </div>
                      </div>
                    </TableHead>
                  ))}
                  
                  {/* Actions column - responsive */}
                  <TableHead className="w-14 sm:w-20 lg:w-24 min-w-[56px] sm:min-w-[80px] text-xs">
                    <span className="hidden sm:inline">Acciones</span>
                    <span className="sm:hidden">Act.</span>
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
                <TableCell className="sticky left-0 z-20 bg-muted/50 border-r text-xs"></TableCell>
                <TableCell className="sticky left-8 sm:left-10 z-20 bg-muted/50 border-r text-xs font-semibold">
                  <span className="truncate">SUBTOTAL</span>
                </TableCell>
                <TableCell className="sticky left-36 sm:left-42 lg:left-46 z-20 bg-muted/50 border-r text-xs">
                  <span className="truncate">{formatCurrency(subtotal)}</span>
                </TableCell>
                <TableCell className="sticky left-56 sm:left-66 lg:left-74 z-20 bg-muted/50 border-r text-xs">
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
                  <TableCell className="sticky left-0 z-20 bg-red-50/50 border-r text-xs"></TableCell>
                  <TableCell className="sticky left-8 sm:left-10 z-20 bg-red-50/50 border-r font-medium text-xs">
                    <span className="truncate">{line.label || 'Descuento'}</span>
                  </TableCell>
                  <TableCell className="sticky left-36 sm:left-42 lg:left-46 z-20 bg-red-50/50 border-r text-right text-red-600 text-xs">
                    <span className="truncate">-{formatCurrency(line.amount || 0)}</span>
                  </TableCell>
                  <TableCell className="sticky left-56 sm:left-66 lg:left-74 z-20 bg-red-50/50 border-r text-xs"></TableCell>
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
                <TableCell className="sticky left-0 z-20 bg-primary/10 border-r text-xs"></TableCell>
                <TableCell className="sticky left-8 sm:left-10 z-20 bg-primary/10 border-r text-xs font-bold">
                  <span className="truncate">TOTAL</span>
                </TableCell>
                <TableCell className="sticky left-36 sm:left-42 lg:left-46 z-20 bg-primary/10 border-r text-xs">
                  <span className="truncate">{formatCurrency(total)}</span>
                </TableCell>
                <TableCell className="sticky left-56 sm:left-66 lg:left-74 z-20 bg-primary/10 border-r text-xs">
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