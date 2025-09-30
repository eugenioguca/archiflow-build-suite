/**
 * Hook for catalog grid state and operations
 */
import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { PlanningPartida, PlanningConcepto } from '../types';
import {
  getBudgetById,
  createPartida,
  updatePartida,
  deletePartida,
  createConcepto,
  updateConcepto,
  deleteConcepto,
  computePartidaAggregations,
} from '../services/budgetService';
import { useToast } from '@/hooks/use-toast';

export interface CatalogRow {
  id: string;
  type: 'partida' | 'concepto' | 'subtotal' | 'subpartida';
  depth: number;
  partida?: PlanningPartida;
  concepto?: PlanningConcepto;
  subtotal?: number;
  subpartidaWbs?: string;
  subpartidaCount?: number;
  isCollapsed?: boolean;
}

export function useCatalogGrid(budgetId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [hideZeros, setHideZeros] = useState(false);
  const [collapsedPartidas, setCollapsedPartidas] = useState<Set<string>>(new Set());
  const [collapsedSubpartidas, setCollapsedSubpartidas] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null);
  
  // Performance tracking (DEV-ONLY)
  const [recomputeTime, setRecomputeTime] = useState(0);
  const [dbLatency, setDbLatency] = useState(0);

  // Fetch budget data
  const { data, isLoading, error } = useQuery({
    queryKey: ['planning-budget', budgetId],
    queryFn: async () => {
      const start = performance.now();
      const result = await getBudgetById(budgetId);
      const end = performance.now();
      if (import.meta.env.DEV) {
        setDbLatency(end - start);
      }
      return result;
    },
  });

  // Build flat rows for virtualization with WBS grouping
  const rows = useMemo((): { rows: CatalogRow[]; hiddenCount: number } => {
    const start = performance.now();
    if (!data) return { rows: [], hiddenCount: 0 };

    const result: CatalogRow[] = [];
    let hiddenCount = 0;

    for (const partida of data.partidas) {
      if (!partida.active) continue;

      const isPartidaCollapsed = collapsedPartidas.has(partida.id);

      // Partida header row
      result.push({
        id: `partida-${partida.id}`,
        type: 'partida',
        depth: 0,
        partida,
        isCollapsed: isPartidaCollapsed,
      });

      if (!isPartidaCollapsed) {
        // Get all conceptos for this partida
        const conceptos = data.conceptos.filter(c => c.partida_id === partida.id && c.active);
        
        // Group by WBS code
        const wbsGroups = new Map<string, typeof conceptos>();
        const noWbsConceptos: typeof conceptos = [];
        
        for (const concepto of conceptos) {
          if (concepto.wbs_code) {
            const group = wbsGroups.get(concepto.wbs_code) || [];
            group.push(concepto);
            wbsGroups.set(concepto.wbs_code, group);
          } else {
            noWbsConceptos.push(concepto);
          }
        }

        // Render WBS groups first
        for (const [wbsCode, groupConceptos] of Array.from(wbsGroups.entries()).sort()) {
          const isSubpartidaCollapsed = collapsedSubpartidas.has(`${partida.id}-${wbsCode}`);
          const groupSubtotal = groupConceptos
            .filter(c => c.sumable)
            .reduce((sum, c) => sum + c.total, 0);

          // Subpartida header
          result.push({
            id: `subpartida-${partida.id}-${wbsCode}`,
            type: 'subpartida',
            depth: 1,
            subpartidaWbs: wbsCode,
            subpartidaCount: groupConceptos.length,
            subtotal: groupSubtotal,
            isCollapsed: isSubpartidaCollapsed,
          });

          if (!isSubpartidaCollapsed) {
            // Conceptos in this WBS group
            for (const concepto of groupConceptos) {
              const shouldHide = hideZeros && (
                concepto.total === 0 || concepto.cantidad_real === 0
              );

              if (shouldHide) {
                hiddenCount++;
                continue;
              }

              result.push({
                id: `concepto-${concepto.id}`,
                type: 'concepto',
                depth: 2,
                concepto,
              });
            }
          }
        }

        // Render conceptos without WBS
        for (const concepto of noWbsConceptos) {
          const shouldHide = hideZeros && (
            concepto.total === 0 || concepto.cantidad_real === 0
          );

          if (shouldHide) {
            hiddenCount++;
            continue;
          }

          result.push({
            id: `concepto-${concepto.id}`,
            type: 'concepto',
            depth: 1,
            concepto,
          });
        }

        // Partida subtotal row
        const partidaSubtotal = conceptos
          .filter(c => c.sumable)
          .reduce((sum, c) => sum + c.total, 0);

        result.push({
          id: `subtotal-${partida.id}`,
          type: 'subtotal',
          depth: 1,
          subtotal: partidaSubtotal,
        });
      }
    }

    const end = performance.now();
    if (import.meta.env.DEV) {
      setRecomputeTime(end - start);
    }
    
    return { rows: result, hiddenCount };
  }, [data, collapsedPartidas, collapsedSubpartidas, hideZeros]);

  // Mutations
  const createPartidaMutation = useMutation({
    mutationFn: createPartida,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-budget', budgetId] });
      toast({ title: 'Partida creada' });
    },
    onError: () => {
      toast({ title: 'Error al crear partida', variant: 'destructive' });
    },
  });

  const updatePartidaMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PlanningPartida> }) =>
      updatePartida(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-budget', budgetId] });
    },
    onError: () => {
      toast({ title: 'Error al actualizar partida', variant: 'destructive' });
    },
  });

  const createConceptoMutation = useMutation({
    mutationFn: createConcepto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-budget', budgetId] });
      toast({ title: 'Concepto creado' });
    },
    onError: () => {
      toast({ title: 'Error al crear concepto', variant: 'destructive' });
    },
  });

  const updateConceptoMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PlanningConcepto> }) =>
      updateConcepto(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-budget', budgetId] });
    },
    onError: () => {
      toast({ title: 'Error al actualizar concepto', variant: 'destructive' });
    },
  });

  const deleteConceptoMutation = useMutation({
    mutationFn: deleteConcepto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-budget', budgetId] });
      toast({ title: 'Concepto eliminado' });
    },
    onError: () => {
      toast({ title: 'Error al eliminar concepto', variant: 'destructive' });
    },
  });

  // Actions
  const togglePartida = useCallback((partidaId: string) => {
    setCollapsedPartidas(prev => {
      const next = new Set(prev);
      if (next.has(partidaId)) {
        next.delete(partidaId);
      } else {
        next.add(partidaId);
      }
      return next;
    });
  }, []);

  const toggleSubpartida = useCallback((key: string) => {
    setCollapsedSubpartidas(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const toggleRowSelection = useCallback((rowId: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    const conceptoIds = rows.rows
      .filter(r => r.type === 'concepto')
      .map(r => r.id);
    setSelectedRows(new Set(conceptoIds));
  }, [rows]);

  const clearSelection = useCallback(() => {
    setSelectedRows(new Set());
  }, []);

  const bulkUpdateConceptos = useCallback(async (
    updates: Partial<PlanningConcepto>
  ) => {
    const conceptoIds = Array.from(selectedRows)
      .filter(id => id.startsWith('concepto-'))
      .map(id => id.replace('concepto-', ''));

    await Promise.all(
      conceptoIds.map(id => updateConcepto(id, updates))
    );

    queryClient.invalidateQueries({ queryKey: ['planning-budget', budgetId] });
    toast({ title: `${conceptoIds.length} conceptos actualizados` });
  }, [selectedRows, budgetId, queryClient, toast]);

  const bulkDelete = useCallback(async () => {
    const conceptoIds = Array.from(selectedRows)
      .filter(id => id.startsWith('concepto-'))
      .map(id => id.replace('concepto-', ''));

    await Promise.all(
      conceptoIds.map(id => deleteConcepto(id))
    );

    queryClient.invalidateQueries({ queryKey: ['planning-budget', budgetId] });
    setSelectedRows(new Set());
    toast({ title: `${conceptoIds.length} conceptos eliminados` });
  }, [selectedRows, budgetId, queryClient, toast]);

  const reorderConcepto = useCallback(async (
    conceptoId: string,
    newPartidaId: string,
    newOrderIndex: number
  ) => {
    try {
      await updateConcepto(conceptoId, {
        partida_id: newPartidaId,
        order_index: newOrderIndex,
      });
      queryClient.invalidateQueries({ queryKey: ['planning-budget', budgetId] });
    } catch (error) {
      console.error('Error reordering concepto:', error);
      toast({ title: 'Error al reordenar concepto', variant: 'destructive' });
    }
  }, [updateConcepto, budgetId, queryClient, toast]);

  return {
    budget: data?.budget,
    partidas: data?.partidas || [],
    conceptos: data?.conceptos || [],
    rows: rows.rows,
    hiddenCount: rows.hiddenCount,
    isLoading,
    error,
    selectedRows,
    hiddenColumns,
    hideZeros,
    collapsedPartidas,
    recomputeTime,
    dbLatency,
    editingCell,
    setHiddenColumns,
    setHideZeros,
    setEditingCell,
    togglePartida,
    toggleSubpartida,
    toggleRowSelection,
    selectAll,
    clearSelection,
    createPartida: createPartidaMutation.mutate,
    updatePartida: updatePartidaMutation.mutate,
    deletePartida: async (id: string) => {
      await deletePartida(id);
      queryClient.invalidateQueries({ queryKey: ['planning-budget', budgetId] });
      toast({ title: 'Partida eliminada' });
    },
    createConcepto: createConceptoMutation.mutate,
    updateConcepto: updateConceptoMutation.mutate,
    deleteConcepto: deleteConceptoMutation.mutate,
    bulkUpdateConceptos,
    bulkDelete,
    reorderConcepto,
  };
}
