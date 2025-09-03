import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MonthlyCalculations } from '@/hooks/useInteractiveGantt';

interface MonthlyNumericMatrixProps {
  calculations: MonthlyCalculations;
  months?: number;
}

export const MonthlyNumericMatrix: React.FC<MonthlyNumericMatrixProps> = ({
  calculations,
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
                  <TableCell key={month.number} className="text-right">
                    {renderCell(gastoPorMes[month.number] || 0, 'currency')}
                  </TableCell>
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
                  <TableCell key={month.number} className="text-right">
                    {renderCell(avanceParcial[month.number] || 0, 'percentage')}
                  </TableCell>
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
                  <TableCell key={month.number} className="text-right">
                    {renderCell(avanceAcumulado[month.number] || 0, 'percentage')}
                  </TableCell>
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
                  <TableCell key={month.number} className="text-right">
                    {renderCell(ministraciones[month.number] || 0, 'currency')}
                  </TableCell>
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
                  <TableCell key={month.number} className="text-right">
                    {renderCell(inversionAcumulada[month.number] || 0, 'percentage')}
                  </TableCell>
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
                  <TableCell key={month.number} className="text-center text-xs">
                    {renderCell(fechasPago[month.number] || [], 'text')}
                  </TableCell>
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
      </CardContent>
    </Card>
  );
};