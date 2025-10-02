/**
 * Main Catalog Grid Component
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Settings, Trash2, Copy, FolderOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { tuAdapter } from '../../adapters/tu';
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
import { ConceptoEditPanel } from './ConceptoEditPanel';
import { TemplatePickerDialog } from './TemplatePickerDialog';
import { TemplateGalleryDialog } from '../templates/TemplateGalleryDialog';
import { ApplyTemplateDialog } from '../templates/ApplyTemplateDialog';
import { CreateTemplateFromBudgetDialog } from '../templates/CreateTemplateFromBudgetDialog';
import { ImportTUDialog } from './ImportTUDialog';
import { ApplyDefaultsDialog } from './ApplyDefaultsDialog';
import { BulkEditDialog } from './BulkEditDialog';
import { NewPartidaFromTUDialog } from './NewPartidaFromTUDialog';
import { NewSubpartidaFromTUDialog } from './NewSubpartidaFromTUDialog';
import { EditableCell } from './EditableCell';
import { CatalogRowActions } from './CatalogRowActions';
import { DevMonitor } from '../dev/DevMonitor';
import { KeyboardHintsBar } from './KeyboardHintsBar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatAsCurrency, toDisplayPrecision, formatAsPercentage } from '../../utils/monetary';
import { ChevronDown, ChevronRight, Lock, Loader2 } from 'lucide-react';
import { PriceReferenceChip } from './PriceReferenceChip';
import { toast } from 'sonner';
import { seedDemoData } from '../../services/seedService';
import { useAuth } from '@/hooks/useAuth';
import { isTemplatesEnabled } from '../../config/featureFlag';
import '../../styles/catalog-grid.css';

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
  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [newPartidaOpen, setNewPartidaOpen] = useState(false);
  const [newSubpartidaDialog, setNewSubpartidaDialog] = useState<{ 
    open: boolean; 
    partidaId?: string; 
    tuPartidaId?: string;
  }>({ open: false });
  const [groupByMayor, setGroupByMayor] = useState(true);
  const [newPartidaFromTUDialog, setNewPartidaFromTUDialog] = useState<{
    open: boolean;
    preselectedMayorId?: string;
  }>({ open: false });
  const { settings, saveSettings, isLoading: isLoadingSettings } = useColumnSettings(budgetId);

  // Handler para scroll automático al Mayor después de crear partida
  const handlePartidaCreated = useCallback((mayorId: string) => {
    setTimeout(() => {
      const element = document.getElementById(`mayor-header-${mayorId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Highlight efecto visual temporal
        element.classList.add('animate-pulse');
        setTimeout(() => element.classList.remove('animate-pulse'), 1000);
      }
    }, 300); // Pequeño delay para asegurar que el DOM se actualice
  }, []);

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
    bulkDelete,
    recomputeTime,
    dbLatency,
  } = useCatalogGrid(budgetId);

  // Cargar Mayores TU desde budget.settings.tu_mayores
  const tuMayoresIds = budget?.settings?.tu_mayores as string[] | undefined;
  const { data: mayoresTU = [], isLoading: loadingMayores } = useQuery({
    queryKey: ['tu-mayores-for-budget', budgetId, tuMayoresIds],
    queryFn: async () => {
      if (!tuMayoresIds || tuMayoresIds.length === 0) return [];
      const allMayores = await tuAdapter.getMayores('CONSTRUCCIÓN');
      return allMayores.filter(m => tuMayoresIds.includes(m.id));
    },
    enabled: groupByMayor && !!tuMayoresIds && tuMayoresIds.length > 0,
  });

  // Cargar mappings TU para las partidas del presupuesto con datos completos de TU
  const { data: partidaMappings = [] } = useQuery({
    queryKey: ['planning-tu-mappings', budgetId],
    queryFn: async () => {
      const partidaIds = partidas.map(p => p.id);
      if (partidaIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('planning_tu_mapping')
        .select(`
          partida_id, 
          tu_mayor_id, 
          tu_partida_id, 
          tu_departamento,
          notes,
          chart_of_accounts_partidas!planning_tu_mapping_tu_partida_id_fkey (
            codigo,
            nombre
          )
        `)
        .eq('budget_id', budgetId)
        .in('partida_id', partidaIds);
      
      if (error) throw error;
      return data || [];
    },
    enabled: partidas.length > 0,
  });

  // Agrupar partidas por Mayor TU con información completa
  const partidasByMayor = useMemo(() => {
    if (!groupByMayor || mayoresTU.length === 0) return null;
    
    const groups = new Map<string, any[]>();
    const mappingsMap = new Map(partidaMappings.map(m => [m.partida_id, m]));
    
    // Inicializar grupos con todos los Mayores (incluso vacíos)
    mayoresTU.forEach(mayor => {
      groups.set(mayor.id, []);
    });
    
    // Asignar partidas a sus grupos con info del mapping
    partidas.forEach(partida => {
      const mapping = mappingsMap.get(partida.id);
      if (mapping?.tu_mayor_id && groups.has(mapping.tu_mayor_id)) {
        groups.get(mapping.tu_mayor_id)!.push({
          ...partida,
          tuPartidaNombre: mapping.chart_of_accounts_partidas?.nombre || '',
          tuPartidaCodigo: mapping.chart_of_accounts_partidas?.codigo || partida.name,
        });
      }
    });
    
    return { groups, mayores: mayoresTU };
  }, [groupByMayor, partidas, mayoresTU, partidaMappings]);

  // Crear mapa de partidas enriquecidas para uso en vista plana también
  const enrichedPartidasMap = useMemo(() => {
    const mappingsMap = new Map(partidaMappings.map(m => [m.partida_id, m]));
    const enrichedMap = new Map<string, any>();
    
    partidas.forEach(partida => {
      const mapping = mappingsMap.get(partida.id);
      enrichedMap.set(partida.id, {
        ...partida,
        tuPartidaNombre: mapping?.chart_of_accounts_partidas?.nombre || '',
        tuPartidaCodigo: mapping?.chart_of_accounts_partidas?.codigo || partida.name,
      });
    });
    
    return enrichedMap;
  }, [partidas, partidaMappings]);

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

  const handleAddSubpartida = async (partidaId: string) => {
    // Buscar el tu_partida_id de la partida desde planning_tu_mapping
    try {
      const { data: mapping } = await supabase
        .from('planning_tu_mapping')
        .select('tu_partida_id')
        .eq('partida_id', partidaId)
        .maybeSingle();

      setNewSubpartidaDialog({
        open: true,
        partidaId,
        tuPartidaId: mapping?.tu_partida_id || undefined,
      });
    } catch (error) {
      console.error('Error fetching TU mapping:', error);
      setNewSubpartidaDialog({
        open: true,
        partidaId,
        tuPartidaId: undefined,
      });
    }
  };

  const handleDeleteSubpartida = async (partidaId: string) => {
    // Esta función ya no se usa con la nueva arquitectura TU
    toast.info('Usa el menú de acciones de cada concepto para eliminarlo');
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
            budgetSettings={budget?.settings}
          />
        );
      }

      // Computed fields with lock icon
      if (column.type === 'computed') {
        if (column.key === 'cantidad' || column.key === 'pu' || column.key === 'total') {
          return (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lock className="h-3 w-3" />
              <span>
                {column.key === 'total' || column.key === 'pu'
                  ? formatAsCurrency(value || 0)
                  : toDisplayPrecision(value || 0)}
              </span>
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

  const handleDuplicateSelected = async () => {
    const selectedConceptos = rows
      .filter(r => r.type === 'concepto' && selectedRows.has(r.id))
      .map(r => r.concepto);
    
    if (selectedConceptos.length === 0) {
      toast.error('No hay conceptos seleccionados');
      return;
    }

    if (!confirm(`¿Duplicar ${selectedConceptos.length} concepto(s) seleccionado(s)?`)) {
      return;
    }

    try {
      for (const concepto of selectedConceptos) {
        // Create a copy with a new ID
        await createConcepto({
          partida_id: concepto.partida_id,
          code: concepto.code,
          short_description: `${concepto.short_description} (Copia)`,
          long_description: concepto.long_description,
          unit: concepto.unit,
          provider: concepto.provider,
          order_index: concepto.order_index + 1,
          active: concepto.active,
          sumable: concepto.sumable,
          cantidad_real: concepto.cantidad_real,
          desperdicio_pct: concepto.desperdicio_pct,
          cantidad: concepto.cantidad,
          precio_real: concepto.precio_real,
          honorarios_pct: concepto.honorarios_pct,
          pu: concepto.pu,
          total_real: concepto.total_real,
          total: concepto.total,
          wbs_code: null,
          is_postventa: false,
          change_reason: null,
          props: concepto.props,
        });
      }
      
      toast.success(`${selectedConceptos.length} concepto(s) duplicado(s)`);
      clearSelection();
    } catch (error) {
      console.error('Error duplicating conceptos:', error);
      toast.error('Error al duplicar conceptos');
    }
  };

  const handleDeleteSelected = async () => {
    const selectedConceptos = rows
      .filter(r => r.type === 'concepto' && selectedRows.has(r.id))
      .map(r => r.concepto);
    
    if (selectedConceptos.length === 0) {
      toast.error('No hay conceptos seleccionados');
      return;
    }

    if (!confirm(`¿Eliminar ${selectedConceptos.length} concepto(s) seleccionado(s)? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await bulkDelete();
      toast.success(`${selectedConceptos.length} concepto(s) eliminado(s)`);
    } catch (error) {
      console.error('Error deleting conceptos:', error);
      toast.error('Error al eliminar conceptos');
    }
  };

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    onNewPartida: handleAddPartida,
    onNewSubpartida: () => {
      // Find first selected row that is a concepto to get its partida_id
      const selectedConcepto = rows.find(r => r.type === 'concepto' && selectedRows.has(r.id))?.concepto;
      if (selectedConcepto) {
        handleAddSubpartida(selectedConcepto.partida_id);
      } else {
        toast.info('Selecciona un concepto primero para agregar una subpartida');
      }
    },
    onDuplicate: handleDuplicateSelected,
    onOpenColumns: () => setColumnManagerOpen(true),
    onOpenTemplates: () => setTemplateGalleryOpen(true),
    onSelectAll: selectAll,
  });

  return (
    <div className="plv2-catalog-container plv2-no-x-scroll">
      {/* Keyboard Hints Bar */}
      <KeyboardHintsBar />

      {/* Toolbar */}
      <TooltipProvider>
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={handleAddPartida} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Partida
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Crear nueva partida (N)</p>
              </TooltipContent>
            </Tooltip>

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

          {tuMayoresIds && tuMayoresIds.length > 0 && (
            <div className="flex items-center gap-2">
              <Switch
                id="group-by-mayor"
                checked={groupByMayor}
                onCheckedChange={setGroupByMayor}
              />
              <Label htmlFor="group-by-mayor" className="cursor-pointer">
                Agrupar por Mayor (TU)
              </Label>
            </div>
          )}
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
                Editar en Lote
              </Button>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDuplicateSelected}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicar
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Duplicar seleccionadas (D)</p>
                </TooltipContent>
              </Tooltip>
              
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleDeleteSelected}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
              
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Limpiar Selección
              </Button>
            </>
          )}

          {isTemplatesEnabled() && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTemplateGalleryOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Plantillas
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Agregar partidas desde plantillas (T)</p>
              </TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportTUOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar desde TU
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Agregar subpartidas desde Transacciones Unificadas</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setApplyDefaultsOpen(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Aplicar Defaults
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Aplicar valores predeterminados a conceptos seleccionados</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setColumnManagerOpen(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Columnas
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Gestionar columnas visibles (C)</p>
            </TooltipContent>
          </Tooltip>

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
        <ScrollArea className="flex-1 overflow-x-hidden plv2-no-x-scroll">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="min-w-0 w-full plv2-grid">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background border-b min-w-0">
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
                    className={`px-3 py-2 text-sm font-medium border-r min-w-[120px] max-w-[200px] ${
                      col.type === 'computed' ? 'bg-muted/30' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1 min-w-0">
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
                {groupByMayor && partidasByMayor ? (
                  // Vista agrupada por Mayor
                  mayoresTU.map((mayor) => {
                    const partidasInGroup = partidasByMayor.groups.get(mayor.id) || [];
                    const rowsInGroup = rows.filter(r => 
                      r.type === 'partida' 
                        ? partidasInGroup.some(p => p.id === r.partida?.id)
                        : partidasInGroup.some(p => p.id === r.concepto?.partida_id)
                    );

                    return (
                      <div key={mayor.id} className="mb-4">
                        {/* Mayor Group Header */}
                        <div 
                          id={`mayor-header-${mayor.id}`}
                          className="flex items-center justify-between px-4 py-3 bg-primary/10 border-y border-primary/20"
                        >
                          <div className="flex items-center gap-3">
                            <FolderOpen className="h-5 w-5 text-primary" />
                            <div>
                              <span className="text-xs font-mono text-primary font-semibold">
                                {mayor.codigo}
                              </span>
                              <span className="ml-2 text-sm font-medium">
                                {mayor.nombre}
                              </span>
                            </div>
                            <Badge variant="secondary" className="ml-2">
                              {partidasInGroup.length} {partidasInGroup.length === 1 ? 'partida' : 'partidas'}
                            </Badge>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setNewPartidaFromTUDialog({ 
                              open: true, 
                              preselectedMayorId: mayor.id 
                            })}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Nueva Partida (desde TU)
                          </Button>
                        </div>

                        {/* Partidas y Conceptos del grupo */}
                        {rowsInGroup.map((row) => {
                          if (row.type === 'partida') {
                            // Buscar la partida enriquecida con info TU
                            const enrichedPartida = partidasInGroup.find(p => p.id === row.partida!.id) || row.partida!;
                            
                            return (
                              <EditablePartidaRow
                                key={row.id}
                                id={row.id}
                                partida={enrichedPartida}
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

                    if (row.type === 'subtotal') {
                      return (
                        <div
                          key={row.id}
                          className="flex items-center bg-primary/5 border-b font-medium min-w-0"
                        >
                          <div className="w-12 border-r"></div>
                          {visibleColumns.map((col, i) => (
                            <div
                              key={col.key}
                              className="px-3 py-2 text-sm border-r min-w-[120px] max-w-[200px]"
                            >
                              {i === 0 ? 'Subtotal Partida' : col.key === 'total' ? formatAsCurrency(row.subtotal!) : ''}
                            </div>
                          ))}
                        </div>
                      );
                    }

                    if (row.type === 'subpartida') {
                      return (
                        <div
                          key={row.id}
                          className="flex items-center bg-muted/50 border-b font-medium min-w-0"
                        >
                          <div className="w-12 border-r"></div>
                          <div className="px-3 py-2 text-sm font-medium min-w-0 break-words">
                            Subpartida ({row.subpartidaCount} conceptos)
                          </div>
                          <div className="ml-auto px-3 py-2 text-sm font-medium">
                            {formatAsCurrency(row.subtotal || 0)}
                          </div>
                        </div>
                      );
                    }

                          if (row.type !== 'concepto' || !row.concepto) return null;
                          
                          const concepto = row.concepto;
                          const isSelected = selectedRows.has(row.id);
                          const isZeroQuantity = concepto.cantidad_real === 0 || concepto.cantidad_real == null;

                          return (
                            <DraggableConceptoRow
                              key={row.id}
                              id={row.id}
                              concepto={concepto}
                              isSelected={isSelected}
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
                    );
                  })
                ) : (
                  // Vista plana (sin agrupar)
                  rows.map((row) => {
                    if (row.type === 'partida') {
                      // Usar partida enriquecida con info TU
                      const enrichedPartida = enrichedPartidasMap.get(row.partida!.id) || row.partida!;
                      
                      return (
                        <EditablePartidaRow
                          key={row.id}
                          id={row.id}
                          partida={enrichedPartida}
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

                    if (row.type === 'subtotal') {
                      return (
                        <div
                          key={row.id}
                          className="flex items-center bg-primary/5 border-b font-medium min-w-0"
                        >
                          <div className="w-12 border-r"></div>
                          {visibleColumns.map((col, i) => (
                            <div
                              key={col.key}
                              className="px-3 py-2 text-sm border-r min-w-[120px] max-w-[200px]"
                            >
                              {i === 0 ? 'Subtotal Partida' : col.key === 'total' ? formatAsCurrency(row.subtotal!) : ''}
                            </div>
                          ))}
                        </div>
                      );
                    }

                    if (row.type === 'subpartida') {
                      return (
                        <div
                          key={row.id}
                          className="flex items-center bg-muted/50 border-b font-medium min-w-0"
                        >
                          <div className="w-12 border-r"></div>
                          <div className="px-3 py-2 text-sm font-medium min-w-0 break-words">
                            Subpartida ({row.subpartidaCount} conceptos)
                          </div>
                          <div className="ml-auto px-3 py-2 text-sm font-medium">
                            {formatAsCurrency(row.subtotal || 0)}
                          </div>
                        </div>
                      );
                    }

                    // Concepto rows with drag & drop
                    if (row.type !== 'concepto' || !row.concepto) return null;
                    
                    const concepto = row.concepto;
                    const isSelected = selectedRows.has(row.id);
                    const isZeroQuantity = concepto.cantidad_real === 0 || concepto.cantidad_real == null;

                    return (
                      <DraggableConceptoRow
                        key={row.id}
                        id={row.id}
                        concepto={concepto}
                        isSelected={isSelected}
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
                  })
                )}
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
        budgetId={budgetId}
        onCreateFromBudget={() => setCreateTemplateOpen(true)}
      />
      
      {/* Create Template from Budget */}
      <CreateTemplateFromBudgetDialog
        open={createTemplateOpen}
        onOpenChange={setCreateTemplateOpen}
        budgetId={budgetId}
        budgetName={budget?.name || 'Presupuesto'}
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

      {/* New Partida Dialog (from TU) */}
      <NewPartidaFromTUDialog
        open={newPartidaOpen}
        onOpenChange={setNewPartidaOpen}
        budgetId={budgetId}
        orderIndex={rows.filter(r => r.type === 'partida').length}
        tuMayoresWhitelist={budget?.settings?.tu_mayores || []}
      />

      {/* New Subpartida Dialog (from TU) */}
      <NewSubpartidaFromTUDialog
        open={newSubpartidaDialog.open}
        onOpenChange={(open) => setNewSubpartidaDialog({ open })}
        budgetId={budgetId}
        partidaId={newSubpartidaDialog.partidaId || ''}
        tuPartidaId={newSubpartidaDialog.tuPartidaId}
        orderIndex={
          newSubpartidaDialog.partidaId
            ? rows.filter(r => r.type === 'concepto' && r.concepto?.partida_id === newSubpartidaDialog.partidaId).length
            : 0
        }
        budgetDefaults={{
          honorarios_pct_default: budget?.settings?.honorarios_pct_default ?? 0.17,
          desperdicio_pct_default: budget?.settings?.desperdicio_pct_default ?? 0.05,
        }}
      />

      {/* New Partida from Mayor Header (TU) - with preselected Mayor and auto-scroll */}
      <NewPartidaFromTUDialog
        open={newPartidaFromTUDialog.open}
        onOpenChange={(open) => setNewPartidaFromTUDialog({ open })}
        budgetId={budgetId}
        orderIndex={partidas.length}
        tuMayoresWhitelist={tuMayoresIds}
        preselectedMayorId={newPartidaFromTUDialog.preselectedMayorId}
        onCreated={handlePartidaCreated}
      />

      {/* Dev Monitor - Performance tracking (DEV-ONLY) */}
      <DevMonitor recomputeTime={recomputeTime} dbLatency={dbLatency} />
      </TooltipProvider>
    </div>
  );
}
