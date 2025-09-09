import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Plus, Building2, Archive, Package } from 'lucide-react';
import { ExecutiveSubpartidaRow } from './ExecutiveSubpartidaRow';
import type { GroupedParametric } from './ExecutiveBudgetPage';

interface ExecutiveItem {
  id: string;
  cliente_id: string;
  proyecto_id: string;
  presupuesto_parametrico_id: string;
  departamento: string;
  mayor_id: string;
  partida_id: string;
  subpartida_id: string;
  unidad: string;
  cantidad_requerida: number;
  precio_unitario: number;
  monto_total: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  mayor?: { codigo: string; nombre: string };
  partida?: { codigo: string; nombre: string };
  subpartida?: { codigo: string; nombre: string };
}

interface FullParametricTreeProps {
  groupedParametric: GroupedParametric;
  executiveItems: ExecutiveItem[];
  searchTerm: string;
  statusFilter: 'all' | 'empty' | 'within' | 'over';
  expandedAll: boolean;
  onCreateItem: (data: Omit<ExecutiveItem, 'id' | 'created_at' | 'updated_at' | 'monto_total' | 'created_by' | 'mayor' | 'partida' | 'subpartida'>) => void;
  onUpdateItem: (id: string, data: Partial<ExecutiveItem>) => void;
  onDeleteItem: (id: string) => void;
}

