/**
 * Paso de mapeo de columnas para importación
 */
import { ArrowRight, AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ImportColumn } from '../../services/importService';

interface ColumnMappingStepProps {
  columns: ImportColumn[];
  columnMapping: Map<string, string>;
  onMappingChange: (mapping: Map<string, string>) => void;
  availableFields: Array<{ key: string; label: string; required: boolean }>;
}

export function ColumnMappingStep({
  columns,
  columnMapping,
  onMappingChange,
  availableFields,
}: ColumnMappingStepProps) {
  const handleMapColumn = (sourceColumn: string, targetField: string | null) => {
    const newMapping = new Map(columnMapping);
    
    if (targetField) {
      newMapping.set(sourceColumn, targetField);
    } else {
      newMapping.delete(sourceColumn);
    }
    
    onMappingChange(newMapping);
  };

  const requiredFields = availableFields.filter(f => f.required);
  const mappedFields = new Set(columnMapping.values());
  const missingRequired = requiredFields.filter(f => !mappedFields.has(f.key));

  return (
    <div className="space-y-4 py-4">
      {missingRequired.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Faltan campos requeridos: {missingRequired.map(f => f.label).join(', ')}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm font-medium pb-2 border-b">
          <span>Columna del archivo</span>
          <span>Campo destino</span>
        </div>

        {columns.map((column) => {
          const targetField = columnMapping.get(column.sourceColumn);
          const fieldConfig = availableFields.find(f => f.key === targetField);

          return (
            <div
              key={column.sourceColumn}
              className="flex items-start gap-4 p-3 rounded-lg border bg-card"
            >
              {/* Source column */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm truncate">
                    {column.sourceColumn}
                  </span>
                  {fieldConfig?.required && (
                    <Badge variant="destructive" className="text-xs">
                      Requerido
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Ejemplos:{' '}
                  {column.sampleValues.length > 0
                    ? column.sampleValues.slice(0, 3).join(', ')
                    : 'Sin datos'}
                </div>
              </div>

              <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />

              {/* Target field selector */}
              <div className="flex-1 min-w-0">
                <Select
                  value={targetField || '_none'}
                  onValueChange={(value) =>
                    handleMapColumn(column.sourceColumn, value === '_none' ? null : value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No mapear" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">
                      <span className="text-muted-foreground">No mapear</span>
                    </SelectItem>
                    {availableFields.map((field) => (
                      <SelectItem key={field.key} value={field.key}>
                        <div className="flex items-center gap-2">
                          <span>{field.label}</span>
                          {field.required && (
                            <Badge variant="outline" className="text-xs">
                              Requerido
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
        <p className="font-medium mb-2">Ayuda:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Seleccione el campo de destino para cada columna del archivo</li>
          <li>Los campos marcados como "Requerido" deben ser mapeados</li>
          <li>Puede dejar columnas sin mapear si no son necesarias</li>
          <li>Revise los ejemplos para verificar el contenido</li>
        </ul>
      </div>
    </div>
  );
}
