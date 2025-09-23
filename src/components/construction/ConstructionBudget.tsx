import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AlertCircle, TrendingUp, TrendingDown, Search, Filter, Plus, Eye, FileText, Settings } from "lucide-react";
import { useConstructionBudgetRollup, useMaterialAlerts, useUpdateEACMethod, useCreateBudgetAnnotation, useBudgetAnnotations } from "@/hooks/useConstructionBudget";
import { formatMoney } from "@/utils/monetaryUtils";
import { UnifiedTransactionForm } from "@/components/UnifiedTransactionForm";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ConstructionBudgetProps {
  projectId: string;
  clientId: string;
}

export const ConstructionBudget: React.FC<ConstructionBudgetProps> = ({ projectId, clientId }) => {
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterCategory, setFilterCategory] = useState<string>("todos");
  const [showVarianceOnly, setShowVarianceOnly] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  
  const { data: budgetItems = [], isLoading } = useConstructionBudgetRollup(projectId);
  const { data: alerts = [] } = useMaterialAlerts(projectId);
  const { mutate: updateEACMethod } = useUpdateEACMethod();
  const { mutate: createAnnotation } = useCreateBudgetAnnotation();
  const { toast } = useToast();

  // Filtrar datos
  const filteredItems = budgetItems.filter(item => {
    const matchesSearch = !searchText || 
      item.item_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      item.item_description?.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesStatus = filterStatus === "todos" || item.supply_status === filterStatus;
    const matchesCategory = filterCategory === "todos" || item.category === filterCategory;
    const matchesVariance = !showVarianceOnly || Math.abs(item.cost_variance || 0) > 0;
    
    return matchesSearch && matchesStatus && matchesCategory && matchesVariance;
  });

  // Cálculos de KPIs
  const totalBaseline = budgetItems.reduce((sum, item) => sum + (item.baseline_total || 0), 0);
  const totalPurchased = budgetItems.reduce((sum, item) => sum + (item.purchased_amount || 0), 0);
  const totalEAC = budgetItems.reduce((sum, item) => sum + (item.eac_total || 0), 0);
  const totalVariance = totalEAC - totalBaseline;
  const overallProgress = totalBaseline > 0 ? (totalPurchased / totalBaseline) * 100 : 0;

  // Función local para formatear moneda
  const formatCurrency = (value: number) => formatMoney(value);

  // Obtener categorías únicas para filtro
  const categories = [...new Set(budgetItems.map(item => item.category).filter(Boolean))];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pendiente: "outline",
      solicitado: "secondary", 
      parcial: "default",
      completo: "default"
    };
    
    const colors: Record<string, string> = {
      pendiente: "text-muted-foreground",
      solicitado: "text-blue-600",
      parcial: "text-orange-600",
      completo: "text-green-600"
    };

    return (
      <Badge variant={variants[status] || "outline"} className={colors[status]}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </Badge>
    );
  };

  const getVarianceIndicator = (variance: number) => {
    if (Math.abs(variance) < 100) return null;
    
    return variance > 0 ? (
      <TrendingUp className="h-4 w-4 text-red-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-green-500" />
    );
  };

  const handleEACMethodChange = (itemId: string, method: string, manualPrice?: number) => {
    updateEACMethod({
      itemId,
      eac_method: method,
      manual_eac_price: manualPrice
    });
  };

  const handleCreateMaterialRequest = (item: any) => {
    setSelectedItem(item);
    setShowMaterialForm(true);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Presupuesto Base</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBaseline)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Comprado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalPurchased)}</div>
            <div className="text-sm text-muted-foreground">{overallProgress.toFixed(1)}% del total</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">EAC Estimado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalEAC)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Variación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalVariance > 0 ? 'text-red-600' : totalVariance < 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
              {totalVariance > 0 ? '+' : ''}{formatCurrency(totalVariance)}
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              {getVarianceIndicator(totalVariance)}
              {((totalVariance / totalBaseline) * 100).toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Progreso General</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallProgress.toFixed(1)}%</div>
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div 
                className="bg-primary rounded-full h-2 transition-all duration-300" 
                style={{ width: `${Math.min(overallProgress, 100)}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de Materiales */}
      {alerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertCircle className="h-5 w-5" />
              Materiales por solicitar (próximos 7 días)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {alerts.map((alert: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div>
                    <div className="font-medium">{alert.mayor_nombre}</div>
                    <div className="text-sm text-muted-foreground">
                      {alert.items_pending} partidas pendientes
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-orange-600">{formatCurrency(alert.total_pending_amount)}</div>
                    <Button size="sm" variant="outline" className="mt-1">
                      Solicitar ahora
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros y Búsqueda */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o descripción..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas las categorías</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="solicitado">Solicitado</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                  <SelectItem value="completo">Completo</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant={showVarianceOnly ? "default" : "outline"}
                onClick={() => setShowVarianceOnly(!showVarianceOnly)}
                className="whitespace-nowrap"
              >
                <Filter className="h-4 w-4 mr-2" />
                Solo con variación
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Presupuesto */}
      <Card>
        <CardHeader>
          <CardTitle>Presupuesto Detallado ({filteredItems.length} partidas)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium">Partida</th>
                  <th className="text-left p-4 font-medium">Unidad</th>
                  <th className="text-right p-4 font-medium">Cant. Base</th>
                  <th className="text-right p-4 font-medium">Precio Unit.</th>
                  <th className="text-right p-4 font-medium">Total Base</th>
                  <th className="text-right p-4 font-medium">Comprado</th>
                  <th className="text-right p-4 font-medium">Saldo</th>
                  <th className="text-right p-4 font-medium">EAC</th>
                  <th className="text-right p-4 font-medium">Variación</th>
                  <th className="text-center p-4 font-medium">Estado</th>
                  <th className="text-center p-4 font-medium">Progreso</th>
                  <th className="text-center p-4 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <div>
                        <div className="font-medium">{item.item_name}</div>
                        {item.item_description && (
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {item.item_description}
                          </div>
                        )}
                        {item.category && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {item.category}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm">{item.unit_of_measure}</td>
                    <td className="p-4 text-right">{item.baseline_quantity?.toFixed(2)}</td>
                    <td className="p-4 text-right">{formatCurrency(item.baseline_unit_price || 0)}</td>
                    <td className="p-4 text-right font-medium">{formatCurrency(item.baseline_total || 0)}</td>
                    <td className="p-4 text-right text-blue-600">{formatCurrency(item.purchased_amount || 0)}</td>
                    <td className="p-4 text-right">{item.remaining_quantity?.toFixed(2)}</td>
                    <td className="p-4 text-right font-medium">{formatCurrency(item.eac_total || 0)}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {getVarianceIndicator(item.cost_variance || 0)}
                        <span className={item.cost_variance && item.cost_variance > 0 ? 'text-red-600' : item.cost_variance && item.cost_variance < 0 ? 'text-green-600' : ''}>
                          {item.cost_variance && item.cost_variance > 0 ? '+' : ''}{formatCurrency(item.cost_variance || 0)}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-center">{getStatusBadge(item.supply_status)}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary rounded-full h-2 transition-all duration-300" 
                            style={{ width: `${Math.min(item.completion_percentage || 0, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {(item.completion_percentage || 0).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Sheet>
                          <SheetTrigger asChild>
                            <Button size="sm" variant="ghost" onClick={() => setSelectedItem(item)}>
                              <Eye className="h-3 w-3" />
                            </Button>
                          </SheetTrigger>
                          <SheetContent className="w-[600px] sm:w-[800px] overflow-y-auto">
                            <ItemDetailSheet item={item} onEACMethodChange={handleEACMethodChange} />
                          </SheetContent>
                        </Sheet>

                        {(item.remaining_quantity || 0) > 0 && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleCreateMaterialRequest(item)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para Formulario de Materiales */}
      <Dialog open={showMaterialForm} onOpenChange={setShowMaterialForm}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedItem && (
            <UnifiedTransactionForm
              open={showMaterialForm}
              onOpenChange={setShowMaterialForm}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Componente del drawer de detalles
const ItemDetailSheet: React.FC<{
  item: any;
  onEACMethodChange: (itemId: string, method: string, manualPrice?: number) => void;
}> = ({ item, onEACMethodChange }) => {
  const [eacMethod, setEacMethod] = useState(item.current_eac_method || 'actual_cost');
  const [manualPrice, setManualPrice] = useState(item.manual_eac_price || 0);
  const [newAnnotation, setNewAnnotation] = useState('');
  
  const { data: annotations = [] } = useBudgetAnnotations(item.id);
  const { mutate: createAnnotation } = useCreateBudgetAnnotation();
  const { toast } = useToast();

  // Función local para formatear moneda
  const formatCurrency = (value: number) => formatMoney(value);

  const handleSaveEAC = () => {
    onEACMethodChange(item.id, eacMethod, eacMethod === 'manual' ? manualPrice : undefined);
  };

  const handleAddAnnotation = () => {
    if (!newAnnotation.trim()) return;
    
    createAnnotation({
      budget_item_id: item.id,
      annotation_type: 'note',
      content: newAnnotation.trim()
    });
    setNewAnnotation('');
  };

  return (
    <div className="space-y-6">
      <SheetHeader>
        <SheetTitle>{item.item_name}</SheetTitle>
      </SheetHeader>

      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="transactions">Transacciones</TabsTrigger>
          <TabsTrigger value="notes">Notas</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-medium">Historial de Compras</h4>
            {item.allocated_transactions?.length > 0 ? (
              item.allocated_transactions.map((allocation: any, index: number) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">
                        {allocation.unified_financial_transactions?.reference_code}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {allocation.unified_financial_transactions?.description}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(allocation.unified_financial_transactions?.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">
                        {formatCurrency(allocation.allocated_amount)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {allocation.allocated_quantity} {item.unit_of_measure} × {formatCurrency(allocation.unit_price)}
                      </div>
                      <Badge variant="outline" className="mt-1">
                        {allocation.unified_financial_transactions?.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No hay transacciones asignadas a esta partida
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-annotation">Agregar Nota</Label>
              <div className="flex gap-2 mt-2">
                <Textarea
                  id="new-annotation"
                  placeholder="Escribe una nota sobre esta partida..."
                  value={newAnnotation}
                  onChange={(e) => setNewAnnotation(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleAddAnnotation} disabled={!newAnnotation.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {annotations.map((annotation: any) => (
                <div key={annotation.id} className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className="text-xs">
                      {annotation.annotation_type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(annotation.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm">{annotation.content}</p>
                  {annotation.profiles?.full_name && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Por: {annotation.profiles.full_name}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="eac-method">Método EAC</Label>
              <Select value={eacMethod} onValueChange={setEacMethod}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="actual_cost">Costo Real</SelectItem>
                  <SelectItem value="weighted_avg">Promedio Ponderado</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {eacMethod === 'manual' && (
              <div>
                <Label htmlFor="manual-price">Precio Manual</Label>
                <Input
                  id="manual-price"
                  type="number"
                  step="0.01"
                  value={manualPrice}
                  onChange={(e) => setManualPrice(parseFloat(e.target.value) || 0)}
                  className="mt-2"
                />
              </div>
            )}

            <Button onClick={handleSaveEAC} className="w-full">
              <Settings className="h-4 w-4 mr-2" />
              Guardar Configuración EAC
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};