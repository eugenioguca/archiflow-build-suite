import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';
import { ExecutivePartidaRow } from './ExecutivePartidaRow';
import type { SelectedParametric } from './ExecutiveBudgetPage';
import type { PresupuestoEjecutivo } from '@/hooks/usePresupuestoEjecutivo';

interface ExecutiveTreeProps {
  parametric: SelectedParametric;
  executiveItems: PresupuestoEjecutivo[];
  isLoading: boolean;
  searchTerm: string;
  statusFilter: 'all' | 'empty' | 'within' | 'over';
  expandedAll: boolean;
  onCreateItem: any;
  onUpdateItem: any;
  onDeleteItem: any;
}

export function ExecutiveTree({
  parametric,
  executiveItems,
  isLoading,
  searchTerm,
  statusFilter,
  expandedAll,
  onCreateItem,
  onUpdateItem,
  onDeleteItem
}: ExecutiveTreeProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Filter and calculate partida data
  const partidaData = useMemo(() => {
    const totalExecutive = executiveItems.reduce((sum, item) => sum + item.monto_total, 0);
    const difference = totalExecutive - parametric.monto_total;
    const isWithinBudget = Math.abs(difference) < 0.01;
    const isOverBudget = difference > 0.01;
    const hasSubpartidas = executiveItems.length > 0;

    // Apply status filter
    let shouldShow = true;
    switch (statusFilter) {
      case 'empty':
        shouldShow = !hasSubpartidas;
        break;
      case 'within':
        shouldShow = hasSubpartidas && isWithinBudget;
        break;
      case 'over':
        shouldShow = hasSubpartidas && isOverBudget;
        break;
      default:
        shouldShow = true;
    }

    // Apply search filter
    if (searchTerm && shouldShow) {
      const searchLower = searchTerm.toLowerCase();
      const partidaMatches = (
        parametric.partida_nombre.toLowerCase().includes(searchLower) ||
        parametric.partida_codigo.toLowerCase().includes(searchLower)
      );
      
      const subpartidaMatches = executiveItems.some(item =>
        item.subpartida?.nombre?.toLowerCase().includes(searchLower) ||
        item.subpartida?.codigo?.toLowerCase().includes(searchLower)
      );

      shouldShow = partidaMatches || subpartidaMatches;
    }

    return {
      shouldShow,
      totalExecutive,
      difference,
      isWithinBudget,
      isOverBudget,
      hasSubpartidas,
      progressPercentage: parametric.monto_total > 0 ? (totalExecutive / parametric.monto_total) * 100 : 0
    };
  }, [parametric, executiveItems, statusFilter, searchTerm]);

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Auto-expand/collapse based on expandedAll prop
  React.useEffect(() => {
    if (expandedAll) {
      setExpandedRows(new Set([parametric.id]));
    } else {
      setExpandedRows(new Set());
    }
  }, [expandedAll, parametric.id]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando presupuesto ejecutivo...</p>
        </CardContent>
      </Card>
    );
  }

  if (!partidaData.shouldShow) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sin resultados</h3>
          <p className="text-muted-foreground">
            No se encontraron partidas que coincidan con los filtros aplicados.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            📊 Desglose Ejecutivo
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            {executiveItems.length} subpartida{executiveItems.length !== 1 ? 's' : ''}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="border-b">
          <ExecutivePartidaRow
            parametric={parametric}
            executiveItems={executiveItems}
            isExpanded={expandedRows.has(parametric.id)}
            onToggleExpanded={() => toggleExpanded(parametric.id)}
            searchTerm={searchTerm}
            onCreateItem={onCreateItem}
            onUpdateItem={onUpdateItem}
            onDeleteItem={onDeleteItem}
          />
        </div>
      </CardContent>
    </Card>
  );
}