export function FullParametricTree({
  groupedParametric,
  executiveItems,
  searchTerm,
  statusFilter,
  expandedAll,
  onCreateItem,
  onUpdateItem,
  onDeleteItem
}: FullParametricTreeProps) {
  const [expandedDepartamentos, setExpandedDepartamentos] = useState<Set<string>>(new Set());
  const [expandedMayores, setExpandedMayores] = useState<Set<string>>(new Set());
  const [expandedPartidas, setExpandedPartidas] = useState<Set<string>>(new Set());
  const [addingSubpartidaTo, setAddingSubpartidaTo] = useState<string | null>(null);

  // Update expanded states when expandedAll changes
  useMemo(() => {
    if (expandedAll) {
      const allDepartamentos = Object.keys(groupedParametric.departamentos);
      const allMayores: string[] = [];
      const allPartidas: string[] = [];

      allDepartamentos.forEach(deptoKey => {
        const mayores = Object.keys(groupedParametric.departamentos[deptoKey].mayores);
        allMayores.push(...mayores.map(m => `${deptoKey}-${m}`));
        
        mayores.forEach(mayorKey => {
          const partidas = groupedParametric.departamentos[deptoKey].mayores[mayorKey].partidas;
          allPartidas.push(...partidas.map(p => p.id));
        });
      });

      setExpandedDepartamentos(new Set(allDepartamentos));
      setExpandedMayores(new Set(allMayores));
      setExpandedPartidas(new Set(allPartidas));
    } else {
      setExpandedDepartamentos(new Set());
      setExpandedMayores(new Set());
      setExpandedPartidas(new Set());
    }
  }, [expandedAll, groupedParametric]);

  const toggleDepartamento = (deptoKey: string) => {
    const newExpanded = new Set(expandedDepartamentos);
    if (newExpanded.has(deptoKey)) {
      newExpanded.delete(deptoKey);
    } else {
      newExpanded.add(deptoKey);
    }
    setExpandedDepartamentos(newExpanded);
  };

  const toggleMayor = (mayorKey: string) => {
    const newExpanded = new Set(expandedMayores);
    if (newExpanded.has(mayorKey)) {
      newExpanded.delete(mayorKey);
    } else {
      newExpanded.add(mayorKey);
    }
    setExpandedMayores(newExpanded);
  };

  const togglePartida = (partidaId: string) => {
    const newExpanded = new Set(expandedPartidas);
    if (newExpanded.has(partidaId)) {
      newExpanded.delete(partidaId);
    } else {
      newExpanded.add(partidaId);
    }
    setExpandedPartidas(newExpanded);
  };

  const getPartidaExecutiveItems = (partidaId: string) => {
    return executiveItems.filter(item => item.partida_id === partidaId);
  };

  const getPartidaStatus = (partida: any) => {
    const partidaExecutiveItems = getPartidaExecutiveItems(partida.id);
    const totalExecutive = partidaExecutiveItems.reduce((sum, item) => sum + item.monto_total, 0);
    
    if (partidaExecutiveItems.length === 0) return 'empty';
    if (totalExecutive > partida.monto_total) return 'over';
    return 'within';
  };

  const shouldShowPartida = (partida: any) => {
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        partida.codigo.toLowerCase().includes(searchLower) ||
        partida.nombre.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }

    // Filter by status
    if (statusFilter !== 'all') {
      const status = getPartidaStatus(partida);
      if (status !== statusFilter) return false;
    }

    return true;
  };

  const handleAddSubpartida = (partidaId: string) => {
    setAddingSubpartidaTo(partidaId);
    // Auto-expand the partida
    setExpandedPartidas(prev => new Set(prev).add(partidaId));
  };

  const handleCreateSubpartida = (partidaId: string, data: Partial<ExecutiveItem>) => {
    // Obtener contexto de la partida para departamento, mayor_id, partida_id
    let departamento = '';
    let mayor_id = '';
    let parametric_item_id = '';

    // Buscar la partida en la estructura para obtener sus IDs
    Object.entries(groupedParametric.departamentos).forEach(([deptoKey, depto]) => {
      Object.entries(depto.mayores).forEach(([mayorKey, mayor]) => {
        const partida = mayor.partidas.find(p => p.id === partidaId);
        if (partida) {
          departamento = 'CONSTRUCCIÓN';
          mayor_id = partida.mayor_id;
          parametric_item_id = partida.id; // Este es el ID del item del presupuesto paramétrico
        }
      });
    });

    onCreateItem({
      cliente_id: '', // Will be filled by the mutation
      proyecto_id: '', // Will be filled by the mutation  
      presupuesto_parametrico_id: parametric_item_id,
      departamento,
      mayor_id,
      partida_id: partidaId,
      subpartida_id: data.subpartida_id || '',
      unidad: data.unidad || 'pza',
      cantidad_requerida: data.cantidad_requerida || 1,
      precio_unitario: data.precio_unitario || 0
    });
    setAddingSubpartidaTo(null);
  };

  return (
    <div className="space-y-4">
      {Object.entries(groupedParametric.departamentos).map(([deptoKey, departamento]) => (
        <Card key={deptoKey}>
          <Collapsible 
            open={expandedDepartamentos.has(deptoKey)}
            onOpenChange={() => toggleDepartamento(deptoKey)}
          >
            <CollapsibleTrigger asChild>
              <CardHeader className="hover:bg-muted/50 cursor-pointer">
                <CardTitle className="flex items-center gap-3">
                  {expandedDepartamentos.has(deptoKey) ? 
                    <ChevronDown className="h-5 w-5" /> : 
                    <ChevronRight className="h-5 w-5" />
                  }
                  <Building2 className="h-5 w-5 text-primary" />
                  <span className="text-lg font-semibold">{departamento.nombre}</span>
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-3 ml-6">
                  {Object.entries(departamento.mayores).map(([mayorKey, mayor]) => (
                    <Card key={mayorKey} className="border-l-4 border-l-primary/20">
                      <Collapsible 
                        open={expandedMayores.has(`${deptoKey}-${mayorKey}`)}
                        onOpenChange={() => toggleMayor(`${deptoKey}-${mayorKey}`)}
                      >
                        <CollapsibleTrigger asChild>
                          <CardHeader className="hover:bg-muted/30 cursor-pointer py-3">
                            <CardTitle className="flex items-center gap-3 text-base">
                              {expandedMayores.has(`${deptoKey}-${mayorKey}`) ? 
                                <ChevronDown className="h-4 w-4" /> : 
                                <ChevronRight className="h-4 w-4" />
                              }
                              <Archive className="h-4 w-4 text-muted-foreground" />
                              <span>{mayor.codigo} - {mayor.nombre}</span>
                            </CardTitle>
                          </CardHeader>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <CardContent className="pt-0">
                            <div className="space-y-2 ml-6">
                              {mayor.partidas
                                .filter(shouldShowPartida)
                                .map((partida) => {
                                  const partidaExecutiveItems = getPartidaExecutiveItems(partida.id);
                                  const totalExecutive = partidaExecutiveItems.reduce(
                                    (sum, item) => sum + item.monto_total, 0
                                  );
                                  const difference = totalExecutive - partida.monto_total;
                                  const status = getPartidaStatus(partida);
                                  
                                  return (
                                    <Card key={partida.id} className="border-l-2 border-l-muted">
                                      <Collapsible 
                                        open={expandedPartidas.has(partida.id)}
                                        onOpenChange={() => togglePartida(partida.id)}
                                      >
                                        <CollapsibleTrigger asChild>
                                          <CardHeader className="hover:bg-muted/20 cursor-pointer py-3">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-3">
                                                {expandedPartidas.has(partida.id) ? 
                                                  <ChevronDown className="h-4 w-4" /> : 
                                                  <ChevronRight className="h-4 w-4" />
                                                }
                                                <Package className="h-4 w-4 text-muted-foreground" />
                                                <div>
                                                  <p className="font-medium">
                                                    {partida.codigo} - {partida.nombre}
                                                  </p>
                                                  <p className="text-sm text-muted-foreground">
                                                    Cantidad: {partida.cantidad_requerida} | 
                                                    P.U: ${partida.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                  </p>
                                                </div>
                                              </div>
                                              
                                              <div className="flex items-center gap-4">
                                                <Badge variant={
                                                  status === 'empty' ? 'secondary' :
                                                  status === 'over' ? 'destructive' : 'default'
                                                }>
                                                  {status === 'empty' && 'Sin subpartidas'}
                                                  {status === 'over' && `Excede $${Math.abs(difference).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
                                                  {status === 'within' && 'Dentro de presupuesto'}
                                                </Badge>
                                                
                                                <div className="text-right">
                                                  <p className="font-semibold">
                                                    ${partida.monto_total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                  </p>
                                                  <p className="text-sm text-muted-foreground">
                                                    Ejecutivo: ${totalExecutive.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                  </p>
                                                </div>
                                                
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAddSubpartida(partida.id);
                                                  }}
                                                >
                                                  <Plus className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            </div>
                                          </CardHeader>
                                        </CollapsibleTrigger>
                                        
                                        <CollapsibleContent>
                                          <CardContent className="pt-0">
                                            <div className="ml-6 space-y-2">
                                              {partidaExecutiveItems.length === 0 && addingSubpartidaTo !== partida.id && (
                                                <div className="text-center py-8 text-muted-foreground">
                                                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                  <p>No hay subpartidas definidas</p>
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="mt-2"
                                                    onClick={() => handleAddSubpartida(partida.id)}
                                                  >
                                                    <Plus className="h-4 w-4 mr-2" />
                                                    Agregar primera subpartida
                                                  </Button>
                                                </div>
                                              )}
                                              
                                              {partidaExecutiveItems.map(item => (
                                                <ExecutiveSubpartidaRow
                                                  key={item.id}
                                                  item={item}
                                                  onUpdate={async (data) => onUpdateItem(item.id, data)}
                                                  onDelete={async () => onDeleteItem(item.id)}
                                                />
                                              ))}
                                              
                                              {addingSubpartidaTo === partida.id && (
                                                <ExecutiveSubpartidaRow
                                                  item={null}
                                                  onSave={async (data) => handleCreateSubpartida(partida.id, data)}
                                                  onCancel={() => setAddingSubpartidaTo(null)}
                                                />
                                              )}
                                            </div>
                                          </CardContent>
                                        </CollapsibleContent>
                                      </Collapsible>
                                    </Card>
                                  );
                                })}
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}
    </div>
  );
}