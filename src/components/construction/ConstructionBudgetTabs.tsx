import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calculator, 
  TrendingUp, 
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  Truck,
  DollarSign,
  BarChart3,
  FileText,
  RefreshCw
} from 'lucide-react';
import { useConstructionBudget } from '@/hooks/useConstructionBudget';
import { ExecutiveFinalFlatTable } from './budget/ExecutiveFinalFlatTable';
import { formatCurrency } from '@/lib/utils';

interface ConstructionBudgetTabsProps {
  selectedClientId?: string;
  selectedProjectId?: string;
}

const statusConfig = {
  sin_requerir: { 
    label: 'Sin requerir', 
    icon: CheckCircle, 
    color: 'bg-gray-100 text-gray-800',
    variant: 'secondary' as const
  },
  requerido: { 
    label: 'Requerido', 
    icon: AlertTriangle, 
    color: 'bg-yellow-100 text-yellow-800',
    variant: 'outline' as const
  },
  solicitado: { 
    label: 'Solicitado', 
    icon: Clock, 
    color: 'bg-blue-100 text-blue-800',
    variant: 'default' as const
  },
  en_camino: { 
    label: 'En camino', 
    icon: Truck, 
    color: 'bg-purple-100 text-purple-800',
    variant: 'default' as const
  },
  entregado: { 
    label: 'Entregado', 
    icon: Package, 
    color: 'bg-green-100 text-green-800',
    variant: 'default' as const
  },
};

