import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit2 } from 'lucide-react';
import { GanttPlan, GanttLine } from '@/hooks/gantt-v2/useGantt';
import { MatrixOverride, useMatrixOverrides } from '@/hooks/gantt-v2/useMatrixOverrides';
import { generateMonthRange } from '@/utils/gantt-v2/monthRange';
import { formatCurrency } from '@/utils/gantt-v2/currency';
import { expandRangeToMonthWeekCells } from '@/utils/gantt-v2/weekMath';
import { MatrixEditorModal } from './MatrixEditorModal';

interface MatrixSectionProps {
  plan?: GanttPlan | null;
  lines: GanttLine[];
  overrides: MatrixOverride[];
  clientId: string;
  projectId: string;
}

export function MatrixSection({
  plan,
  lines,
  overrides,
  clientId,
  projectId
}: MatrixSectionProps) {
  const [showMatrixEditor, setShowMatrixEditor] = useState(false);
  const { saveOverride, deleteOverride } = useMatrixOverrides(clientId, projectId);

  if (!plan) return null;

  const monthRange = generateMonthRange(plan.start_month, plan.months_count);
  
  // Calculate total subtotal from mayor lines
  const mayorLines = lines.filter(line => !line.is_discount);
  const totalSubtotal = mayorLines.reduce((sum, line) => sum + line.amount, 0);

  // Calculate "Gasto en Obra" distribution
  const gastoEnObra: Record<string, number> = {};
  
  // For each month, calculate how much spending should be allocated
  monthRange.forEach(month => {
    let monthTotal = 0;
    
    mayorLines.forEach(line => {
      if (!line.activities || line.activities.length === 0) return;
      
      // Count active weeks for this line in this month
      let activeWeeksInMonth = 0;
      line.activities.forEach(activity => {
        const cells = expandRangeToMonthWeekCells(
          activity.start_month,
          activity.start_week,
          activity.end_month,
          activity.end_week
        );
        
        activeWeeksInMonth += cells.filter(cell => cell.month === month.value).length;
      });
      
      // Calculate total active weeks for this line across all months
      let totalActiveWeeks = 0;
      line.activities.forEach(activity => {
        const cells = expandRangeToMonthWeekCells(
          activity.start_month,
          activity.start_week,
          activity.end_month,
          activity.end_week
        );
        totalActiveWeeks += cells.length;
      });
      
      // Distribute the line amount proportionally
      if (totalActiveWeeks > 0) {
        const proportionalAmount = (line.amount * activeWeeksInMonth) / totalActiveWeeks;
        monthTotal += proportionalAmount;
      }
    });
    
    gastoEnObra[month.value] = monthTotal;
  });

  // Calculate cumulative percentages
  const avanceAcumulado: Record<string, number> = {};
  let cumulativeSpending = 0;
  
  monthRange.forEach(month => {
    cumulativeSpending += gastoEnObra[month.value] || 0;
    avanceAcumulado[month.value] = totalSubtotal > 0 ? (cumulativeSpending / totalSubtotal) * 100 : 0;
  });

  // Calculate partial progress (month-to-month)
  const avanceParcial: Record<string, number> = {};
  monthRange.forEach(month => {
    const monthSpending = gastoEnObra[month.value] || 0;
    avanceParcial[month.value] = totalSubtotal > 0 ? (monthSpending / totalSubtotal) * 100 : 0;
  });

  // Helper function to get override value or calculated value
  const getValueOrOverride = (mes: string, concepto: string, calculatedValue: number): number => {
    const override = overrides.find(o => o.mes === parseInt(mes, 10) && o.concepto === concepto);
    return override ? parseFloat(override.valor) : calculatedValue;
  };

  // Helper function to get text override value (for fecha_pago)
  const getTextOverride = (mes: string, concepto: string, defaultValue: string = ''): string => {
    const override = overrides.find(o => o.mes === parseInt(mes, 10) && o.concepto === concepto);
    return override ? override.valor : defaultValue;
  };

  const hasOverride = (mes: string, concepto: string) => {
    return overrides.some(o => o.mes === parseInt(mes, 10) && o.concepto === concepto);
  };

  const concepts = [
    { key: 'gasto_obra', label: 'Gasto en Obra', format: 'currency' },
    { key: 'avance_parcial', label: '% Avance Parcial', format: 'percent' },
    { key: 'avance_acumulado', label: '% Avance Acumulado', format: 'percent' },
    { key: 'ministraciones', label: 'Ministraciones', format: 'currency' },
    { key: 'inversion_acumulada', label: '% Inversión Acumulada', format: 'percent' },
    { key: 'fecha_pago', label: 'Fecha Tentativa de Pago', format: 'text' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Matriz Numérica Mensual
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={() => setShowMatrixEditor(true)}
          >
            <Edit2 className="h-4 w-4" />
            Editar Matriz
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative">
          {/* Scroll indicator for mobile */}
          <div className="sm:hidden absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-background/80 to-transparent z-20 pointer-events-none opacity-60" />
          
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-20 bg-background border-r w-36 sm:w-48 md:w-52 min-w-[144px] sm:min-w-[200px] text-xs sm:text-sm">
                    Concepto
                  </TableHead>
                  {monthRange.map((month) => (
                    <TableHead key={month.value} className="text-center border-r w-20 sm:w-28 md:w-32 min-w-[80px] sm:min-w-[120px] text-xs sm:text-sm">
                      {month.label}
                    </TableHead>
                  ))}
                  <TableHead className="text-center w-20 sm:w-28 md:w-32 min-w-[80px] sm:min-w-[120px] font-semibold text-xs sm:text-sm">
                    TOTAL
                  </TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {concepts.map((concept) => (
                <TableRow key={concept.key}>
                  <TableCell className="sticky left-0 z-20 bg-background border-r font-medium text-xs sm:text-sm">
                    <div className="truncate max-w-[140px] sm:max-w-none" title={concept.label}>
                      {concept.label}
                    </div>
                  </TableCell>
                  {monthRange.map((month) => {
                    let value: number | string = 0;
                    
                    // Calculate values based on concept
                    switch (concept.key) {
                      case 'gasto_obra':
                        value = getValueOrOverride(month.value, concept.key, gastoEnObra[month.value] || 0);
                        break;
                      case 'avance_parcial':
                        value = getValueOrOverride(month.value, concept.key, avanceParcial[month.value] || 0);
                        break;
                      case 'avance_acumulado':
                        value = getValueOrOverride(month.value, concept.key, avanceAcumulado[month.value] || 0);
                        break;
                      case 'ministraciones':
                        value = getValueOrOverride(month.value, concept.key, 0);
                        break;
                      case 'inversion_acumulada':
                        value = getValueOrOverride(month.value, concept.key, 0);
                        break;
                      case 'fecha_pago':
                        // Handle fecha_pago as string
                        value = getTextOverride(month.value, concept.key, '');
                        break;
                      default:
                        value = 0;
                        break;
                    }

                    const isOverridden = hasOverride(month.value, concept.key);

                    return (
                      <TableCell 
                        key={month.value} 
                        className={`text-center border-r text-xs sm:text-sm ${isOverridden ? 'bg-amber-50 text-amber-800' : ''}`}
                      >
                        <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                          <div className="truncate max-w-[60px] sm:max-w-none">
                            {concept.format === 'currency' && formatCurrency(value as number)}
                            {concept.format === 'percent' && `${(value as number).toFixed(2)}%`}
                            {concept.format === 'text' && (() => {
                              const textValue = value as string;
                              if (!textValue || textValue === 'none') return '-';
                              
                              // If it's a number, format as "Día X"
                              const numValue = parseInt(textValue, 10);
                              if (!isNaN(numValue) && numValue >= 1 && numValue <= 31) {
                                return `Día ${numValue}`;
                              }
                              
                              // Otherwise show the text as-is (for "Pago 1", "Primera Quincena", etc.)
                              return textValue;
                            })()}
                          </div>
                          {isOverridden && (
                            <Edit2 className="h-2 w-2 sm:h-3 sm:w-3 text-amber-600 flex-shrink-0" />
                          )}
                        </div>
                      </TableCell>
                    );
                  })}
                  
                  {/* Total Column */}
                  <TableCell className="text-center font-semibold text-xs sm:text-sm">
                    {concept.format === 'currency' && (
                      formatCurrency(
                        monthRange.reduce((sum, month) => {
                          let value = 0;
                          switch (concept.key) {
                            case 'gasto_obra':
                              value = getValueOrOverride(month.value, concept.key, gastoEnObra[month.value] || 0);
                              break;
                            case 'ministraciones':
                              value = getValueOrOverride(month.value, concept.key, 0);
                              break;
                          }
                          return sum + value;
                        }, 0)
                      )
                    )}
                    {concept.format === 'percent' && concept.key === 'avance_acumulado' && '100.00%'}
                    {concept.format === 'percent' && concept.key !== 'avance_acumulado' && (
                      `${monthRange.reduce((sum, month) => {
                        const value = concept.key === 'avance_parcial' 
                          ? getValueOrOverride(month.value, concept.key, avanceParcial[month.value] || 0)
                          : getValueOrOverride(month.value, concept.key, 0);
                        return sum + value;
                      }, 0).toFixed(2)}%`
                    )}
                    {concept.format === 'text' && '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>

      {/* Matrix Editor Modal */}
      <MatrixEditorModal
        open={showMatrixEditor}
        onOpenChange={setShowMatrixEditor}
        plan={plan}
        lines={lines}
        overrides={overrides}
        clientId={clientId}
        projectId={projectId}
        onSaveOverride={async (data) => {
          await saveOverride.mutateAsync(data);
        }}
        onDeleteOverride={async (data) => {
          await deleteOverride.mutateAsync(data);
        }}
      />
    </Card>
  );
}