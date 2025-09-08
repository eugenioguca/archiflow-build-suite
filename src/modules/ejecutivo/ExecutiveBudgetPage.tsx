import { useState, useEffect } from 'react';
import { useClientProjectFilters } from '@/hooks/useClientProjectFilters';
import { usePresupuestoParametrico } from '@/hooks/usePresupuestoParametrico';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Search, Filter, Expand, Minimize } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ParametricPicker } from './ParametricPicker';
import { ExecutiveTree } from './ExecutiveTree';
import { TotalsSidebar } from './TotalsSidebar';
import { useExecutiveBudget } from './hooks/useExecutiveBudget';
import { useExecutiveRollups } from './hooks/useExecutiveRollups';

export interface SelectedParametric {
  id: string;
  departamento: string;
  mayor_id: string;
  mayor_codigo: string;
  mayor_nombre: string;
  partida_id: string;
  partida_codigo: string;
  partida_nombre: string;
  cantidad_requerida: number;
  precio_unitario: number;
  monto_total: number;
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

  // Selected parametric budget
  const [selectedParametric, setSelectedParametric] = useState<SelectedParametric | null>(null);

  // Load executive budget data
  const { 
    executiveItems, 
    isLoading, 
    createExecutiveItem,
    updateExecutiveItem,
    deleteExecutiveItem 
  } = useExecutiveBudget(selectedClientId, selectedProjectId, selectedParametric?.id);

  // Load rollups and calculations
  const { rollups, isLoadingRollups } = useExecutiveRollups(
    selectedClientId, 
    selectedProjectId, 
    selectedParametric?.id
  );

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
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Filtros requeridos</h3>
            <p className="text-muted-foreground">
              Selecciona un cliente y proyecto usando los filtros superiores para continuar.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalParametric = selectedParametric?.monto_total || 0;
  const totalExecutive = rollups?.totalExecutive || 0;
  const difference = totalExecutive - totalParametric;
  const isWithinBudget = Math.abs(difference) < 0.01;
  const isOverBudget = difference > 0.01;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Presupuesto Ejecutivo</h1>
          <p className="text-muted-foreground text-lg">
            Desglose detallado por subpartidas del presupuesto paramétrico
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

      {/* Parametric Budget Picker */}
      <ParametricPicker
        clientId={selectedClientId}
        projectId={selectedProjectId}
        selectedParametric={selectedParametric}
        onParametricChange={setSelectedParametric}
      />

      {selectedParametric && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
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
                        ? `Excede por $${difference.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                        : `Disponible: $${Math.abs(difference).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                      }
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

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

            {/* Executive Tree */}
            <ExecutiveTree
              parametric={selectedParametric}
              executiveItems={executiveItems}
              isLoading={isLoading}
              searchTerm={searchTerm}
              statusFilter={statusFilter}
              expandedAll={expandedAll}
              onCreateItem={createExecutiveItem}
              onUpdateItem={updateExecutiveItem}
              onDeleteItem={deleteExecutiveItem}
            />
          </div>

          {/* Sidebar with Totals */}
          <div className="lg:col-span-1">
            <TotalsSidebar
              parametric={selectedParametric}
              rollups={rollups}
              isLoading={isLoadingRollups}
            />
          </div>
        </div>
      )}
    </div>
  );
}