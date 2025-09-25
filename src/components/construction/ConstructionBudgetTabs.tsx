import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ChevronDown, 
  ChevronRight, 
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
  RefreshCw,
  Search,
  FileX,
  MessageSquare,
  ShoppingCart,
  ExternalLink
} from 'lucide-react';
import { useConstructionBudget } from '@/hooks/useConstructionBudget';
import { useExecutiveBudgetShared } from '@/hooks/useExecutiveBudgetShared';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMayor, setFilterMayor] = useState('all');
  const [filterVariation, setFilterVariation] = useState(false);
  const [expandedMayores, setExpandedMayores] = useState<Set<string>>(new Set());
  const [expandedPartidas, setExpandedPartidas] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Executive budget data (read-only from planning) - exact same as Vista Final
  const { 
    finalRows: executiveRows,
    totals: executiveTotals,
    groupedByMayor,
    isLoading: isLoadingExecutive,
    hasData: hasExecutiveData 
  } = useExecutiveBudgetShared(selectedClientId, selectedProjectId);

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

  // Toggle functions for executive view
  const toggleMayor = (mayorName: string) => {
    const newExpanded = new Set(expandedMayores);
    if (newExpanded.has(mayorName)) {
      newExpanded.delete(mayorName);
    } else {
      newExpanded.add(mayorName);
    }
    setExpandedMayores(newExpanded);
  };

  const togglePartida = (partidaName: string) => {
    const newExpanded = new Set(expandedPartidas);
    if (newExpanded.has(partidaName)) {
      newExpanded.delete(partidaName);
    } else {
      newExpanded.add(partidaName);
    }
    setExpandedPartidas(newExpanded);
  };

  // Group executive data for hierarchical display
  const groupedExecutive = executiveRows.reduce((acc, row) => {
    if (row.tipo !== 'subpartida') return acc;
    
    const mayorKey = `${row.mayor_codigo} - ${row.mayor_nombre}`;
    const partidaKey = `${row.partida_codigo} - ${row.partida_nombre}`;
    
    if (!acc[mayorKey]) {
      acc[mayorKey] = {};
    }
    if (!acc[mayorKey][partidaKey]) {
      acc[mayorKey][partidaKey] = [];
    }
    acc[mayorKey][partidaKey].push(row);
    return acc;
  }, {} as Record<string, Record<string, typeof executiveRows>>);

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

  // Group rollup data
  const groupedRollup = filteredRollup.reduce((acc, item) => {
    if (!acc[item.mayor]) {
      acc[item.mayor] = {};
    }
    if (!acc[item.mayor][item.partida]) {
      acc[item.mayor][item.partida] = [];
    }
    acc[item.mayor][item.partida].push(item);
    return acc;
  }, {} as Record<string, Record<string, typeof filteredRollup>>);

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

        {/* Executive Budget Tab */}
        <TabsContent value="executive" className="space-y-6">
          <Card>
            <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <Calculator className="h-5 w-5" />
                 Presupuesto Ejecutivo (Base)
               </CardTitle>
               <p className="text-sm text-muted-foreground">
                 Basado en Planeación — solo lectura aquí
               </p>
             </CardHeader>
            <CardContent>
              {/* Filters */}
               <div className="flex gap-4 mb-6">
                 <Input
                   placeholder="Buscar por mayor, partida o subpartida..."
                   value={filterText}
                   onChange={(e) => setFilterText(e.target.value)}
                   className="flex-1"
                 />
                 <Button
                   onClick={() => syncSnapshot.mutate(selectedProjectId)}
                   disabled={syncSnapshot.isPending}
                   variant="outline"
                   size="sm"
                 >
                   Sincronizar Snapshot
                 </Button>
               </div>

              {/* Executive Budget Hierarchical Table */}
              {isLoadingExecutive ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(groupedExecutive).map(([mayorName, partidas]) => (
                    <div key={mayorName} className="border rounded-lg">
                      {/* Mayor */}
                      <div 
                        className="flex items-center justify-between p-3 bg-muted cursor-pointer hover:bg-muted/80"
                        onClick={() => toggleMayor(mayorName)}
                      >
                        <div className="flex items-center gap-2">
                          {expandedMayores.has(mayorName) ? 
                            <ChevronDown className="h-4 w-4" /> : 
                            <ChevronRight className="h-4 w-4" />
                          }
                          <span className="font-semibold">{mayorName}</span>
                        </div>
                      </div>

                      {/* Partidas */}
                      {expandedMayores.has(mayorName) && (
                        <div className="space-y-1 p-2">
                          {Object.entries(partidas).map(([partidaName, items]) => (
                            <div key={partidaName} className="border rounded">
                              {/* Partida */}
                              <div 
                                className="flex items-center justify-between p-2 bg-muted/50 cursor-pointer hover:bg-muted/70"
                                onClick={() => togglePartida(partidaName)}
                              >
                                <div className="flex items-center gap-2">
                                  {expandedPartidas.has(partidaName) ? 
                                    <ChevronDown className="h-4 w-4" /> : 
                                    <ChevronRight className="h-4 w-4" />
                                  }
                                  <span className="font-medium">{partidaName}</span>
                                </div>
                              </div>

                              {/* Subpartidas */}
                              {expandedPartidas.has(partidaName) && (
                                <div className="space-y-1 p-2">
                                   <div className="grid grid-cols-6 gap-4 p-2 text-sm font-medium text-muted-foreground border-b">
                                     <div>Subpartida</div>
                                     <div className="text-center">Unidad</div>
                                     <div className="text-center">Cantidad</div>
                                     <div className="text-center">Precio Unitario</div>
                                     <div className="text-right">Importe</div>
                                     <div className="text-center">Acciones</div>
                                   </div>
                                   {items.map((item) => (
                                     <div key={item.id} className="grid grid-cols-6 gap-4 p-3 border rounded bg-background items-center">
                                       <div className="text-sm">{item.subpartida_nombre}</div>
                                       <div className="text-sm text-center">{item.unidad}</div>
                                       <div className="text-sm text-center">{item.cantidad?.toLocaleString()}</div>
                                       <div className="text-sm text-center">{formatCurrency(item.precio_unitario || 0)}</div>
                                       <div className="text-sm text-right font-medium">{formatCurrency(item.importe)}</div>
                                      <div className="flex justify-center">
                                        <Sheet>
                                          <SheetTrigger asChild>
                                            <Button 
                                              variant="outline" 
                                              size="sm"
                                              onClick={() => setSelectedItem(item)}
                                            >
                                              Detalles
                                            </Button>
                                          </SheetTrigger>
                                          <SheetContent>
                                            <SheetHeader>
                                              <SheetTitle>Detalles de Partida Base</SheetTitle>
                                            </SheetHeader>
                                            
                                            {selectedItem && (
                                              <div className="space-y-6 mt-6">
                                                 <div className="space-y-4">
                                                   <div>
                                                     <label className="text-sm font-medium">Partida</label>
                                                     <p className="text-sm text-muted-foreground">{selectedItem.subpartida_nombre}</p>
                                                   </div>
                                                   <div className="grid grid-cols-2 gap-4">
                                                     <div>
                                                       <label className="text-sm font-medium">Cantidad</label>
                                                       <p className="text-sm">{selectedItem.cantidad} {selectedItem.unidad}</p>
                                                     </div>
                                                     <div>
                                                       <label className="text-sm font-medium">Importe</label>
                                                       <p className="text-sm font-medium">{formatCurrency(selectedItem.importe)}</p>
                                                     </div>
                                                   </div>
                                                 </div>

                                                 <Button 
                                                   onClick={() => createMaterialRequest.mutate({
                                                     budgetItemId: selectedItem.id,
                                                     projectId: selectedProjectId,
                                                     description: `Solicitud de material - ${selectedItem.subpartida_nombre}`,
                                                     quantity: selectedItem.cantidad,
                                                     unitPrice: selectedItem.precio_unitario,
                                                     unit: selectedItem.unidad
                                                   })}
                                                   disabled={createMaterialRequest.isPending}
                                                   className="w-full"
                                                 >
                                                   <Package className="h-4 w-4 mr-2" />
                                                   Solicitar Material
                                                 </Button>

                                                <div className="space-y-2">
                                                  <label className="text-sm font-medium">Agregar Nota</label>
                                                  <Textarea
                                                    placeholder="Escribir anotación de construcción..."
                                                    className="min-h-[100px]"
                                                  />
                                                  <Button size="sm" className="w-full" disabled>
                                                    Guardar Nota (próximamente)
                                                  </Button>
                                                </div>

                                                <Button 
                                                  variant="outline" 
                                                  className="w-full"
                                                  onClick={() => setActiveTab('control')}
                                                >
                                                  Ver en Control de Construcción
                                                </Button>
                                              </div>
                                            )}
                                          </SheetContent>
                                        </Sheet>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {Object.keys(groupedExecutive).length === 0 && (
                     <div className="text-center py-12">
                       <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                       <h3 className="text-lg font-medium mb-2">No hay presupuesto ejecutivo</h3>
                       <p className="text-muted-foreground mb-4">
                         No se encontró un presupuesto ejecutivo para este proyecto.<br />
                         Debe crearse primero en el módulo de Planeación.
                       </p>
                     </div>
                   )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Control de Construcción Tab */}
        <TabsContent value="control" className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Presupuesto Base</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(kpis.presupuestoBase)}
                    </p>
                  </div>
                  <Calculator className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Comprado</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(kpis.comprado)}
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">EAC</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(kpis.eac)}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Variación</p>
                    <p className={`text-2xl font-bold ${getVariationColor(variacionPct)}`}>
                      {formatCurrency(kpis.variacion)}
                    </p>
                    <p className={`text-xs ${getVariationColor(variacionPct)}`}>
                      {variacionPct > 0 ? '+' : ''}{variacionPct.toFixed(1)}%
                    </p>
                  </div>
                  <DollarSign className={`h-8 w-8 ${getVariationColor(variacionPct).replace('text-', 'text-')}`} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4 items-center">
                <Input
                  placeholder="Buscar partidas..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="flex-1"
                />
                <Select value={filterMayor} onValueChange={setFilterMayor}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los mayores</SelectItem>
                    {uniqueMayores.map(mayor => (
                      <SelectItem key={mayor} value={mayor}>{mayor}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant={filterVariation ? "default" : "outline"}
                  onClick={() => setFilterVariation(!filterVariation)}
                >
                  Solo con variación
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Control de Construcción Table */}
          <Card>
            <CardContent className="p-0">
              {isLoadingRollup ? (
                <div className="space-y-4 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2 p-4">
                  {Object.entries(groupedRollup).map(([mayorName, partidas]) => (
                    <div key={mayorName} className="border rounded-lg">
                      {/* Mayor */}
                      <div 
                        className="flex items-center justify-between p-3 bg-muted cursor-pointer hover:bg-muted/80"
                        onClick={() => toggleMayor(mayorName)}
                      >
                        <div className="flex items-center gap-2">
                          {expandedMayores.has(mayorName) ? 
                            <ChevronDown className="h-4 w-4" /> : 
                            <ChevronRight className="h-4 w-4" />
                          }
                          <span className="font-semibold">{mayorName}</span>
                        </div>
                      </div>

                      {/* Partidas */}
                      {expandedMayores.has(mayorName) && (
                        <div className="space-y-1 p-2">
                          {Object.entries(partidas).map(([partidaName, items]) => (
                            <div key={partidaName} className="border rounded">
                              {/* Partida */}
                              <div 
                                className="flex items-center justify-between p-2 bg-muted/50 cursor-pointer hover:bg-muted/70"
                                onClick={() => togglePartida(partidaName)}
                              >
                                <div className="flex items-center gap-2">
                                  {expandedPartidas.has(partidaName) ? 
                                    <ChevronDown className="h-4 w-4" /> : 
                                    <ChevronRight className="h-4 w-4" />
                                  }
                                  <span className="font-medium">{partidaName}</span>
                                </div>
                              </div>

                              {/* Subpartidas */}
                              {expandedPartidas.has(partidaName) && (
                                <div className="space-y-1 p-2">
                                  {/* Header */}
                                  <div className="grid grid-cols-10 gap-2 p-2 text-xs font-medium text-muted-foreground border-b">
                                    <div>Subpartida</div>
                                    <div className="text-center">Cant. Base</div>
                                    <div className="text-center">Precio Base</div>
                                    <div className="text-center">Total Base</div>
                                    <div className="text-center">Comprado Qty</div>
                                    <div className="text-center">Precio Prom.</div>
                                    <div className="text-center">Saldo Qty</div>
                                    <div className="text-center">EAC Total</div>
                                    <div className="text-center">Variación</div>
                                    <div className="text-center">Estado/Acciones</div>
                                  </div>
                                  {items.map((item) => {
                                    const statusData = statusConfig[item.supply_status as keyof typeof statusConfig];
                                    const StatusIcon = statusData?.icon;
                                    return (
                                      <div key={item.budget_item_id} className="grid grid-cols-10 gap-2 p-2 border rounded bg-background items-center text-sm">
                                        <div>{item.subpartida}</div>
                                        <div className="text-center">{item.cantidad_base.toLocaleString()}</div>
                                        <div className="text-center">{formatCurrency(item.precio_base)}</div>
                                        <div className="text-center font-medium">{formatCurrency(item.total_base)}</div>
                                        <div className="text-center">{item.comprado_qty.toLocaleString()}</div>
                                        <div className="text-center">{formatCurrency(item.precio_prom_ponderado)}</div>
                                        <div className="text-center">{item.saldo_qty.toLocaleString()}</div>
                                        <div className="text-center font-medium">{formatCurrency(item.eac_total)}</div>
                                        <div className={`text-center font-medium ${getVariationColor(item.variacion_pct)}`}>
                                          {formatCurrency(item.variacion_total)}
                                          <br />
                                          <span className="text-xs">
                                            ({item.variacion_pct > 0 ? '+' : ''}{item.variacion_pct.toFixed(1)}%)
                                          </span>
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                          <Badge 
                                            variant={statusData?.variant || 'secondary'}
                                            className="text-xs"
                                          >
                                            {StatusIcon && <StatusIcon className="h-3 w-3 mr-1" />}
                                            {statusData?.label}
                                          </Badge>
                                          <Sheet>
                                            <SheetTrigger asChild>
                                              <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => setSelectedItem(item)}
                                              >
                                                Detalles
                                              </Button>
                                            </SheetTrigger>
                                            <SheetContent className="w-[400px] sm:w-[540px]">
                                              <SheetHeader>
                                                <SheetTitle>Control de Construcción</SheetTitle>
                                              </SheetHeader>
                                              
                                              {selectedItem && (
                                                <div className="space-y-6 mt-6">
                                                  <div className="space-y-4">
                                                    <h4 className="font-medium">Información de Partida</h4>
                                                    <div>
                                                      <label className="text-sm font-medium">Partida</label>
                                                      <p className="text-sm text-muted-foreground">{selectedItem.subpartida}</p>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                      <div>
                                                        <label className="text-sm font-medium">Base</label>
                                                        <p className="text-sm">{selectedItem.cantidad_base} {selectedItem.unidad}</p>
                                                        <p className="text-xs text-muted-foreground">{formatCurrency(selectedItem.total_base)}</p>
                                                      </div>
                                                      <div>
                                                        <label className="text-sm font-medium">Comprado</label>
                                                        <p className="text-sm">{selectedItem.comprado_qty} {selectedItem.unidad}</p>
                                                        <p className="text-xs text-muted-foreground">{formatCurrency(selectedItem.comprado_total)}</p>
                                                      </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                      <div>
                                                        <label className="text-sm font-medium">EAC Total</label>
                                                        <p className="text-sm font-medium">{formatCurrency(selectedItem.eac_total)}</p>
                                                      </div>
                                                      <div>
                                                        <label className="text-sm font-medium">Variación</label>
                                                        <p className={`text-sm font-medium ${getVariationColor(selectedItem.variacion_pct)}`}>
                                                          {formatCurrency(selectedItem.variacion_total)}
                                                          <span className="block text-xs">
                                                            ({selectedItem.variacion_pct > 0 ? '+' : ''}{selectedItem.variacion_pct.toFixed(1)}%)
                                                          </span>
                                                        </p>
                                                      </div>
                                                    </div>
                                                  </div>

                                                  <div className="space-y-4">
                                                    <h4 className="font-medium">Método EAC</h4>
                                                    <Select 
                                                      value={selectedItem.current_eac_method}
                                                      onValueChange={(value) => {
                                                        updateEAC.mutate({
                                                          budgetItemId: selectedItem.budget_item_id,
                                                          eacMethod: value
                                                        });
                                                      }}
                                                    >
                                                      <SelectTrigger>
                                                        <SelectValue />
                                                      </SelectTrigger>
                                                      <SelectContent>
                                                        <SelectItem value="weighted_avg">Promedio Ponderado</SelectItem>
                                                        <SelectItem value="last">Último Precio</SelectItem>
                                                        <SelectItem value="manual">Manual</SelectItem>
                                                      </SelectContent>
                                                    </Select>
                                                    {selectedItem.current_eac_method === 'manual' && (
                                                      <Input
                                                        type="number"
                                                        placeholder="Precio unitario manual"
                                                        value={selectedItem.manual_eac_price || ''}
                                                        onChange={(e) => {
                                                          const value = parseFloat(e.target.value);
                                                          if (!isNaN(value)) {
                                                            updateEAC.mutate({
                                                              budgetItemId: selectedItem.budget_item_id,
                                                              eacMethod: 'manual',
                                                              manualPrice: value
                                                            });
                                                          }
                                                        }}
                                                      />
                                                    )}
                                                  </div>

                                                  <div className="space-y-2">
                                                    <Button 
                                                      onClick={() => createMaterialRequest.mutate({
                                                        budgetItemId: selectedItem.budget_item_id,
                                                        projectId: selectedProjectId,
                                                        description: `Solicitud de material - ${selectedItem.subpartida}`,
                                                        quantity: selectedItem.saldo_qty,
                                                        unitPrice: selectedItem.eac_unit_price,
                                                        unit: selectedItem.unidad
                                                      })}
                                                      disabled={createMaterialRequest.isPending || selectedItem.saldo_qty <= 0}
                                                      className="w-full"
                                                    >
                                                      <Package className="h-4 w-4 mr-2" />
                                                      Solicitar Material Faltante
                                                    </Button>
                                                    <Button 
                                                      variant="outline"
                                                      className="w-full"
                                                      disabled
                                                    >
                                                      Asignar Transacción Existente (próximamente)
                                                    </Button>
                                                  </div>

                                                  <div className="space-y-2">
                                                    <label className="text-sm font-medium">Notas de Construcción</label>
                                                    <Textarea
                                                      placeholder="Escribir anotación..."
                                                      className="min-h-[100px]"
                                                    />
                                                    <Button size="sm" className="w-full" disabled>
                                                      Guardar Nota (próximamente)
                                                    </Button>
                                                  </div>
                                                </div>
                                              )}
                                            </SheetContent>
                                          </Sheet>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {Object.keys(groupedRollup).length === 0 && (
                    <div className="text-center py-12">
                      <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No hay datos de control</h3>
                      <p className="text-muted-foreground mb-4">
                        Los datos de control aparecerán cuando haya presupuesto base sincronizado.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
