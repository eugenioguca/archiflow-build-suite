import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calculator, Edit, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { formatMonth, generateMonthRange } from '@/utils/cronogramaWeekUtils';
import { MonthlyCalculations, MatrixOverride } from '@/hooks/useModernCronograma';

interface MonthlyNumericMatrixProps {
  calculations: MonthlyCalculations;
  matrixOverrides: MatrixOverride[];
  onSaveOverride: (mes: string, concepto: string, valor: string) => Promise<void>;
  onDeleteOverride: (mes: string, concepto: string) => Promise<void>;
  months: number;
  showEditButton?: boolean;
  onOpenEditor?: () => void;
}

export function MonthlyNumericMatrix({
  calculations,
  matrixOverrides,
  onSaveOverride,
  onDeleteOverride,
  months = 12,
  showEditButton = false,
  onOpenEditor
}: MonthlyNumericMatrixProps) {
  const { 
    gastoPorMes, 
    avanceParcial, 
    avanceAcumulado, 
    ministraciones, 
    inversionAcumulada, 
    fechasPago,
    totalPresupuesto 
  } = calculations;

  // Generate month range using the same utility as other components
  const monthRange = generateMonthRange(0, months);

  // Create override lookup for visual indicators
  const overrideLookup = React.useMemo(() => {
    const lookup: Record<string, boolean> = {};
    matrixOverrides.forEach(override => {
      const key = `${override.mes}-${override.concepto}`;
      lookup[key] = true;
    });
    return lookup;
  }, [matrixOverrides]);

  // Calculate totals
  const totalGasto = Object.values(calculations.gastoPorMes).reduce((sum, val) => sum + val, 0);
  const totalMinistraciones = Object.values(calculations.ministraciones).reduce((sum, val) => sum + val, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Format percentage with single decimal
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <CardTitle>Matriz Numérica Mensual</CardTitle>
          </div>
          {showEditButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenEditor}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Editar Matriz
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* Header */}
            <div className="flex border-b bg-muted/30">
              <div className="w-48 px-4 py-3 border-r font-semibold text-sm bg-card">
                Concepto
              </div>
              {monthRange.map(month => (
                <div
                  key={month}
                  className="w-32 px-2 py-3 border-r text-center font-medium text-xs bg-card"
                >
                  {formatMonth(month)}
                </div>
              ))}
              <div className="w-32 px-2 py-3 text-center font-semibold text-xs bg-primary/10">
                Total
              </div>
            </div>

            {/* Gasto en Obra */}
            <div className="flex border-b hover:bg-muted/20">
              <div className="w-48 px-4 py-3 border-r flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="font-medium text-sm">Gasto en Obra</span>
              </div>
              {monthRange.map(month => {
                const value = calculations.gastoPorMes[month] || 0;
                const hasOverride = overrideLookup[`${month}-gasto_obra`];
                return (
                  <div
                    key={month}
                    className="w-32 px-2 py-3 border-r text-right text-xs relative"
                  >
                    <div className="flex items-center justify-end gap-1">
                      {formatCurrency(value)}
                      {hasOverride && (
                        <Edit className="h-3 w-3 text-primary opacity-60" />
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="w-32 px-2 py-3 text-right font-medium text-xs bg-primary/5">
                {formatCurrency(totalGasto)}
              </div>
            </div>

            {/* % Avance Parcial */}
            <div className="flex border-b hover:bg-muted/20">
              <div className="w-48 px-4 py-3 border-r flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-sm">% Avance Parcial</span>
              </div>
              {monthRange.map(month => {
                const value = calculations.avanceParcial[month] || 0;
                const hasOverride = overrideLookup[`${month}-avance_parcial`];
                return (
                  <div
                    key={month}
                    className="w-32 px-2 py-3 border-r text-right text-xs relative"
                  >
                    <div className="flex items-center justify-end gap-1">
                      {formatPercentage(value)}
                      {hasOverride && (
                        <Edit className="h-3 w-3 text-primary opacity-60" />
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="w-32 px-2 py-3 text-right font-medium text-xs bg-primary/5">
                100.0%
              </div>
            </div>

            {/* % Avance Acumulado */}
            <div className="flex border-b hover:bg-muted/20">
              <div className="w-48 px-4 py-3 border-r flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <span className="font-medium text-sm">% Avance Acumulado</span>
              </div>
              {monthRange.map(month => {
                const value = calculations.avanceAcumulado[month] || 0;
                const hasOverride = overrideLookup[`${month}-avance_acumulado`];
                return (
                  <div
                    key={month}
                    className="w-32 px-2 py-3 border-r text-right text-xs relative"
                  >
                    <div className="flex items-center justify-end gap-1">
                      {formatPercentage(value)}
                      {hasOverride && (
                        <Edit className="h-3 w-3 text-primary opacity-60" />
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="w-32 px-2 py-3 text-right font-medium text-xs bg-primary/5">
                {formatPercentage(Math.max(...Object.values(calculations.avanceAcumulado)))}
              </div>
            </div>

            {/* Ministraciones */}
            <div className="flex border-b hover:bg-muted/20">
              <div className="w-48 px-4 py-3 border-r flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-sm">Ministraciones</span>
              </div>
              {monthRange.map(month => {
                const value = calculations.ministraciones[month] || 0;
                const hasOverride = overrideLookup[`${month}-ministraciones`];
                return (
                  <div
                    key={month}
                    className="w-32 px-2 py-3 border-r text-right text-xs relative"
                  >
                    <div className="flex items-center justify-end gap-1">
                      {formatCurrency(value)}
                      {hasOverride && (
                        <Edit className="h-3 w-3 text-primary opacity-60" />
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="w-32 px-2 py-3 text-right font-medium text-xs bg-primary/5">
                {formatCurrency(totalMinistraciones)}
              </div>
            </div>

            {/* % Inversión Acumulada */}
            <div className="flex border-b hover:bg-muted/20">
              <div className="w-48 px-4 py-3 border-r flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-red-600" />
                <span className="font-medium text-sm">% Inversión Acumulada</span>
              </div>
              {monthRange.map(month => {
                const value = calculations.inversionAcumulada[month] || 0;
                const hasOverride = overrideLookup[`${month}-inversion_acumulada`];
                return (
                  <div
                    key={month}
                    className="w-32 px-2 py-3 border-r text-right text-xs relative"
                  >
                    <div className="flex items-center justify-end gap-1">
                      {formatPercentage(value)}
                      {hasOverride && (
                        <Edit className="h-3 w-3 text-primary opacity-60" />
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="w-32 px-2 py-3 text-right font-medium text-xs bg-primary/5">
                {formatPercentage(Math.max(...Object.values(calculations.inversionAcumulada)))}
              </div>
            </div>

            {/* Fechas de Pago */}
            <div className="flex hover:bg-muted/20">
              <div className="w-48 px-4 py-3 border-r flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-600" />
                <span className="font-medium text-sm">Fechas de Pago</span>
              </div>
              {monthRange.map(month => {
                const fechas = calculations.fechasPago[month] || [];
                const hasOverride = overrideLookup[`${month}-fecha_pago`];
                return (
                  <div
                    key={month}
                    className="w-32 px-2 py-3 border-r text-xs relative"
                  >
                    <div className="flex items-start justify-center gap-1">
                      {fechas.length > 0 ? (
                        <div className="text-center">
                          {fechas.map((fecha, idx) => (
                            <div key={idx} className="truncate">
                              {fecha}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                      {hasOverride && (
                        <Edit className="h-3 w-3 text-primary opacity-60 mt-0.5" />
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="w-32 px-2 py-3 text-center text-xs bg-primary/5 text-muted-foreground">
                -
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="border-t bg-muted/30 p-4">
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Edit className="h-3 w-3 text-primary" />
              <span>Valor editado manualmente</span>
            </div>
            <div className="flex items-center gap-2">
              <Calculator className="h-3 w-3" />
              <span>Calculado automáticamente desde Gantt</span>
            </div>
            {showEditButton && (
              <div className="ml-auto">
                <Badge variant="outline" className="text-xs">
                  {matrixOverrides.length} valores personalizados
                </Badge>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}