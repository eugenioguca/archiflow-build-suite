/**
 * Column Manager for catalog grid
 */
import { useState } from 'react';
import { Plus, Eye, EyeOff, GripVertical } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface Column {
  key: string;
  label: string;
  type: 'input' | 'computed';
  visible: boolean;
  formula?: string;
}

interface ColumnManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: Column[];
  onColumnsChange: (columns: Column[]) => void;
}

const DEFAULT_COLUMNS: Column[] = [
  { key: 'code', label: 'Código', type: 'input', visible: true },
  { key: 'short_description', label: 'Descripción', type: 'input', visible: true },
  { key: 'unit', label: 'Unidad', type: 'input', visible: true },
  { key: 'cantidad_real', label: 'Cantidad Real', type: 'input', visible: true },
  { key: 'desperdicio_pct', label: '% Desperdicio', type: 'input', visible: true },
  { key: 'cantidad', label: 'Cantidad', type: 'computed', visible: true, formula: 'cantidad_real * (1 + desperdicio_pct)' },
  { key: 'precio_real', label: 'Precio Real', type: 'input', visible: true },
  { key: 'honorarios_pct', label: '% Honorarios', type: 'input', visible: true },
  { key: 'pu', label: 'PU', type: 'computed', visible: true, formula: 'precio_real * (1 + honorarios_pct)' },
  { key: 'total_real', label: 'Total Real', type: 'computed', visible: false, formula: 'precio_real * cantidad_real' },
  { key: 'total', label: 'Total', type: 'computed', visible: true, formula: 'pu * cantidad' },
  { key: 'provider', label: 'Proveedor', type: 'input', visible: true },
  { key: 'wbs_code', label: 'WBS', type: 'input', visible: true },
];

export function ColumnManager({ open, onOpenChange, columns, onColumnsChange }: ColumnManagerProps) {
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [newColumn, setNewColumn] = useState<Partial<Column>>({
    type: 'input',
    visible: true,
  });

  const handleToggleVisibility = (key: string) => {
    const updated = columns.map(col =>
      col.key === key ? { ...col, visible: !col.visible } : col
    );
    onColumnsChange(updated);
  };

  const handleAddColumn = () => {
    if (!newColumn.key || !newColumn.label) return;

    const column: Column = {
      key: newColumn.key,
      label: newColumn.label,
      type: newColumn.type || 'input',
      visible: true,
      formula: newColumn.formula,
    };

    onColumnsChange([...columns, column]);
    setNewColumn({ type: 'input', visible: true });
  };

  const handleRemoveColumn = (key: string) => {
    onColumnsChange(columns.filter(col => col.key !== key));
  };

  const handleResetColumns = () => {
    onColumnsChange(DEFAULT_COLUMNS);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestor de Columnas</DialogTitle>
          <DialogDescription>
            Personaliza las columnas visibles en el catálogo y agrega campos calculados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Existing columns */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Columnas Actuales</h3>
              <Button variant="outline" size="sm" onClick={handleResetColumns}>
                Restaurar predeterminadas
              </Button>
            </div>

            <div className="space-y-2">
              {columns.map((column) => (
                <div
                  key={column.key}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{column.label}</span>
                      <Badge variant={column.type === 'computed' ? 'secondary' : 'outline'}>
                        {column.type === 'computed' ? 'Calculado' : 'Entrada'}
                      </Badge>
                    </div>
                    {column.formula && (
                      <code className="text-xs text-muted-foreground">{column.formula}</code>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleVisibility(column.key)}
                  >
                    {column.visible ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveColumn(column.key)}
                    disabled={column.key === 'short_description'} // Can't remove core columns
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Add new column */}
          <div className="border-t pt-6">
            <h3 className="text-sm font-medium mb-3">Agregar Columna</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Clave</Label>
                  <Input
                    placeholder="mi_campo"
                    value={newColumn.key || ''}
                    onChange={(e) => setNewColumn({ ...newColumn, key: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Etiqueta</Label>
                  <Input
                    placeholder="Mi Campo"
                    value={newColumn.label || ''}
                    onChange={(e) => setNewColumn({ ...newColumn, label: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={newColumn.type}
                  onValueChange={(value) => setNewColumn({ ...newColumn, type: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="input">Entrada</SelectItem>
                    <SelectItem value="computed">Calculado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newColumn.type === 'computed' && (
                <div className="space-y-2">
                  <Label>Fórmula</Label>
                  <Textarea
                    placeholder="cantidad_real * precio_real"
                    value={newColumn.formula || ''}
                    onChange={(e) => setNewColumn({ ...newColumn, formula: e.target.value })}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Usa claves de campo existentes. Ej: cantidad_real, precio_real, desperdicio_pct
                  </p>
                </div>
              )}

              <Button onClick={handleAddColumn} disabled={!newColumn.key || !newColumn.label}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Columna
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
