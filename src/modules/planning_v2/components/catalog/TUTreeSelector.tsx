/**
 * Tree selector for TU (Transacciones Unificadas) structure
 * Allows multi-selection of Mayores, Partidas, and Subpartidas
 */
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { tuAdapter } from '../../adapters/tu';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface TUSelection {
  mayorId: string;
  mayorCodigo: string;
  mayorNombre: string;
  partidas: Array<{
    partidaId: string;
    partidaCodigo: string;
    partidaNombre: string;
    subpartidas: Array<{
      subpartidaId: string;
      subpartidaCodigo: string;
      subpartidaNombre: string;
    }>;
  }>;
}

interface TUTreeSelectorProps {
  departamento?: string;
  onSelectionChange: (selection: TUSelection[]) => void;
  initialSelection?: TUSelection[];
}

export function TUTreeSelector({ 
  departamento = 'CONSTRUCCIÓN', 
  onSelectionChange,
  initialSelection = []
}: TUTreeSelectorProps) {
  const [expandedMayores, setExpandedMayores] = useState<Set<string>>(new Set());
  const [expandedPartidas, setExpandedPartidas] = useState<Set<string>>(new Set());
  const [selection, setSelection] = useState<TUSelection[]>(initialSelection);

  // Fetch data
  const { data: mayores = [], isLoading: loadingMayores } = useQuery({
    queryKey: ['tu-mayores', departamento],
    queryFn: () => tuAdapter.getMayores(departamento),
  });

  const { data: allPartidas = [], isLoading: loadingPartidas } = useQuery({
    queryKey: ['tu-all-partidas'],
    queryFn: () => tuAdapter.getPartidas(),
  });

  const { data: allSubpartidas = [], isLoading: loadingSubpartidas } = useQuery({
    queryKey: ['tu-all-subpartidas'],
    queryFn: () => tuAdapter.getSubpartidas(),
  });

  // Notify parent of selection changes
  useEffect(() => {
    onSelectionChange(selection);
  }, [selection, onSelectionChange]);

  const toggleMayor = (mayorId: string) => {
    setExpandedMayores(prev => {
      const next = new Set(prev);
      if (next.has(mayorId)) {
        next.delete(mayorId);
      } else {
        next.add(mayorId);
      }
      return next;
    });
  };

  const togglePartida = (partidaId: string) => {
    setExpandedPartidas(prev => {
      const next = new Set(prev);
      if (next.has(partidaId)) {
        next.delete(partidaId);
      } else {
        next.add(partidaId);
      }
      return next;
    });
  };

  const isMayorSelected = (mayorId: string) => {
    return selection.some(s => s.mayorId === mayorId);
  };

  const isPartidaSelected = (mayorId: string, partidaId: string) => {
    const mayor = selection.find(s => s.mayorId === mayorId);
    return mayor?.partidas.some(p => p.partidaId === partidaId) || false;
  };

  const isSubpartidaSelected = (mayorId: string, partidaId: string, subpartidaId: string) => {
    const mayor = selection.find(s => s.mayorId === mayorId);
    const partida = mayor?.partidas.find(p => p.partidaId === partidaId);
    return partida?.subpartidas.some(s => s.subpartidaId === subpartidaId) || false;
  };

  const toggleMayorSelection = (mayor: typeof mayores[0]) => {
    setSelection(prev => {
      const existing = prev.find(s => s.mayorId === mayor.id);
      if (existing) {
        // Deselect
        return prev.filter(s => s.mayorId !== mayor.id);
      } else {
        // Select with all partidas and subpartidas
        const partidasForMayor = allPartidas.filter(p => p.mayor_id === mayor.id);
        return [...prev, {
          mayorId: mayor.id,
          mayorCodigo: mayor.codigo,
          mayorNombre: mayor.nombre,
          partidas: partidasForMayor.map(partida => ({
            partidaId: partida.id,
            partidaCodigo: partida.codigo,
            partidaNombre: partida.nombre,
            subpartidas: allSubpartidas
              .filter(s => s.partida_id === partida.id)
              .map(sub => ({
                subpartidaId: sub.id,
                subpartidaCodigo: sub.codigo,
                subpartidaNombre: sub.nombre,
              }))
          }))
        }];
      }
    });
  };

  const togglePartidaSelection = (mayor: typeof mayores[0], partida: typeof allPartidas[0]) => {
    setSelection(prev => {
      const mayorIndex = prev.findIndex(s => s.mayorId === mayor.id);
      
      if (mayorIndex === -1) {
        // Mayor not selected, add it with this partida
        return [...prev, {
          mayorId: mayor.id,
          mayorCodigo: mayor.codigo,
          mayorNombre: mayor.nombre,
          partidas: [{
            partidaId: partida.id,
            partidaCodigo: partida.codigo,
            partidaNombre: partida.nombre,
            subpartidas: allSubpartidas
              .filter(s => s.partida_id === partida.id)
              .map(sub => ({
                subpartidaId: sub.id,
                subpartidaCodigo: sub.codigo,
                subpartidaNombre: sub.nombre,
              }))
          }]
        }];
      } else {
        // Mayor exists
        const mayorData = prev[mayorIndex];
        const partidaIndex = mayorData.partidas.findIndex(p => p.partidaId === partida.id);
        
        if (partidaIndex === -1) {
          // Add partida
          const newPartidas = [...mayorData.partidas, {
            partidaId: partida.id,
            partidaCodigo: partida.codigo,
            partidaNombre: partida.nombre,
            subpartidas: allSubpartidas
              .filter(s => s.partida_id === partida.id)
              .map(sub => ({
                subpartidaId: sub.id,
                subpartidaCodigo: sub.codigo,
                subpartidaNombre: sub.nombre,
              }))
          }];
          
          return prev.map((s, i) => i === mayorIndex 
            ? { ...s, partidas: newPartidas }
            : s
          );
        } else {
          // Remove partida
          const newPartidas = mayorData.partidas.filter(p => p.partidaId !== partida.id);
          
          if (newPartidas.length === 0) {
            // Remove mayor if no partidas left
            return prev.filter(s => s.mayorId !== mayor.id);
          } else {
            return prev.map((s, i) => i === mayorIndex 
              ? { ...s, partidas: newPartidas }
              : s
            );
          }
        }
      }
    });
  };

  const toggleSubpartidaSelection = (
    mayor: typeof mayores[0], 
    partida: typeof allPartidas[0],
    subpartida: typeof allSubpartidas[0]
  ) => {
    setSelection(prev => {
      const mayorIndex = prev.findIndex(s => s.mayorId === mayor.id);
      
      if (mayorIndex === -1) {
        // Create mayor with partida with this subpartida
        return [...prev, {
          mayorId: mayor.id,
          mayorCodigo: mayor.codigo,
          mayorNombre: mayor.nombre,
          partidas: [{
            partidaId: partida.id,
            partidaCodigo: partida.codigo,
            partidaNombre: partida.nombre,
            subpartidas: [{
              subpartidaId: subpartida.id,
              subpartidaCodigo: subpartida.codigo,
              subpartidaNombre: subpartida.nombre,
            }]
          }]
        }];
      }

      const mayorData = prev[mayorIndex];
      const partidaIndex = mayorData.partidas.findIndex(p => p.partidaId === partida.id);

      if (partidaIndex === -1) {
        // Add partida with this subpartida
        return prev.map((s, i) => i === mayorIndex ? {
          ...s,
          partidas: [...s.partidas, {
            partidaId: partida.id,
            partidaCodigo: partida.codigo,
            partidaNombre: partida.nombre,
            subpartidas: [{
              subpartidaId: subpartida.id,
              subpartidaCodigo: subpartida.codigo,
              subpartidaNombre: subpartida.nombre,
            }]
          }]
        } : s);
      }

      const partidaData = mayorData.partidas[partidaIndex];
      const subIndex = partidaData.subpartidas.findIndex(s => s.subpartidaId === subpartida.id);

      if (subIndex === -1) {
        // Add subpartida
        return prev.map((s, i) => i === mayorIndex ? {
          ...s,
          partidas: s.partidas.map((p, j) => j === partidaIndex ? {
            ...p,
            subpartidas: [...p.subpartidas, {
              subpartidaId: subpartida.id,
              subpartidaCodigo: subpartida.codigo,
              subpartidaNombre: subpartida.nombre,
            }]
          } : p)
        } : s);
      } else {
        // Remove subpartida
        const newSubs = partidaData.subpartidas.filter(s => s.subpartidaId !== subpartida.id);
        
        if (newSubs.length === 0) {
          // Remove partida if no subpartidas left
          const newPartidas = mayorData.partidas.filter(p => p.partidaId !== partida.id);
          
          if (newPartidas.length === 0) {
            // Remove mayor if no partidas left
            return prev.filter(s => s.mayorId !== mayor.id);
          }
          
          return prev.map((s, i) => i === mayorIndex ? { ...s, partidas: newPartidas } : s);
        }
        
        return prev.map((s, i) => i === mayorIndex ? {
          ...s,
          partidas: s.partidas.map((p, j) => j === partidaIndex ? {
            ...p,
            subpartidas: newSubs
          } : p)
        } : s);
      }
    });
  };

  const getSelectionCount = () => {
    let count = 0;
    selection.forEach(mayor => {
      mayor.partidas.forEach(partida => {
        count += partida.subpartidas.length;
      });
    });
    return count;
  };

  if (loadingMayores || loadingPartidas || loadingSubpartidas) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Departamento: <Badge variant="secondary">{departamento}</Badge>
        </div>
        <div className="text-sm font-medium">
          Seleccionadas: <Badge>{getSelectionCount()}</Badge>
        </div>
      </div>

      <ScrollArea className="h-[400px] border rounded-md">
        <div className="p-2 space-y-1">
          {mayores.map((mayor) => {
            const partidasForMayor = allPartidas.filter(p => p.mayor_id === mayor.id);
            const isExpanded = expandedMayores.has(mayor.id);
            const isSelected = isMayorSelected(mayor.id);

            return (
              <div key={mayor.id} className="space-y-1">
                {/* Mayor */}
                <div className="flex items-center gap-2 p-2 hover:bg-accent rounded-md group">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => toggleMayor(mayor.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleMayorSelection(mayor)}
                    className="shrink-0"
                  />
                  
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{mayor.codigo}</span>
                    <span className="text-sm font-medium">{mayor.nombre}</span>
                  </div>
                  
                  <Badge variant="secondary" className="text-xs">
                    {partidasForMayor.length}
                  </Badge>
                </div>

                {/* Partidas */}
                {isExpanded && partidasForMayor.map((partida) => {
                  const subpartidasForPartida = allSubpartidas.filter(s => s.partida_id === partida.id);
                  const isPartidaExp = expandedPartidas.has(partida.id);
                  const isPartidaSel = isPartidaSelected(mayor.id, partida.id);

                  return (
                    <div key={partida.id} className="ml-8 space-y-1">
                      <div className="flex items-center gap-2 p-2 hover:bg-accent rounded-md">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => togglePartida(partida.id)}
                        >
                          {isPartidaExp ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                        
                        <Checkbox
                          checked={isPartidaSel}
                          onCheckedChange={() => togglePartidaSelection(mayor, partida)}
                          className="shrink-0"
                        />
                        
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">{partida.codigo}</span>
                          <span className="text-sm">{partida.nombre}</span>
                        </div>
                        
                        <Badge variant="outline" className="text-xs">
                          {subpartidasForPartida.length}
                        </Badge>
                      </div>

                      {/* Subpartidas */}
                      {isPartidaExp && subpartidasForPartida.map((subpartida) => {
                        const isSubSel = isSubpartidaSelected(mayor.id, partida.id, subpartida.id);

                        return (
                          <div key={subpartida.id} className="ml-8">
                            <div className="flex items-center gap-2 p-2 hover:bg-accent rounded-md">
                              <div className="w-6" /> {/* Spacer */}
                              
                              <Checkbox
                                checked={isSubSel}
                                onCheckedChange={() => toggleSubpartidaSelection(mayor, partida, subpartida)}
                                className="shrink-0"
                              />
                              
                              <div className="flex-1 flex items-center gap-2">
                                <span className="text-xs font-mono text-muted-foreground">{subpartida.codigo}</span>
                                <span className="text-sm">{subpartida.nombre}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
