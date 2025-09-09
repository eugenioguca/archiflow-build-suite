import { useState, useMemo } from 'react';
import { usePresupuestoParametrico } from '@/hooks/usePresupuestoParametrico';
import { useExecutiveBudget } from './hooks/useExecutiveBudget';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Search, Expand, Minimize, Calculator } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { FullParametricTree } from './FullParametricTree';

// Grouped parametric structure
export interface GroupedParametric {
  departamentos: {
    [key: string]: {
      nombre: string;
      mayores: {
        [key: string]: {
          codigo: string;
          nombre: string;
          partidas: {
            id: string;
            codigo: string;
            nombre: string;
            cantidad_requerida: number;
            precio_unitario: number;
            monto_total: number;
            mayor_id: string;
            partida_id: string;
            departamento: string;
          }[];
        };
      };
    };
  };
}

interface ExecutiveBudgetPageProps {
  selectedClientId?: string;
  selectedProjectId?: string;
}

export default function ExecutiveBudgetPage({ selectedClientId, selectedProjectId }: ExecutiveBudgetPageProps) {
  const hasFilters = Boolean(selectedClientId && selectedProjectId);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'empty' | 'within' | 'over'>('all');
  const [expandedAll, setExpandedAll] = useState(false);

  // Load full parametric budget
  const { presupuestos, isLoading: isLoadingParametric } = usePresupuestoParametrico(selectedClientId, selectedProjectId);
  
  // Load executive budget data for all parametric items
  const { 
    executiveItems, 
    executivePartidas,
    isLoading: isLoadingExecutive, 
    createExecutiveItem,
    updateExecutiveItem,
    deleteExecutiveItem 
  } = useExecutiveBudget(selectedClientId, selectedProjectId);

  // Group parametric data by departamento -> mayor -> partidas
  const groupedParametric = useMemo(() => {
    if (!presupuestos.length) return null;

    const grouped: GroupedParametric = { departamentos: {} };

    presupuestos.forEach(item => {
      const deptoKey = item.departamento;
      const mayorKey = item.mayor_id;

      if (!grouped.departamentos[deptoKey]) {
        grouped.departamentos[deptoKey] = {
          nombre: item.departamento,
          mayores: {}
        };
      }

      if (!grouped.departamentos[deptoKey].mayores[mayorKey]) {
        grouped.departamentos[deptoKey].mayores[mayorKey] = {
          codigo: item.mayor?.codigo || '',
          nombre: item.mayor?.nombre || '',
          partidas: []
        };
      }

      grouped.departamentos[deptoKey].mayores[mayorKey].partidas.push({
        id: item.id,
        codigo: item.partida?.codigo || '',
        nombre: item.partida?.nombre || '',
        cantidad_requerida: item.cantidad_requerida,
        precio_unitario: item.precio_unitario,
        monto_total: item.monto_total,
        mayor_id: item.mayor_id,
        partida_id: item.partida_id,
        departamento: item.departamento
      });
    });

    return grouped;
  }, [presupuestos]);

  const isLoading = isLoadingParametric || isLoadingExecutive;

  if (!hasFilters) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Presupuesto Ejecutivo</h1>
          <p className="text-muted-foreground text-lg">
            Desglose detallado por subpartidas del presupuesto paramétrico
          </p>
        </div>
        
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Calculator className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Selecciona Cliente y Proyecto</h3>
            <p className="text-muted-foreground">
              Utiliza los filtros superiores para seleccionar un cliente y proyecto. <br />
              El presupuesto paramétrico se cargará automáticamente.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate totals from all executive subpartidas
  const totalParametrico = presupuestos.reduce((sum, item) => sum + item.monto_total, 0);
  const totalEjecutivo = executiveItems.reduce((sum, item) => sum + item.importe, 0);
  const diferencia = totalEjecutivo - totalParametrico;
  const isWithinBudget = Math.abs(diferencia) < 0.01;
  const isOverBudget = diferencia > 0.01;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Presupuesto Ejecutivo</h1>
          <p className="text-muted-foreground text-lg">
            Desglose completo del presupuesto paramétrico en subpartidas ejecutables
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Show loading state */}
      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando presupuesto paramétrico...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Show empty state if no parametric budget found */}
      {!isLoading && (!presupuestos.length || !groupedParametric) && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Calculator className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No hay presupuesto paramétrico</h3>
            <p className="text-muted-foreground">
              No se encontró un presupuesto paramétrico para este proyecto. <br />
              Crea primero el presupuesto paramétrico en la pestaña correspondiente.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Show parametric budget tree */}
      {!isLoading && groupedParametric && (
        <div className="space-y-6">
          {/* Budget Status Alert */}
          {!isWithinBudget && (
            <Card className={isOverBudget ? "border-destructive bg-destructive/5" : "border-warning bg-warning/5"}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Badge variant={isOverBudget ? "destructive" : "secondary"}>
                    {isOverBudget ? "Sobrepresupuesto" : "Disponible"}
                  </Badge>
                  <span className="text-sm">
                    {isOverBudget 
                      ? `Excede por $${diferencia.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                      : `Disponible: $${Math.abs(diferencia).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                    }
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Paramétrico</p>
                  <p className="text-2xl font-bold text-primary">
                    ${totalParametrico.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Ejecutivo</p>
                  <p className="text-2xl font-bold">
                    ${totalEjecutivo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Diferencia</p>
                  <p className={`text-2xl font-bold ${isOverBudget ? 'text-destructive' : 'text-green-600'}`}>
                    ${Math.abs(diferencia).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search and Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar partidas o subpartidas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExpandedAll(!expandedAll)}
                    className="gap-2"
                  >
                    {expandedAll ? <Minimize className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
                    {expandedAll ? 'Colapsar' : 'Expandir'} Todo
                  </Button>
                  
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-3 py-2 border rounded-md text-sm bg-background"
                  >
                    <option value="all">Todos</option>
                    <option value="empty">Sin subpartidas</option>
                    <option value="within">Dentro de presupuesto</option>
                    <option value="over">Sobrepresupuesto</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Full Parametric Tree */}
          <FullParametricTree
            groupedParametric={groupedParametric}
            executiveItems={executiveItems}
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            expandedAll={expandedAll}
            onCreateItem={(data) => createExecutiveItem.mutate(data)}
            onUpdateItem={(id, data) => updateExecutiveItem.mutate({ id, data })}
            onDeleteItem={(id) => deleteExecutiveItem.mutate(id)}
          />
        </div>
      )}
    </div>
  );
}