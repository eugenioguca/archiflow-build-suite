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

interface PresupuestoEjecutivo {
  id: string;
  mayor_nombre: string;
  partida_nombre: string;
  subpartida_nombre: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  importe: number;
  supply_status?: string;
  annotations?: any[];
}

interface ConstructionExecutiveBudgetProps {
  projectId: string;
  clientId: string;
}

const statusConfig = {
  not_required: { label: 'Sin requerir', icon: CheckCircle, color: 'bg-muted' },
  required: { label: 'Requerido', icon: AlertTriangle, color: 'bg-yellow-500' },
  requested: { label: 'Solicitado', icon: Clock, color: 'bg-blue-500' },
  in_transit: { label: 'En camino', icon: Truck, color: 'bg-purple-500' },
  delivered: { label: 'Entregado', icon: Package, color: 'bg-green-500' },
};

export const ConstructionExecutiveBudget: React.FC<ConstructionExecutiveBudgetProps> = ({
  projectId,
  clientId
}) => {
  const [presupuesto, setPresupuesto] = useState<PresupuestoEjecutivo[]>([]);
  const [expandedMayores, setExpandedMayores] = useState<Set<string>>(new Set());
  const [expandedPartidas, setExpandedPartidas] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<PresupuestoEjecutivo | null>(null);
  const [annotationText, setAnnotationText] = useState('');
  const [filterText, setFilterText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchPresupuestoEjecutivo();
  }, [projectId]);

  const fetchPresupuestoEjecutivo = async () => {
    try {
      setLoading(true);
      
      // Obtener presupuesto ejecutivo con estados de abastecimiento
      const { data: presupuestoData, error: presupuestoError } = await supabase
        .from('presupuesto_ejecutivo_subpartida')
        .select(`
          *,
          partida_ejecutivo:presupuesto_ejecutivo_partida!inner(
            mayor_nombre,
            partida_nombre,
            presupuesto_ejecutivo_proyecto!inner(
              client_project_id
            )
          ),
          chart_of_accounts_subpartidas!inner(
            nombre,
            codigo
          )
        `)
        .eq('partida_ejecutivo.presupuesto_ejecutivo_proyecto.client_project_id', projectId);

      if (presupuestoError) throw presupuestoError;

      // Por ahora usar datos mock hasta que se actualicen los tipos
      const supplyData: any[] = [];
      const annotationsData: any[] = [];

      // Combinar datos
      const combinedData = presupuestoData?.map(item => {
        const supply = supplyData?.find(s => s.subpartida_id === item.subpartida_id);
        const annotations = annotationsData?.filter(a => a.subpartida_id === item.subpartida_id) || [];
        
        return {
          id: item.id,
          mayor_nombre: item.partida_ejecutivo.mayor_nombre,
          partida_nombre: item.partida_ejecutivo.partida_nombre,
          subpartida_nombre: item.chart_of_accounts_subpartidas.nombre,
          unidad: item.unidad_medida,
          cantidad: item.cantidad_requerida,
          precio_unitario: item.precio_unitario,
          importe: item.importe,
          supply_status: supply?.supply_status || 'not_required',
          annotations
        };
      }) || [];

      setPresupuesto(combinedData);
    } catch (error) {
      console.error('Error fetching presupuesto ejecutivo:', error);
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

  const updateSupplyStatus = async (itemId: string, status: string) => {
    try {
      const item = presupuesto.find(p => p.id === itemId);
      if (!item) return;

      const { error } = await supabase
        .from('budget_supply_status')
        .upsert({
          project_id: projectId,
          client_id: clientId,
          subpartida_id: itemId,
          supply_status: status
        });

      if (error) throw error;

      toast.success('Estado actualizado');
      fetchPresupuestoEjecutivo();
    } catch (error) {
      console.error('Error updating supply status:', error);
      toast.error('Error al actualizar el estado');
    }
  };

  const addAnnotation = async () => {
    if (!selectedItem || !annotationText.trim()) return;

    try {
      const { error } = await supabase
        .from('budget_annotations')
        .insert({
          project_id: projectId,
          client_id: clientId,
          subpartida_id: selectedItem.id,
          content: annotationText,
          annotation_type: 'note',
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      toast.success('Anotación agregada');
      setAnnotationText('');
      fetchPresupuestoEjecutivo();
    } catch (error) {
      console.error('Error adding annotation:', error);
      toast.error('Error al agregar anotación');
    }
  };

  const requestMaterial = async (itemId: string) => {
    try {
      const item = presupuesto.find(p => p.id === itemId);
      if (!item) return;

      // Actualizar estado a "requerido"
      await updateSupplyStatus(itemId, 'required');
      
      // Crear solicitud de material en transacciones unificadas
      const { error } = await supabase
        .from('unified_transactions')
        .insert({
          project_id: projectId,
          client_id: clientId,
          departamento: 'construccion',
          transaction_type: 'expense',
          description: `Solicitud de material: ${item.subpartida_nombre}`,
          amount: item.importe,
          status: 'draft',
          reference_code: `MAT-${Date.now()}`,
          metadata: {
            construction_request: true,
            budget_item_id: itemId,
            quantity: item.cantidad,
            unit: item.unidad
          }
        });

      if (error) throw error;

      toast.success('Solicitud de material enviada a Finanzas');
      fetchPresupuestoEjecutivo();
    } catch (error) {
      console.error('Error requesting material:', error);
      toast.error('Error al solicitar material');
    }
  };

  // Filtrar datos
  const filteredPresupuesto = presupuesto.filter(item => {
    const matchesText = !filterText || 
      item.mayor_nombre.toLowerCase().includes(filterText.toLowerCase()) ||
      item.partida_nombre.toLowerCase().includes(filterText.toLowerCase()) ||
      item.subpartida_nombre.toLowerCase().includes(filterText.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || item.supply_status === filterStatus;
    
    return matchesText && matchesStatus;
  });

  // Agrupar por Mayor y Partida
  const groupedData = filteredPresupuesto.reduce((acc, item) => {
    if (!acc[item.mayor_nombre]) {
      acc[item.mayor_nombre] = {};
    }
    if (!acc[item.mayor_nombre][item.partida_nombre]) {
      acc[item.mayor_nombre][item.partida_nombre] = [];
    }
    acc[item.mayor_nombre][item.partida_nombre].push(item);
    return acc;
  }, {} as Record<string, Record<string, PresupuestoEjecutivo[]>>);

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
                              const StatusIcon = statusConfig[item.supply_status as keyof typeof statusConfig]?.icon;
                              return (
                                <div key={item.id} className="flex items-center justify-between p-3 border rounded bg-background">
                                  <div className="flex-1 grid grid-cols-6 gap-4 items-center">
                                    <div className="text-sm">{item.subpartida_nombre}</div>
                                    <div className="text-sm text-center">{item.unidad}</div>
                                    <div className="text-sm text-center">{item.cantidad.toLocaleString()}</div>
                                    <div className="text-sm text-center">{formatCurrency(item.precio_unitario)}</div>
                                    <div className="text-sm text-center font-medium">{formatCurrency(item.importe)}</div>
                                    <div className="flex items-center gap-2">
                                      <Badge 
                                        variant="secondary" 
                                        className={`${statusConfig[item.supply_status as keyof typeof statusConfig]?.color} text-white`}
                                      >
                                        {StatusIcon && <StatusIcon className="h-3 w-3 mr-1" />}
                                        {statusConfig[item.supply_status as keyof typeof statusConfig]?.label}
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

                                            {/* Estado de abastecimiento */}
                                            <div className="space-y-2">
                                              <label className="text-sm font-medium">Estado de Abastecimiento</label>
                                              <Select 
                                                value={selectedItem.supply_status} 
                                                onValueChange={(value) => updateSupplyStatus(selectedItem.id, value)}
                                              >
                                                <SelectTrigger>
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {Object.entries(statusConfig).map(([value, config]) => (
                                                    <SelectItem key={value} value={value}>
                                                      {config.label}
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                            </div>

                                            {/* Solicitar material */}
                                            {selectedItem.supply_status === 'not_required' && (
                                              <Button 
                                                onClick={() => requestMaterial(selectedItem.id)}
                                                className="w-full"
                                              >
                                                <Package className="h-4 w-4 mr-2" />
                                                Solicitar Material
                                              </Button>
                                            )}

                                            {/* Anotaciones */}
                                            <div className="space-y-4">
                                              <h4 className="font-medium">Anotaciones de Construcción</h4>
                                              
                                              <div className="space-y-2">
                                                <Textarea
                                                  placeholder="Agregar nota..."
                                                  value={annotationText}
                                                  onChange={(e) => setAnnotationText(e.target.value)}
                                                />
                                                <Button 
                                                  onClick={addAnnotation}
                                                  disabled={!annotationText.trim()}
                                                  size="sm"
                                                >
                                                  Agregar Nota
                                                </Button>
                                              </div>

                                              {/* Lista de anotaciones */}
                                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                                {selectedItem.annotations?.map((annotation, index) => (
                                                  <div key={index} className="p-3 border rounded-lg bg-muted/50">
                                                    <p className="text-sm">{annotation.content}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                      {new Date(annotation.created_at).toLocaleDateString()}
                                                    </p>
                                                  </div>
                                                ))}
                                              </div>
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};