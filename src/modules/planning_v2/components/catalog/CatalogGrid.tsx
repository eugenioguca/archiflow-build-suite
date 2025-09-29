/**
 * Main Catalog Grid Component
 */
import { useState } from 'react';
import { Plus, Settings, Eye, EyeOff } from 'lucide-react';
import { useCatalogGrid } from '../../hooks/useCatalogGrid';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { ColumnManager } from './ColumnManager';
import { WBSSelector } from './WBSSelector';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatAsCurrency, toDisplayPrecision, formatAsPercentage } from '../../utils/monetary';
import { ChevronDown, ChevronRight, Lock } from 'lucide-react';
import { PriceReferenceChip } from './PriceReferenceChip';

interface CatalogGridProps {
  budgetId: string;
}

const DEFAULT_COLUMNS = [
  { key: 'code', label: 'Código', type: 'input' as const, visible: true },
  { key: 'short_description', label: 'Descripción', type: 'input' as const, visible: true },
  { key: 'unit', label: 'Unidad', type: 'input' as const, visible: true },
  { key: 'cantidad_real', label: 'Cantidad Real', type: 'input' as const, visible: true },
  { key: 'desperdicio_pct', label: '% Desperdicio', type: 'input' as const, visible: true },
  { key: 'cantidad', label: 'Cantidad', type: 'computed' as const, visible: true },
  { key: 'precio_real', label: 'Precio Real', type: 'input' as const, visible: true },
  { key: 'honorarios_pct', label: '% Honorarios', type: 'input' as const, visible: true },
  { key: 'pu', label: 'PU', type: 'computed' as const, visible: true },
  { key: 'total', label: 'Total', type: 'computed' as const, visible: true },
  { key: 'provider', label: 'Proveedor', type: 'input' as const, visible: true },
  { key: 'wbs_code', label: 'WBS', type: 'input' as const, visible: true },
];

export function CatalogGrid({ budgetId }: CatalogGridProps) {
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [columnManagerOpen, setColumnManagerOpen] = useState(false);

  const {
    budget,
    rows,
    hiddenCount,
    isLoading,
    selectedRows,
    hideZeros,
    setHideZeros,
    togglePartida,
    toggleRowSelection,
    selectAll,
    clearSelection,
    createPartida,
    createConcepto,
    updateConcepto,
  } = useCatalogGrid(budgetId);

  useKeyboardShortcuts({
    onDuplicate: () => console.log('Duplicate'),
    onSearch: () => console.log('Search'),
    onSelectAll: selectAll,
    onDelete: () => console.log('Delete'),
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Cargando catálogo...</div>;
  }

  if (!budget) {
    return <div className="p-8 text-center text-muted-foreground">Presupuesto no encontrado</div>;
  }

  const visibleColumns = columns.filter(col => col.visible);

  const handleAddPartida = () => {
    const orderIndex = rows.filter(r => r.type === 'partida').length;
    createPartida({
      budget_id: budgetId,
      name: 'Nueva Partida',
      order_index: orderIndex,
      active: true,
      notes: null,
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <Button onClick={handleAddPartida} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Partida
          </Button>

          <div className="flex items-center gap-2">
            <Switch
              id="hide-zeros"
              checked={hideZeros}
              onCheckedChange={setHideZeros}
            />
            <Label htmlFor="hide-zeros" className="cursor-pointer">
              Ocultar en cero
            </Label>
            {hiddenCount > 0 && (
              <Badge variant="secondary">{hiddenCount} ocultas</Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedRows.size > 0 && (
            <>
              <Badge>{selectedRows.size} seleccionadas</Badge>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Limpiar
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setColumnManagerOpen(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Columnas
          </Button>
        </div>
      </div>

      {/* Grid */}
      <ScrollArea className="flex-1">
        <div className="min-w-max">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background border-b">
            <div className="flex">
              <div className="w-12 border-r flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={selectedRows.size > 0}
                  onChange={() => selectedRows.size > 0 ? clearSelection() : selectAll()}
                  className="rounded"
                />
              </div>
              {visibleColumns.map((col) => (
                <div
                  key={col.key}
                  className={`px-3 py-2 text-sm font-medium border-r min-w-[120px] ${
                    col.type === 'computed' ? 'bg-muted/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.type === 'computed' && (
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          <div>
            {rows.map((row) => {
              if (row.type === 'partida') {
                return (
                  <div
                    key={row.id}
                    className="flex items-center bg-muted/50 border-b hover:bg-muted"
                  >
                    <div className="w-12 border-r flex items-center justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePartida(row.partida!.id)}
                      >
                        {row.isCollapsed ? (
                          <ChevronRight className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <div className="px-3 py-3 font-medium flex-1">
                      {row.partida!.name}
                    </div>
                  </div>
                );
              }

              if (row.type === 'subtotal') {
                return (
                  <div
                    key={row.id}
                    className="flex items-center bg-primary/5 border-b font-medium"
                  >
                    <div className="w-12 border-r"></div>
                    {visibleColumns.map((col, i) => (
                      <div
                        key={col.key}
                        className="px-3 py-2 text-sm border-r min-w-[120px]"
                      >
                        {i === 0 ? 'Subtotal' : col.key === 'total' ? formatAsCurrency(row.subtotal!) : ''}
                      </div>
                    ))}
                  </div>
                );
              }

              // Concepto row
              const concepto = row.concepto!;
              const isSelected = selectedRows.has(row.id);

              return (
                <div
                  key={row.id}
                  className={`flex items-center border-b hover:bg-muted/30 ${
                    isSelected ? 'bg-primary/10' : ''
                  }`}
                >
                  <div className="w-12 border-r flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRowSelection(row.id)}
                      className="rounded"
                    />
                  </div>
                  {visibleColumns.map((col) => (
                    <div
                      key={col.key}
                      className={`px-3 py-2 text-sm border-r min-w-[120px] ${
                        col.type === 'computed' ? 'bg-muted/10' : ''
                      }`}
                    >
                      {renderCell(concepto, col)}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </ScrollArea>

      {/* Column Manager */}
      <ColumnManager
        open={columnManagerOpen}
        onOpenChange={setColumnManagerOpen}
        columns={columns}
        onColumnsChange={setColumns}
      />
    </div>
  );
}

function renderCell(concepto: any, column: any) {
  const value = concepto[column.key];

  // Format based on field type
  if (column.key === 'cantidad_real' || column.key === 'cantidad') {
    return toDisplayPrecision(value || 0);
  }

  if (column.key === 'desperdicio_pct' || column.key === 'honorarios_pct') {
    return formatAsPercentage(value || 0);
  }

  if (column.key === 'precio_real' || column.key === 'pu' || column.key === 'total' || column.key === 'total_real') {
    return formatAsCurrency(value || 0);
  }

  if (column.key === 'wbs_code') {
    return (
      <div className="text-xs text-muted-foreground truncate">
        {value || '—'}
      </div>
    );
  }

  return value || '—';
}
