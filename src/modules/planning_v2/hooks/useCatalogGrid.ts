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
  type: 'partida' | 'concepto' | 'subtotal';
  depth: number;
  partida?: PlanningPartida;
  concepto?: PlanningConcepto;
  subtotal?: number;
  isCollapsed?: boolean;
}

export function useCatalogGrid(budgetId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [hideZeros, setHideZeros] = useState(false);
  const [collapsedPartidas, setCollapsedPartidas] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null);

  // Fetch budget data
  const { data, isLoading, error } = useQuery({
    queryKey: ['planning-budget', budgetId],
    queryFn: () => getBudgetById(budgetId),
  });

  // Build flat rows for virtualization
  const rows = useMemo((): { rows: CatalogRow[]; hiddenCount: number } => {
    if (!data) return { rows: [], hiddenCount: 0 };

    const result: CatalogRow[] = [];
    let hiddenCount = 0;

    for (const partida of data.partidas) {
      if (!partida.active) continue;

      const isCollapsed = collapsedPartidas.has(partida.id);

      // Partida header row
      result.push({
        id: `partida-${partida.id}`,
        type: 'partida',
        depth: 0,
        partida,
        isCollapsed,
      });

      if (!isCollapsed) {
        // Concepto rows
        const conceptos = data.conceptos.filter(c => c.partida_id === partida.id);
        
        for (const concepto of conceptos) {
          if (!concepto.active) continue;

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

        // Subtotal row
        const subtotal = conceptos
          .filter(c => c.active && c.sumable)
          .reduce((sum, c) => sum + c.total, 0);

        result.push({
          id: `subtotal-${partida.id}`,
          type: 'subtotal',
          depth: 1,
          subtotal,
        });
      }
    }

    return { rows: result, hiddenCount };
  }, [data, collapsedPartidas, hideZeros]);

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
    editingCell,
    setHiddenColumns,
    setHideZeros,
    setEditingCell,
    togglePartida,
    toggleRowSelection,
    selectAll,
    clearSelection,
    createPartida: createPartidaMutation.mutate,
    updatePartida: updatePartidaMutation.mutate,
    createConcepto: createConceptoMutation.mutate,
    updateConcepto: updateConceptoMutation.mutate,
    deleteConcepto: deleteConceptoMutation.mutate,
    bulkUpdateConceptos,
    bulkDelete,
    reorderConcepto,
  };
}
