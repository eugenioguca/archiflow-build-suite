import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Package, AlertTriangle, CheckCircle, Clock, Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const formatCurrency = (amount: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

interface BudgetItem {
  id: string;
  mayor: string;
  partida: string;
  subpartida: string;
  unidad: string;
  cantidad: number;
  precio: number;
  importe: number;
  status: 'sin_requerir' | 'requerido' | 'solicitado' | 'en_camino' | 'entregado';
  codigo?: string;
}

interface ConstructionExecutiveBudgetProps {
  projectId: string;
  clientId: string;
}

const statusConfig = {
  sin_requerir: { label: 'Sin requerir', icon: CheckCircle, color: 'bg-muted', textColor: 'text-muted-foreground' },
  requerido: { label: 'Requerido', icon: AlertTriangle, color: 'bg-yellow-500', textColor: 'text-white' },
  solicitado: { label: 'Solicitado', icon: Clock, color: 'bg-blue-500', textColor: 'text-white' },
  en_camino: { label: 'En camino', icon: Truck, color: 'bg-purple-500', textColor: 'text-white' },
  entregado: { label: 'Entregado', icon: Package, color: 'bg-green-500', textColor: 'text-white' },
};

export const ConstructionExecutiveBudget: React.FC<ConstructionExecutiveBudgetProps> = ({
  projectId,
  clientId
}) => {
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [expandedMayores, setExpandedMayores] = useState<Set<string>>(new Set());
  const [expandedPartidas, setExpandedPartidas] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<BudgetItem | null>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchBudgetData();
  }, [projectId]);

  const fetchBudgetData = async () => {
    try {
      setLoading(true);
      
      // Obtener presupuesto ejecutivo 
      const { data: presupuestoData, error: presupuestoError } = await supabase
        .from('presupuesto_ejecutivo_subpartida')
        .select(`
          *,
          chart_of_accounts_subpartidas(codigo, nombre)
        `)
        .eq('proyecto_id', projectId);

      if (presupuestoError) throw presupuestoError;

      const budgetItems = presupuestoData?.map(item => ({
        id: item.id,
        mayor: 'Mayor', // TODO: Get from parametrico relation
        partida: 'Partida', // TODO: Get from parametrico relation  
        subpartida: item.nombre_snapshot,
        unidad: item.unidad || 'pza',
        cantidad: item.cantidad || 0,
        precio: item.precio_unitario,
        importe: item.importe,
        status: 'sin_requerir' as const,
        codigo: item.chart_of_accounts_subpartidas?.codigo
      })) || [];

      setBudgetItems(budgetItems);
    } catch (error) {
      console.error('Error fetching budget data:', error);
      toast.error('Error al cargar el presupuesto ejecutivo');
    } finally {
      setLoading(false);
    }
  };

  const toggleMayor = (mayorNombre: string) => {
    const newExpanded = new Set(expandedMayores);
    if (newExpanded.has(mayorNombre)) {
      newExpanded.delete(mayorNombre);
    } else {
      newExpanded.add(mayorNombre);
    }
    setExpandedMayores(newExpanded);
  };

  const togglePartida = (partidaNombre: string) => {
    const newExpanded = new Set(expandedPartidas);
    if (newExpanded.has(partidaNombre)) {
      newExpanded.delete(partidaNombre);
    } else {
      newExpanded.add(partidaNombre);
    }
    setExpandedPartidas(newExpanded);
  };

  const createMaterialRequest = async (budgetItem: BudgetItem) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuario no autenticado');
        return;
      }

      // Crear solicitud de material en transacciones unificadas
      const { error } = await supabase
        .from('unified_financial_transactions')
        .insert({
          empresa_proyecto_id: projectId,
          tipo_movimiento: 'gasto',
          departamento: 'construccion',
          descripcion: `Solicitud de material - ${budgetItem.subpartida}`,
          monto_total: budgetItem.importe,
          cantidad_requerida: budgetItem.cantidad,
          precio_unitario: budgetItem.precio,
          unidad: budgetItem.unidad,
          referencia_unica: `MAT-${Date.now()}`,
          fecha: new Date().toISOString().split('T')[0],
          tiene_factura: false,
          created_by: user.id
        });

      if (error) throw error;

      toast.success('Solicitud de material creada');
      setShowRequestDialog(false);
      
      // TODO: Actualizar estado de abastecimiento en el futuro
      fetchBudgetData();
    } catch (error) {
      console.error('Error creating material request:', error);
      toast.error('Error al crear solicitud');
    }
  };

  // Filtrar datos
  const filteredBudgetItems = budgetItems.filter(item => {
    const matchesText = !filterText || 
      item.mayor.toLowerCase().includes(filterText.toLowerCase()) ||
      item.partida.toLowerCase().includes(filterText.toLowerCase()) ||
      item.subpartida.toLowerCase().includes(filterText.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    
    return matchesText && matchesStatus;
  });

  // Agrupar por Mayor y Partida
  const groupedData = filteredBudgetItems.reduce((acc, item) => {
    if (!acc[item.mayor]) {
      acc[item.mayor] = {};
    }
    if (!acc[item.mayor][item.partida]) {
      acc[item.mayor][item.partida] = [];
    }
    acc[item.mayor][item.partida].push(item);
    return acc;
  }, {} as Record<string, Record<string, BudgetItem[]>>);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Presupuesto Ejecutivo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Buscar por mayor, partida o subpartida..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="flex-1"
            />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {Object.entries(statusConfig).map(([value, config]) => (
                  <SelectItem key={value} value={value}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla jerárquica */}
      <Card>
        <CardContent className="p-0">
          <div className="space-y-2 p-4">
            {Object.entries(groupedData).map(([mayorNombre, partidas]) => (
              <div key={mayorNombre} className="border rounded-lg">
                {/* Mayor */}
                <div 
                  className="flex items-center justify-between p-3 bg-muted cursor-pointer hover:bg-muted/80"
                  onClick={() => toggleMayor(mayorNombre)}
                >
                  <div className="flex items-center gap-2">
                    {expandedMayores.has(mayorNombre) ? 
                      <ChevronDown className="h-4 w-4" /> : 
                      <ChevronRight className="h-4 w-4" />
                    }
                    <span className="font-semibold">{mayorNombre}</span>
                  </div>
                </div>

                {/* Partidas */}
                {expandedMayores.has(mayorNombre) && (
                  <div className="space-y-1 p-2">
                    {Object.entries(partidas).map(([partidaNombre, subpartidas]) => (
                      <div key={partidaNombre} className="border rounded">
                        {/* Partida */}
                        <div 
                          className="flex items-center justify-between p-2 bg-muted/50 cursor-pointer hover:bg-muted/70"
                          onClick={() => togglePartida(partidaNombre)}
                        >
                          <div className="flex items-center gap-2">
                            {expandedPartidas.has(partidaNombre) ? 
                              <ChevronDown className="h-4 w-4" /> : 
                              <ChevronRight className="h-4 w-4" />
                            }
                            <span className="font-medium">{partidaNombre}</span>
                          </div>
                        </div>

                        {/* Subpartidas */}
                        {expandedPartidas.has(partidaNombre) && (
                          <div className="space-y-1 p-2">
                            {subpartidas.map((item) => {
                              const StatusIcon = statusConfig[item.status as keyof typeof statusConfig]?.icon;
                              return (
                                <div key={item.id} className="flex items-center justify-between p-3 border rounded bg-background">
                                  <div className="flex-1 grid grid-cols-6 gap-4 items-center">
                                    <div className="text-sm">{item.subpartida}</div>
                                    <div className="text-sm text-center">{item.unidad}</div>
                                    <div className="text-sm text-center">{item.cantidad.toLocaleString()}</div>
                                    <div className="text-sm text-center">{formatCurrency(item.precio)}</div>
                                    <div className="text-sm text-center font-medium">{formatCurrency(item.importe)}</div>
                                    <div className="flex items-center gap-2">
                                      <Badge 
                                        variant="secondary" 
                                        className={`${statusConfig[item.status as keyof typeof statusConfig]?.color} ${statusConfig[item.status as keyof typeof statusConfig]?.textColor}`}
                                      >
                                        {StatusIcon && <StatusIcon className="h-3 w-3 mr-1" />}
                                        {statusConfig[item.status as keyof typeof statusConfig]?.label}
                                      </Badge>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 ml-4">
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
                                          <SheetTitle>Detalles de Partida</SheetTitle>
                                        </SheetHeader>
                                        
                                        {selectedItem && (
                                          <div className="space-y-6 mt-6">
                                            {/* Información básica */}
                                            <div className="space-y-4">
                                              <div>
                                                <label className="text-sm font-medium">Partida</label>
                                                <p className="text-sm text-muted-foreground">{selectedItem.subpartida}</p>
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

                                            {/* Solicitar material */}
                                            {selectedItem.status === 'sin_requerir' && (
                                              <Button 
                                                onClick={() => createMaterialRequest(selectedItem)}
                                                className="w-full"
                                              >
                                                <Package className="h-4 w-4 mr-2" />
                                                Solicitar Material
                                              </Button>
                                            )}

                                            {/* Agregar anotación */}
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

            {Object.keys(groupedData).length === 0 && (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay datos de presupuesto</h3>
                <p className="text-muted-foreground mb-4">
                  No se encontraron partidas del presupuesto ejecutivo para este proyecto.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};