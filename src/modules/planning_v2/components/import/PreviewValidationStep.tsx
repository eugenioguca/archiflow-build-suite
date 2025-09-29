/**
 * Vista previa y validación de datos importados
 */
import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, DollarSign } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ImportResult } from '../../services/importService';
import { formatAsCurrency } from '../../utils/monetary';
import { Decimal } from 'decimal.js';

interface PreviewValidationStepProps {
  data: ImportResult;
  referenceTotal: number | null;
}

export function PreviewValidationStep({ data, referenceTotal }: PreviewValidationStepProps) {
  const { rows, validRows, invalidRows } = data;
  const [showTotalMismatchDialog, setShowTotalMismatchDialog] = useState(false);

  // Calcular gran total de filas válidas
  const grandTotal = useMemo(() => {
    return rows
      .filter(r => r.isValid)
      .reduce((sum, row) => {
        const cantidad = row.data.cantidad_real || 0;
        const precio = row.data.precio_real || 0;
        const desperdicio = (row.data.desperdicio_pct || 0) / 100;
        const honorarios = (row.data.honorarios_pct || 0) / 100;
        
        // Cálculo: cantidad * (1 + desperdicio) * precio * (1 + honorarios)
        const total = new Decimal(cantidad)
          .mul(1 + desperdicio)
          .mul(precio)
          .mul(1 + honorarios);
        
        return sum.plus(total);
      }, new Decimal(0))
      .toNumber();
  }, [rows]);

  // Comparar con referencia si existe
  const totalMismatch = useMemo(() => {
    if (!referenceTotal) return null;
    
    const diff = Math.abs(grandTotal - referenceTotal);
    if (diff > 0.01) {
      return {
        imported: grandTotal,
        reference: referenceTotal,
        difference: grandTotal - referenceTotal,
        percentDiff: ((grandTotal - referenceTotal) / referenceTotal) * 100,
      };
    }
    return null;
  }, [grandTotal, referenceTotal]);

  return (
    <>
      <div className="space-y-4 py-4">
        {/* Summary */}
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border bg-card">
            <div className="text-2xl font-bold">{data.totalRows}</div>
            <div className="text-sm text-muted-foreground">Total de filas</div>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold text-green-600">{validRows}</span>
            </div>
            <div className="text-sm text-muted-foreground">Filas válidas</div>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span className="text-2xl font-bold text-orange-600">{invalidRows}</span>
            </div>
            <div className="text-sm text-muted-foreground">Filas con errores</div>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{formatAsCurrency(grandTotal)}</span>
            </div>
            <div className="text-sm text-muted-foreground">Gran Total</div>
          </div>
        </div>

        {/* Total validation */}
        {referenceTotal && !totalMismatch && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800 dark:text-green-300">
              Total validado correctamente
            </AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-400">
              El total importado {formatAsCurrency(grandTotal)} coincide con la referencia {formatAsCurrency(referenceTotal)}.
            </AlertDescription>
          </Alert>
        )}

        {totalMismatch && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Discrepancia en el total</AlertTitle>
            <AlertDescription className="space-y-1">
              <p>El total importado no coincide con la referencia:</p>
              <div className="grid grid-cols-2 gap-2 mt-2 text-sm font-mono">
                <span>Importado:</span>
                <span className="font-bold">{formatAsCurrency(totalMismatch.imported)}</span>
                <span>Referencia:</span>
                <span className="font-bold">{formatAsCurrency(totalMismatch.reference)}</span>
                <span>Diferencia:</span>
                <span className={totalMismatch.difference > 0 ? 'text-red-600' : 'text-green-600'}>
                  {totalMismatch.difference > 0 ? '+' : ''}{formatAsCurrency(totalMismatch.difference)}
                  {' '}({totalMismatch.percentDiff > 0 ? '+' : ''}{totalMismatch.percentDiff.toFixed(2)}%)
                </span>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Error alert */}
        {invalidRows > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {invalidRows} filas tienen errores. Solo se importarán las filas válidas.
              Revise los errores a continuación y corrija el archivo si es necesario.
            </AlertDescription>
          </Alert>
        )}

      {/* Preview table */}
      <div className="border rounded-lg">
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Fila</TableHead>
                <TableHead className="w-20">Estado</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead>Errores</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, 100).map((row) => (
                <TableRow
                  key={row.rowIndex}
                  className={row.isValid ? '' : 'bg-destructive/5'}
                >
                  <TableCell className="font-mono text-xs">{row.rowIndex}</TableCell>
                  <TableCell>
                    {row.isValid ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        OK
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Error
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {row.data.short_description || '—'}
                  </TableCell>
                  <TableCell>{row.data.unit || '—'}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {row.data.cantidad_real !== undefined
                      ? row.data.cantidad_real
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {row.data.precio_real !== undefined
                      ? `$${row.data.precio_real.toFixed(2)}`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {row.errors.length > 0 && (
                      <div className="space-y-1">
                        {row.errors.map((error, idx) => (
                          <div
                            key={idx}
                            className="text-xs text-destructive flex items-start gap-1"
                          >
                            <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        {rows.length > 100 && (
          <div className="p-3 border-t bg-muted/30 text-sm text-center text-muted-foreground">
            Mostrando las primeras 100 filas de {rows.length}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
