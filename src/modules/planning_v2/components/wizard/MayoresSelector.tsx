/**
 * Selector de Mayores del departamento Construcción
 * Solo permite seleccionar Mayores, sin Partidas ni Subpartidas
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { tuAdapter } from '../../adapters/tu';

interface MayoresSelectorProps {
  selectedMayorIds: string[];
  onSelectionChange: (mayorIds: string[]) => void;
  departamento?: string;
}

export function MayoresSelector({
  selectedMayorIds,
  onSelectionChange,
  departamento = 'CONSTRUCCIÓN'
}: MayoresSelectorProps) {
  const [expandedMayores, setExpandedMayores] = useState<Set<string>>(new Set());

  // Cargar Mayores del departamento Construcción
  const { data: mayores = [], isLoading } = useQuery({
    queryKey: ['tu-mayores', departamento],
    queryFn: () => tuAdapter.getMayores(departamento),
  });

  const toggleExpand = (mayorId: string) => {
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

  const isMayorSelected = (mayorId: string) => selectedMayorIds.includes(mayorId);

  const toggleMayorSelection = (mayorId: string) => {
    if (isMayorSelected(mayorId)) {
      onSelectionChange(selectedMayorIds.filter(id => id !== mayorId));
    } else {
      onSelectionChange([...selectedMayorIds, mayorId]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Cargando Mayores...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b">
        <div>
          <p className="text-sm font-medium">Departamento: {departamento}</p>
          <p className="text-xs text-muted-foreground">
            {selectedMayorIds.length} {selectedMayorIds.length === 1 ? 'Mayor seleccionado' : 'Mayores seleccionados'}
          </p>
        </div>
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-2">
          {mayores.map(mayor => {
            const isExpanded = expandedMayores.has(mayor.id);
            const isSelected = isMayorSelected(mayor.id);

            return (
              <div key={mayor.id} className="space-y-1">
                <div
                  className={`
                    flex items-center gap-2 p-3 rounded-lg border
                    transition-colors hover:bg-muted/30 cursor-pointer
                    ${isSelected ? 'bg-primary/5 border-primary/20' : 'bg-background'}
                  `}
                  onClick={() => toggleMayorSelection(mayor.id)}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(mayor.id);
                    }}
                    className="shrink-0 p-1 hover:bg-muted rounded"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>

                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleMayorSelection(mayor.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-mono text-muted-foreground shrink-0">
                        {mayor.codigo}
                      </span>
                      <span className="text-sm font-medium truncate">
                        {mayor.nombre}
                      </span>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="ml-6 pl-4 border-l-2 border-muted py-2">
                    <p className="text-xs text-muted-foreground italic">
                      Las Partidas y Subpartidas de este Mayor estarán disponibles en el Catálogo después de crear el presupuesto.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {mayores.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              No se encontraron Mayores para el departamento {departamento}
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
