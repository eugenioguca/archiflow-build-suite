import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MonthlyCalculations } from '@/hooks/useInteractiveGantt';
import { EditableCell } from '@/components/EditableCell';
import { Undo } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MonthlyNumericMatrixProps {
  calculations: MonthlyCalculations;
  manualOverrides: Record<string, { valor: string; hasOverride: boolean }>;
  onSaveOverride: (data: { mes: number; concepto: string; valor: string }) => Promise<void>;
  onDeleteOverride: (data: { mes: number; concepto: string }) => Promise<void>;
  months?: number;
}

export const MonthlyNumericMatrix: React.FC<MonthlyNumericMatrixProps> = ({
  calculations,
  manualOverrides,
  onSaveOverride,
  onDeleteOverride,
  months = 12
}) => {
  const { 
    gastoPorMes, 
    avanceParcial, 
    avanceAcumulado, 
    ministraciones, 
    inversionAcumulada, 
    fechasPago,
    totalPresupuesto 
  } = calculations;

  // Generate month columns
  const monthColumns = Array.from({ length: months }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() + i);
    return {
      number: i + 1,
      name: date.toLocaleDateString('es-MX', { month: 'short' }),
      fullName: date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
    };
  });

  // Calculate totals
  const totalGasto = Object.values(gastoPorMes).reduce((sum, val) => sum + val, 0);
  const totalMinistraciones = Object.values(ministraciones).reduce((sum, val) => sum + val, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const renderCell = (value: number | string | string[], type: 'currency' | 'percentage' | 'text') => {
    if (type === 'currency') {
      return formatCurrency(typeof value === 'number' ? value : 0);
    } else if (type === 'percentage') {
      return formatPercentage(typeof value === 'number' ? value : 0);
    } else if (Array.isArray(value)) {
      return value.join(', ');
    }
    return value || '-';
  };

  // Check if a cell has manual override
  const hasOverride = (month: number, concepto: string) => {
    const key = `${month}-${concepto}`;
    return manualOverrides[key]?.hasOverride || false;
  };

  // Render editable cell with override indicator
  const renderEditableCell = (
    month: number, 
    concepto: string, 
    value: number | string | string[], 
    type: 'currency' | 'percentage' | 'text',
    validationFn?: (val: string) => boolean
  ) => {
    const isOverridden = hasOverride(month, concepto);
    const displayValue = typeof value === 'number' ? 
      (type === 'currency' ? value.toString() : 
       type === 'percentage' ? value.toFixed(2) : 
       value.toString()) : 
      (Array.isArray(value) ? value.join(', ') : (value || ''));

    return (
      <TableCell className={`text-right relative ${isOverridden ? 'bg-blue-50 border-2 border-blue-200' : ''}`}>
        <div className="flex items-center justify-between">
          <EditableCell
            value={displayValue}
            onSave={(newValue) => onSaveOverride({ mes: month, concepto, valor: newValue })}
            type={type === 'currency' || type === 'percentage' ? 'number' : 'text'}
            className={`text-right ${isOverridden ? 'font-semibold text-blue-700' : ''}`}
            displayTransform={(val) => {
              if (type === 'currency') return formatCurrency(parseFloat(val) || 0);
              if (type === 'percentage') return formatPercentage(parseFloat(val) || 0);
              return val;
            }}
          />
          {isOverridden && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDeleteOverride({ mes: month, concepto })}
              className="ml-1 p-1 h-6 w-6 hover:bg-blue-100"
              title="Restaurar valor automático"
            >
              <Undo className="h-3 w-3" />
            </Button>
          )}
        </div>
        {isOverridden && (
          <span className="absolute top-0 right-0 text-blue-600 text-xs">*</span>
        )}
      </TableCell>
    );
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Matriz Numérica Mensual</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-48 bg-muted font-semibold">Concepto</TableHead>
                {monthColumns.map(month => (
                  <TableHead key={month.number} className="text-center bg-primary/10 font-semibold min-w-24">
                    {month.name}
                  </TableHead>
                ))}
                <TableHead className="text-center bg-secondary/20 font-semibold min-w-24">
                  TOTAL
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* GASTO EN OBRA */}
              <TableRow className="hover:bg-muted/30">
                <TableCell className="font-medium bg-muted/30">
                  GASTO EN OBRA (MXN)
                </TableCell>
                {monthColumns.map(month => (
                  renderEditableCell(month.number, 'gasto_obra', gastoPorMes[month.number] || 0, 'currency')
                ))}
                <TableCell className="text-right font-semibold bg-secondary/10">
                  {renderCell(totalGasto, 'currency')}
                </TableCell>
              </TableRow>

              {/* % AVANCE PARCIAL */}
              <TableRow className="hover:bg-muted/30">
                <TableCell className="font-medium bg-muted/30">
                  % AVANCE PARCIAL
                </TableCell>
                {monthColumns.map(month => (
                  renderEditableCell(month.number, 'avance_parcial', avanceParcial[month.number] || 0, 'percentage')
                ))}
                <TableCell className="text-right font-semibold bg-secondary/10">
                  100.00%
                </TableCell>
              </TableRow>

              {/* % AVANCE ACUMULADO */}
              <TableRow className="hover:bg-muted/30">
                <TableCell className="font-medium bg-muted/30">
                  % AVANCE ACUMULADO
                </TableCell>
                {monthColumns.map(month => (
                  renderEditableCell(month.number, 'avance_acumulado', avanceAcumulado[month.number] || 0, 'percentage')
                ))}
                <TableCell className="text-right font-semibold bg-secondary/10">
                  100.00%
                </TableCell>
              </TableRow>

              {/* MINISTRACIONES */}
              <TableRow className="hover:bg-muted/30 border-t-2 border-border">
                <TableCell className="font-medium bg-muted/30">
                  MINISTRACIONES (MXN)
                </TableCell>
                {monthColumns.map(month => (
                  renderEditableCell(month.number, 'ministraciones', ministraciones[month.number] || 0, 'currency')
                ))}
                <TableCell className="text-right font-semibold bg-secondary/10">
                  {renderCell(totalMinistraciones, 'currency')}
                </TableCell>
              </TableRow>

              {/* % INVERSIÓN ACUMULADA */}
              <TableRow className="hover:bg-muted/30">
                <TableCell className="font-medium bg-muted/30">
                  % INVERSIÓN ACUMULADA
                </TableCell>
                {monthColumns.map(month => (
                  renderEditableCell(month.number, 'inversion_acumulada', inversionAcumulada[month.number] || 0, 'percentage')
                ))}
                <TableCell className="text-right font-semibold bg-secondary/10">
                  {formatPercentage(totalPresupuesto > 0 ? (totalMinistraciones / totalPresupuesto) * 100 : 0)}
                </TableCell>
              </TableRow>

              {/* FECHA TENTATIVA DE PAGO */}
              <TableRow className="hover:bg-muted/30">
                <TableCell className="font-medium bg-muted/30">
                  FECHA TENTATIVA DE PAGO
                </TableCell>
                {monthColumns.map(month => (
                  renderEditableCell(month.number, 'fecha_pago', fechasPago[month.number] || [], 'text')
                ))}
                <TableCell className="text-center bg-secondary/10">
                  -
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Summary info */}
        <div className="mt-4 p-4 bg-muted/30 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-semibold">Total Presupuesto:</span>
            <div className="text-lg font-bold text-primary">
              {formatCurrency(totalPresupuesto)}
            </div>
          </div>
          <div>
            <span className="font-semibold">Total Gasto Programado:</span>
            <div className="text-lg font-bold text-secondary">
              {formatCurrency(totalGasto)}
            </div>
          </div>
          <div>
            <span className="font-semibold">Total Ministraciones:</span>
            <div className="text-lg font-bold text-accent">
              {formatCurrency(totalMinistraciones)}
            </div>
          </div>
        </div>

        {/* Manual overrides note */}
        {Object.values(manualOverrides).some(override => override.hasOverride) && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center text-sm text-blue-700">
              <span className="font-semibold mr-1">*</span>
              <span>Los valores marcados con asterisco (*) han sido editados manualmente y aparecen destacados en azul.</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};