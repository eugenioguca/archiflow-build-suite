/**
 * Main Catalog Grid Component
 */
import { useState, useEffect, useCallback } from 'react';
import { Plus, Settings } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useCatalogGrid } from '../../hooks/useCatalogGrid';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useColumnSettings } from '../../hooks/useColumnSettings';
import { ColumnManager } from './ColumnManager';
import { DraggableConceptoRow } from './DraggableConceptoRow';
import { DevMonitor } from '../dev/DevMonitor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatAsCurrency, toDisplayPrecision, formatAsPercentage } from '../../utils/monetary';
import { ChevronDown, ChevronRight, Lock, Loader2 } from 'lucide-react';
import { PriceReferenceChip } from './PriceReferenceChip';
import { toast } from 'sonner';
import { seedDemoData } from '../../services/seedService';
import { useAuth } from '@/hooks/useAuth';

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
  const { user } = useAuth();
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [columnManagerOpen, setColumnManagerOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const { settings, saveSettings, isLoading: isLoadingSettings } = useColumnSettings(budgetId);

  // Load saved settings when available
  useEffect(() => {
    if (settings && settings.length > 0) {
      setColumns(settings);
    }
  }, [settings]);

  // Save settings when columns change (debounced via mutation)
  const handleColumnsChange = (newColumns: typeof DEFAULT_COLUMNS) => {
    setColumns(newColumns);
    saveSettings(newColumns);
  };

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
    reorderConcepto,
    recomputeTime,
    dbLatency,
  } = useCatalogGrid(budgetId);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    // Find active and over rows
    const activeRow = rows.find(r => r.id === activeId);
    const overRow = rows.find(r => r.id === overId);

    if (!activeRow || !overRow || activeRow.type !== 'concepto' || overRow.type !== 'concepto') {
      return;
    }

    const activeConcepto = activeRow.concepto!;
    const overConcepto = overRow.concepto!;

    // Calculate new order index and partida
    const newPartidaId = overConcepto.partida_id;
    const newOrderIndex = overConcepto.order_index;

    if (activeConcepto.id && newPartidaId) {
      reorderConcepto(activeConcepto.id, newPartidaId, newOrderIndex);
      toast.success('Concepto reordenado');
    }
  }, [rows, reorderConcepto]);

  // Keyboard navigation (Alt + Arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey || selectedRows.size !== 1) return;

      const selectedId = Array.from(selectedRows)[0];
      const selectedRow = rows.find(r => r.id === selectedId);
      
      if (!selectedRow || selectedRow.type !== 'concepto') return;

      const conceptoRows = rows.filter(r => r.type === 'concepto');
      const currentIndex = conceptoRows.findIndex(r => r.id === selectedId);

      if (currentIndex === -1) return;

      let targetIndex = -1;
      if (e.key === 'ArrowUp' && currentIndex > 0) {
        targetIndex = currentIndex - 1;
        e.preventDefault();
      } else if (e.key === 'ArrowDown' && currentIndex < conceptoRows.length - 1) {
        targetIndex = currentIndex + 1;
        e.preventDefault();
      }

      if (targetIndex >= 0) {
        const targetRow = conceptoRows[targetIndex];
        const activeConcepto = selectedRow.concepto!;
        const targetConcepto = targetRow.concepto!;

        if (activeConcepto.id && targetConcepto.partida_id) {
          reorderConcepto(
            activeConcepto.id,
            targetConcepto.partida_id,
            targetConcepto.order_index
          );
          toast.success('Concepto movido con teclado');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rows, selectedRows, reorderConcepto]);

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

  const handleSeedDemo = async () => {
    if (!user?.id) return;
    
    setIsSeeding(true);
    try {
      const result = await seedDemoData(user.id);
      toast.success(`Demo creado: ${result.conceptosCount} conceptos en ${result.partidasCount} partidas (${(result.timeMs / 1000).toFixed(2)}s)`);
      // Note: The demo budget is separate, not affecting the current budget
    } catch (error) {
      console.error('Error seeding demo data:', error);
      toast.error('Error al crear datos de demo');
    } finally {
      setIsSeeding(false);
    }
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
          <span className="text-xs text-muted-foreground ml-2">
            Tip: Alt+↑/↓ para mover con teclado
          </span>
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

          {import.meta.env.DEV && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeedDemo}
              disabled={isSeeding}
            >
              {isSeeding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Seed 10K
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Grid */}
      <ScrollArea className="flex-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
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
            <SortableContext
              items={rows.filter(r => r.type === 'concepto').map(r => r.id)}
              strategy={verticalListSortingStrategy}
            >
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

                  // Concepto rows with drag & drop
                  const concepto = row.concepto!;
                  const isSelected = selectedRows.has(row.id);
                  const needsWBS = concepto.active && concepto.sumable && !concepto.wbs_code;
                  const isZeroQuantity = concepto.cantidad_real === 0 || concepto.cantidad_real == null;

                  return (
                    <DraggableConceptoRow
                      key={row.id}
                      id={row.id}
                      concepto={concepto}
                      isSelected={isSelected}
                      needsWBS={needsWBS}
                      isZeroQuantity={isZeroQuantity}
                      visibleColumns={visibleColumns}
                      onToggleSelection={() => toggleRowSelection(row.id)}
                      renderCell={renderCell}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </div>
        </DndContext>
      </ScrollArea>

      {/* Column Manager */}
      <ColumnManager
        open={columnManagerOpen}
        onOpenChange={setColumnManagerOpen}
        columns={columns}
        onColumnsChange={handleColumnsChange}
      />

      {/* Dev Monitor - Performance tracking (DEV-ONLY) */}
      <DevMonitor recomputeTime={recomputeTime} dbLatency={dbLatency} />
    </div>
  );
}

function renderCell(concepto: any, column: any) {
  const value = concepto[column.key];

  // Computed fields with lock icon and price intelligence
  if (column.type === 'computed') {
    if (column.key === 'cantidad' || column.key === 'pu' || column.key === 'total') {
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>
              {column.key === 'total' || column.key === 'pu'
                ? formatAsCurrency(value || 0)
                : toDisplayPrecision(value || 0)}
            </span>
          </div>
          {/* Show price intelligence for PU field */}
          {column.key === 'pu' && concepto.wbs_code && concepto.unit && (
            <PriceReferenceChip
              wbsCode={concepto.wbs_code}
              unit={concepto.unit}
              currentPrice={value}
              windowDays={90}
            />
          )}
        </div>
      );
    }
  }

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