export const ConstructionBudgetTabs: React.FC<ConstructionBudgetTabsProps> = ({ 
  selectedClientId, 
  selectedProjectId 
}) => {
  const [activeTab, setActiveTab] = useState('executive');
  const [filterText, setFilterText] = useState('');
  const [filterMayor, setFilterMayor] = useState('all');
  const [filterVariation, setFilterVariation] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Construction control data
  const {
    rollupBudget,
    isLoadingRollup,
    syncSnapshot,
    updateEAC,
    createMaterialRequest,
    refetchRollup
  } = useConstructionBudget(selectedProjectId);

  const handleSyncSnapshot = async () => {
    if (!selectedProjectId) return;
    setIsSyncing(true);
    try {
      await syncSnapshot.mutateAsync(selectedProjectId);
    } finally {
      setIsSyncing(false);
    }
  };

  // Calculate KPIs from rollup data
  const kpis = rollupBudget.reduce(
    (acc, item) => ({
      presupuestoBase: acc.presupuestoBase + item.total_base,
      comprado: acc.comprado + item.comprado_total,
      eac: acc.eac + item.eac_total,
      variacion: acc.variacion + item.variacion_total,
    }),
    { presupuestoBase: 0, comprado: 0, eac: 0, variacion: 0 }
  );

  const variacionPct = kpis.presupuestoBase > 0 ? (kpis.variacion / kpis.presupuestoBase) * 100 : 0;
  const completedItems = rollupBudget.filter(item => item.completion_percentage >= 100).length;
  const completionPct = rollupBudget.length > 0 ? (completedItems / rollupBudget.length) * 100 : 0;

  const getVariationColor = (variationPct: number) => {
    if (Math.abs(variationPct) <= 5) return 'text-green-600';
    if (Math.abs(variationPct) <= 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Filter rollup data
  const filteredRollup = rollupBudget.filter(item => {
    const matchesText = !filterText || 
      item.mayor.toLowerCase().includes(filterText.toLowerCase()) ||
      item.partida.toLowerCase().includes(filterText.toLowerCase()) ||
      item.subpartida.toLowerCase().includes(filterText.toLowerCase());
    
    const matchesMayor = filterMayor === 'all' || item.mayor === filterMayor;
    const matchesVariation = !filterVariation || Math.abs(item.variacion_pct) > 0;
    
    return matchesText && matchesMayor && matchesVariation;
  });

  const uniqueMayores = [...new Set(rollupBudget.map(item => item.mayor))];

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="executive" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Ejecutivo (base)
          </TabsTrigger>
          <TabsTrigger value="control" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Control de Construcción
          </TabsTrigger>
        </TabsList>

        {/* Executive Budget Tab - Flat table (NO ACCORDION) */}
        <TabsContent value="executive" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl">Ejecutivo (base)</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Basado en snapshot de Planeación — solo lectura aquí
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleSyncSnapshot}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                      Sincronizando...
                    </div>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Sincronizar Snapshot
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ExecutiveFinalFlatTable
                selectedClientId={selectedClientId}
                selectedProjectId={selectedProjectId}
                onSwitchToControl={() => setActiveTab('control')}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Control Budget Tab - Construction comparisons */}
        <TabsContent value="control" className="mt-6">
          <div className="space-y-6">
            {/* KPIs Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Control de Construcción - KPIs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center space-y-2">
                    <div className="text-2xl font-bold text-blue-600">{formatCurrency(kpis.presupuestoBase)}</div>
                    <div className="text-sm text-muted-foreground">Presupuesto Base</div>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(kpis.comprado)}</div>
                    <div className="text-sm text-muted-foreground">Comprado</div>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="text-2xl font-bold text-purple-600">{formatCurrency(kpis.eac)}</div>
                    <div className="text-sm text-muted-foreground">EAC</div>
                  </div>
                  <div className="text-center space-y-2">
                    <div className={`text-2xl font-bold ${getVariationColor(variacionPct)}`}>
                      {formatCurrency(kpis.variacion)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Variación ({variacionPct.toFixed(1)}%)
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4">
                  <Input
                    placeholder="Buscar subpartida..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    className="flex-1 min-w-[200px]"
                  />
                  <Select value={filterMayor} onValueChange={setFilterMayor}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filtrar por mayor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los mayores</SelectItem>
                      {uniqueMayores.map((mayor) => (
                        <SelectItem key={mayor} value={mayor}>{mayor}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="variation-filter"
                      checked={filterVariation}
                      onChange={(e) => setFilterVariation(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="variation-filter" className="text-sm">Solo con variación</label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Control Table */}
            <Card>
              <CardHeader>
                <CardTitle>Comparativa Base vs. Comprado vs. EAC</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingRollup ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-8 gap-4 p-4 border rounded">
                      <div className="h-4 bg-muted animate-pulse rounded"></div>
                      <div className="h-4 bg-muted animate-pulse rounded"></div>
                      <div className="h-4 bg-muted animate-pulse rounded"></div>
                      <div className="h-4 bg-muted animate-pulse rounded"></div>
                      <div className="h-4 bg-muted animate-pulse rounded"></div>
                      <div className="h-4 bg-muted animate-pulse rounded"></div>
                      <div className="h-4 bg-muted animate-pulse rounded"></div>
                      <div className="h-4 bg-muted animate-pulse rounded"></div>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/30">
                        <tr className="text-xs font-medium text-muted-foreground">
                          <th className="text-left p-2">Mayor • Partida • Subpartida</th>
                          <th className="text-right p-2">Cant. Base</th>
                          <th className="text-right p-2">Total Base</th>
                          <th className="text-right p-2">Comprado</th>
                          <th className="text-right p-2">Saldo</th>
                          <th className="text-right p-2">EAC</th>
                          <th className="text-right p-2">Variación</th>
                          <th className="text-center p-2">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRollup.map((item, index) => (
                          <tr key={`rollup-${index}`} className="border-b hover:bg-muted/50">
                            <td className="p-2">
                              <div className="space-y-1">
                                <div className="font-medium text-sm">{item.mayor}</div>
                                <div className="text-xs text-muted-foreground pl-2">{item.partida}</div>
                                <div className="text-xs pl-4">{item.subpartida}</div>
                              </div>
                            </td>
                            <td className="p-2 text-right text-sm tabular-nums">{item.cantidad_base}</td>
                            <td className="p-2 text-right text-sm tabular-nums font-medium">{formatCurrency(item.total_base)}</td>
                            <td className="p-2 text-right text-sm tabular-nums">{formatCurrency(item.comprado_total)}</td>
                            <td className="p-2 text-right text-sm tabular-nums">{item.saldo_qty}</td>
                            <td className="p-2 text-right text-sm tabular-nums">{formatCurrency(item.eac_total)}</td>
                            <td className={`p-2 text-right text-sm tabular-nums font-medium ${getVariationColor(item.variacion_pct)}`}>
                              {formatCurrency(item.variacion_total)}
                            </td>
                            <td className="p-2 text-center">
                              <Badge 
                                variant={statusConfig[item.supply_status as keyof typeof statusConfig]?.variant || 'outline'}
                                className="text-xs"
                              >
                                {statusConfig[item.supply_status as keyof typeof statusConfig]?.label || item.supply_status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                        {filteredRollup.length === 0 && (
                          <tr>
                            <td colSpan={8} className="text-center py-8 text-muted-foreground">
                              No hay datos de control de construcción
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};