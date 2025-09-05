import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GanttPlan, GanttLine, GanttActivity } from '@/hooks/gantt-v2/useGantt';
import { Mayor } from '@/hooks/gantt-v2/useMayoresTU';
import { ActivityRow } from './ActivityRow';
import { TotalsBar } from './TotalsBar';
import { generateMonthRange } from '@/utils/gantt-v2/monthRange';
import { formatCurrency } from '@/utils/gantt-v2/currency';

interface GanttGridProps {
  plan?: GanttPlan | null;
  lines: GanttLine[];
  mayores: Mayor[];
  onUpdateLine: (params: {id: string, data: Partial<GanttLine>}) => Promise<any>;
  onDeleteLine: (id: string) => Promise<any>;
  onAddActivity: (lineId: string) => void;
  onEditActivity: (activity: GanttActivity) => void;
  onDeleteActivity: (id: string) => Promise<any>;
  isLoading: boolean;
  isFetching?: boolean;
}

export function GanttGrid({
  plan,
  lines,
  mayores,
  onUpdateLine,
  onDeleteLine,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
  isLoading,
  isFetching = false
}: GanttGridProps) {
  if (!plan) return null;

  const monthRange = generateMonthRange(plan.start_month, plan.months_count);
  
  // Calculate totals
  const mayorLines = lines.filter(line => !line.is_discount);
  const discountLines = lines.filter(line => line.is_discount);
  const subtotal = mayorLines.reduce((sum, line) => sum + line.amount, 0);
  const totalDiscounts = discountLines.reduce((sum, line) => sum + line.amount, 0);
  const total = subtotal + totalDiscounts;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cronograma de Gantt</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {/* Fixed columns */}
                <TableHead className="sticky left-0 z-10 bg-background border-r min-w-[60px]">No.</TableHead>
                <TableHead className="sticky left-[60px] z-10 bg-background border-r min-w-[200px]">Mayor</TableHead>
                <TableHead className="sticky left-[260px] z-10 bg-background border-r min-w-[120px]">Importe</TableHead>
                <TableHead className="sticky left-[380px] z-10 bg-background border-r min-w-[80px]">%</TableHead>
                
                {/* Month columns */}
                {monthRange.map((month) => (
                  <TableHead key={month.value} className="text-center min-w-[120px] border-r">
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
                <TableHead className="min-w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Mayor Lines */}
              {mayorLines.map((line) => (
                <ActivityRow
                  key={line.id}
                  line={line}
                  mayores={mayores}
                  monthRange={monthRange}
                  subtotal={subtotal}
                  onUpdateLine={onUpdateLine}
                  onDeleteLine={onDeleteLine}
                  onAddActivity={onAddActivity}
                  onEditActivity={onEditActivity}
                  onDeleteActivity={onDeleteActivity}
            isLoading={isLoading || isFetching}
                />
              ))}
              
              {/* Subtotal Row */}
              <TableRow className="bg-muted/50 font-medium">
                <TableCell className="sticky left-0 z-10 bg-muted/50 border-r"></TableCell>
                <TableCell className="sticky left-[60px] z-10 bg-muted/50 border-r">SUBTOTAL</TableCell>
                <TableCell className="sticky left-[260px] z-10 bg-muted/50 border-r">
                  {formatCurrency(subtotal)}
                </TableCell>
                <TableCell className="sticky left-[380px] z-10 bg-muted/50 border-r">100.00%</TableCell>
                {monthRange.map((month) => (
                  <TableCell key={month.value} className="border-r"></TableCell>
                ))}
                <TableCell></TableCell>
              </TableRow>
              
              {/* Discount Lines */}
              {discountLines.length > 0 && (
                <>
                  <TableRow>
                    <TableCell colSpan={4 + monthRange.length + 1} className="py-2">
                      <div className="font-medium text-sm text-muted-foreground">DESCUENTOS</div>
                    </TableCell>
                  </TableRow>
                  {discountLines.map((line) => (
                    <ActivityRow
                      key={line.id}
                      line={line}
                      mayores={mayores}
                      monthRange={monthRange}
                      subtotal={subtotal}
                      onUpdateLine={onUpdateLine}
                      onDeleteLine={onDeleteLine}
                      onAddActivity={onAddActivity}
                      onEditActivity={onEditActivity}
                      onDeleteActivity={onDeleteActivity}
                      isLoading={isLoading || isFetching}
                    />
                  ))}
                </>
              )}
              
              {/* Total Row */}
              <TableRow className="bg-primary/10 font-bold border-t-2">
                <TableCell className="sticky left-0 z-10 bg-primary/10 border-r"></TableCell>
                <TableCell className="sticky left-[60px] z-10 bg-primary/10 border-r">TOTAL</TableCell>
                <TableCell className="sticky left-[260px] z-10 bg-primary/10 border-r">
                  {formatCurrency(total)}
                </TableCell>
                <TableCell className="sticky left-[380px] z-10 bg-primary/10 border-r">
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
        
        {(isLoading || isFetching) && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">Cargando cronograma...</p>
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