/**
 * Vista previa y validación de datos importados
 */
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

interface PreviewValidationStepProps {
  data: ImportResult;
}

export function PreviewValidationStep({ data }: PreviewValidationStepProps) {
  const { rows, validRows, invalidRows } = data;

  return (
    <div className="space-y-4 py-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
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
      </div>

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
  );
}
