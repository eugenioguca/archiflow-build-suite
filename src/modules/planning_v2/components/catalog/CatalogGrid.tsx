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
import { EditablePartidaRow } from './EditablePartidaRow';
import { SubpartidaHeader } from './SubpartidaHeader';
import { ConceptoEditPanel } from './ConceptoEditPanel';
import { TemplatePickerDialog } from './TemplatePickerDialog';
import { TemplateGalleryDialog } from '../templates/TemplateGalleryDialog';
import { ApplyTemplateDialog } from '../templates/ApplyTemplateDialog';
import { ImportTUDialog } from './ImportTUDialog';
import { ApplyDefaultsDialog } from './ApplyDefaultsDialog';
import { BulkEditDialog } from './BulkEditDialog';
import { NewPartidaDialog } from './NewPartidaDialog';
import { EditableCell } from './EditableCell';
import { CatalogRowActions } from './CatalogRowActions';
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
  const [editingConcepto, setEditingConcepto] = useState<any>(null);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [importTUOpen, setImportTUOpen] = useState(false);
  const [applyDefaultsOpen, setApplyDefaultsOpen] = useState(false);
  const [templateGalleryOpen, setTemplateGalleryOpen] = useState(false);
  const [applyTemplateOpen, setApplyTemplateOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [newPartidaOpen, setNewPartidaOpen] = useState(false);
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
    partidas,
    rows,
    hiddenCount,
    isLoading,
    selectedRows,
    hideZeros,
    setHideZeros,
    togglePartida,
    toggleSubpartida,
    toggleRowSelection,
    selectAll,
    clearSelection,
    createPartida,
    updatePartida,
    deletePartida,
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

  // Handle drag end for both partidas and conceptos
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    // Find active and over rows
    const activeRow = rows.find(r => r.id === activeId);
    const overRow = rows.find(r => r.id === overId);

    if (!activeRow || !overRow) return;

    // Handle partida reordering
    if (activeRow.type === 'partida' && overRow.type === 'partida') {
      const activePartida = activeRow.partida!;
      const overPartida = overRow.partida!;
      
      updatePartida({
        id: activePartida.id,
        updates: { order_index: overPartida.order_index }
      });
      toast.success('Partida reordenada');
      return;
    }

    // Handle concepto reordering
    if (activeRow.type === 'concepto' && overRow.type === 'concepto') {
      const activeConcepto = activeRow.concepto!;
      const overConcepto = overRow.concepto!;

      // Calculate new order index and partida
      const newPartidaId = overConcepto.partida_id;
      const newOrderIndex = overConcepto.order_index;

      if (activeConcepto.id && newPartidaId) {
        reorderConcepto(activeConcepto.id, newPartidaId, newOrderIndex);
        toast.success('Concepto reordenado');
      }
    }
  }, [rows, reorderConcepto, updatePartida]);

  // Keyboard navigation (Alt + Arrow keys) for both partidas and conceptos
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey) return;

      // Handle partida reordering
      const partidaRows = rows.filter(r => r.type === 'partida');
      const firstPartida = partidaRows[0];
      
      if (firstPartida) {
        // Check if any partida is focused/selected
        const activeElement = document.activeElement;
        const partidaElement = activeElement?.closest('[data-partida-id]');
        
        if (partidaElement) {
          const partidaId = partidaElement.getAttribute('data-partida-id');
          const currentIndex = partidaRows.findIndex(r => r.partida?.id === partidaId);
          
          if (currentIndex !== -1) {
            let targetIndex = -1;
            if (e.key === 'ArrowUp' && currentIndex > 0) {
              targetIndex = currentIndex - 1;
              e.preventDefault();
            } else if (e.key === 'ArrowDown' && currentIndex < partidaRows.length - 1) {
              targetIndex = currentIndex + 1;
              e.preventDefault();
            }
            
            if (targetIndex >= 0) {
              const currentPartida = partidaRows[currentIndex].partida!;
              const targetPartida = partidaRows[targetIndex].partida!;
              
              updatePartida({
                id: currentPartida.id,
                updates: { order_index: targetPartida.order_index }
              });
              toast.success('Partida movida con teclado');
            }
            return;
          }
        }
      }

      // Handle concepto reordering (existing logic)
      if (selectedRows.size !== 1) return;
      
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
  }, [rows, selectedRows, reorderConcepto, updatePartida]);

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
    setNewPartidaOpen(true);
  };

  const handleAddSubpartida = (partidaId: string) => {
    // Create a new concepto as a subpartida placeholder
    const wbsCode = prompt('Ingrese el código WBS para la subpartida (ej: 1.1, 2.3):');
    if (!wbsCode) return;

    // Find max order_index in this partida
    const partidaConceptos = rows
      .filter(r => r.type === 'concepto' && r.concepto?.partida_id === partidaId)
      .map(r => r.concepto!);
    
    const maxOrder = partidaConceptos.length > 0
      ? Math.max(...partidaConceptos.map(c => c.order_index))
      : 0;

    // Create a header concepto for this subpartida
    createConcepto({
      partida_id: partidaId,
      code: wbsCode,
      short_description: `Subpartida ${wbsCode}`,
      long_description: null,
      unit: 'PZA',
      provider: null,
      order_index: maxOrder + 1,
      active: true,
      sumable: false, // Not sumable as it's a header
      cantidad_real: 0,
      desperdicio_pct: 0,
      cantidad: 0,
      precio_real: 0,
      honorarios_pct: 0,
      pu: 0,
      total_real: 0,
      total: 0,
      wbs_code: wbsCode,
      props: {},
    });
    
    toast.success(`Subpartida ${wbsCode} creada`);
  };

  const handleDeleteSubpartida = async (partidaId: string, wbsCode: string) => {
    if (!confirm(`¿Eliminar subpartida ${wbsCode} y todos sus conceptos?`)) return;
    
    try {
      // Find all conceptos with this WBS code in this partida
      const conceptosToDelete = rows
        .filter(r => r.type === 'concepto' && 
                r.concepto?.partida_id === partidaId && 
                r.concepto?.wbs_code === wbsCode)
        .map(r => r.concepto!);
      
      // Import deleteConcepto from service
      const { deleteConcepto: deleteConceptoService } = await import('../../services/budgetService');
      
      // Delete all conceptos in this subpartida
      await Promise.all(conceptosToDelete.map(c => deleteConceptoService(c.id)));
      
      toast.success(`Subpartida ${wbsCode} eliminada`);
    } catch (error) {
      console.error('Error deleting subpartida:', error);
      toast.error('Error al eliminar subpartida');
    }
  };

  // Create renderCell closure with updateConcepto wrapper
  const handleCellSave = useCallback(
    async (conceptoId: string, field: string, value: any) => {
      await updateConcepto({ id: conceptoId, updates: { [field]: value } });
    },
    [updateConcepto]
  );

  const renderCell = useCallback(
    (concepto: any, column: any) => {
      const value = concepto[column.key];

      // Use EditableCell for input columns
      if (column.type === 'input') {
        const formatFn =
          column.key === 'desperdicio_pct' || column.key === 'honorarios_pct'
            ? formatAsPercentage
            : column.key === 'precio_real'
            ? formatAsCurrency
            : column.key === 'cantidad_real'
            ? toDisplayPrecision
            : undefined;

        return (
          <EditableCell
            value={value}
            concepto={concepto}
            columnKey={column.key}
            columnType={column.type}
            onSave={handleCellSave}
            formatFn={formatFn}
          />
        );
      }

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

      // Fallback formatting
      if (column.key === 'cantidad_real' || column.key === 'cantidad') {
        return toDisplayPrecision(value || 0);
      }

      if (column.key === 'desperdicio_pct' || column.key === 'honorarios_pct') {
        return formatAsPercentage(value || 0);
      }

      if (
        column.key === 'precio_real' ||
        column.key === 'pu' ||
        column.key === 'total' ||
        column.key === 'total_real'
      ) {
        return formatAsCurrency(value || 0);
      }

      if (column.key === 'wbs_code') {
        return <div className="text-xs text-muted-foreground truncate">{value || '—'}</div>;
      }

      return value || '—';
    },
    [handleCellSave]
  );

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
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => setBulkEditOpen(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Editar Seleccionadas
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Limpiar
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setTemplateGalleryOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar desde Plantilla
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportTUOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar desde TU
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setApplyDefaultsOpen(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Aplicar Defaults
          </Button>

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
              items={[
                ...rows.filter(r => r.type === 'partida').map(r => r.id),
                ...rows.filter(r => r.type === 'concepto').map(r => r.id)
              ]}
              strategy={verticalListSortingStrategy}
            >
              <div>
                {rows.map((row) => {
                  if (row.type === 'partida') {
                    return (
                      <EditablePartidaRow
                        key={row.id}
                        id={row.id}
                        partida={row.partida!}
                        isCollapsed={row.isCollapsed || false}
                        onToggle={() => togglePartida(row.partida!.id)}
                        onUpdate={(updates) => updatePartida({ id: row.partida!.id, updates })}
                        onDelete={() => {
                          if (confirm('¿Eliminar partida?')) {
                            deletePartida(row.partida!.id);
                          }
                        }}
                        onAddSubpartida={() => handleAddSubpartida(row.partida!.id)}
                      />
                    );
                  }

                  if (row.type === 'subpartida') {
                    return (
                      <SubpartidaHeader
                        key={row.id}
                        wbsCode={row.subpartidaWbs!}
                        count={row.subpartidaCount!}
                        subtotal={row.subtotal!}
                        isCollapsed={row.isCollapsed || false}
                        onToggle={() => {
                          const partidaId = row.id.split('-')[1];
                          toggleSubpartida(`${partidaId}-${row.subpartidaWbs}`);
                        }}
                        onDelete={() => {
                          const partidaId = row.id.split('-')[1];
                          handleDeleteSubpartida(partidaId, row.subpartidaWbs!);
                        }}
                      />
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
                            {i === 0 ? 'Subtotal Partida' : col.key === 'total' ? formatAsCurrency(row.subtotal!) : ''}
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
                      onRowClick={() => setEditingConcepto(concepto)}
                      renderCell={renderCell}
                      actionsContent={
                        <CatalogRowActions
                          row={row}
                          budgetId={budgetId}
                          projectId={budget?.project_id || ''}
                          clientId={budget?.client_id || ''}
                        />
                      }
                    />
                  );
                })}
              </div>
            </SortableContext>
          </div>
        </DndContext>
      </ScrollArea>

      {/* Concepto Edit Panel */}
      <ConceptoEditPanel
        concepto={editingConcepto}
        open={!!editingConcepto}
        onOpenChange={(open) => !open && setEditingConcepto(null)}
        onSave={() => {
          setEditingConcepto(null);
        }}
      />

      {/* Template Picker Dialog */}
      <TemplatePickerDialog
        open={templatePickerOpen}
        onOpenChange={setTemplatePickerOpen}
        partidas={partidas}
        budgetId={budgetId}
        onSuccess={() => {
          // Refresh handled by mutation
        }}
      />

      {/* Import TU Dialog */}
      <ImportTUDialog
        open={importTUOpen}
        onClose={() => setImportTUOpen(false)}
        budgetId={budgetId}
        departamento="CONSTRUCCIÓN"
      />

      {/* Apply Defaults Dialog */}
      <ApplyDefaultsDialog
        open={applyDefaultsOpen}
        onClose={() => setApplyDefaultsOpen(false)}
        budgetId={budgetId}
        budgetSettings={budget?.settings || {}}
      />

      {/* Template Gallery Dialog */}
      <TemplateGalleryDialog
        open={templateGalleryOpen}
        onOpenChange={setTemplateGalleryOpen}
        onSelectTemplate={(templateId) => {
          setSelectedTemplateId(templateId);
          setTemplateGalleryOpen(false);
          setApplyTemplateOpen(true);
        }}
      />

      {/* Apply Template Dialog */}
      <ApplyTemplateDialog
        open={applyTemplateOpen}
        onOpenChange={setApplyTemplateOpen}
        budgetId={budgetId}
        preselectedTemplateId={selectedTemplateId}
      />

      {/* Column Manager */}
      <ColumnManager
        open={columnManagerOpen}
        onOpenChange={setColumnManagerOpen}
        columns={columns}
        onColumnsChange={handleColumnsChange}
      />

      {/* Bulk Edit Dialog */}
      <BulkEditDialog
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        selectedConceptos={rows
          .filter(r => r.type === 'concepto' && selectedRows.has(r.id))
          .map(r => r.concepto)}
        budgetId={budgetId}
      />

      {/* New Partida Dialog */}
      <NewPartidaDialog
        open={newPartidaOpen}
        onOpenChange={setNewPartidaOpen}
        budgetId={budgetId}
        orderIndex={rows.filter(r => r.type === 'partida').length}
        budgetDefaults={{
          honorarios_pct_default: budget?.settings?.honorarios_pct_default ?? 0.17,
          desperdicio_pct_default: budget?.settings?.desperdicio_pct_default ?? 0.05,
        }}
      />

      {/* Dev Monitor - Performance tracking (DEV-ONLY) */}
      <DevMonitor recomputeTime={recomputeTime} dbLatency={dbLatency} />
    </div>
  );
}
