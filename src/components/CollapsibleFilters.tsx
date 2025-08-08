import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ClientProjectSelector } from '@/components/ClientProjectSelector';
import { Filter, ChevronDown, X } from 'lucide-react';

interface CollapsibleFiltersProps {
  selectedClientId?: string;
  selectedProjectId?: string;
  onClientChange: (clientId: string | undefined) => void;
  onProjectChange: (projectId: string | undefined) => void;
  onClearFilters: () => void;
}

export function CollapsibleFilters({
  selectedClientId,
  selectedProjectId,
  onClientChange,
  onProjectChange,
  onClearFilters,
}: CollapsibleFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasFilters = selectedClientId || selectedProjectId;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between">
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtros
            {hasFilters && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                {(selectedClientId ? 1 : 0) + (selectedProjectId ? 1 : 0)}
              </Badge>
            )}
            <ChevronDown className="h-4 w-4 transition-transform duration-200 ui-open:rotate-180" />
          </Button>
        </CollapsibleTrigger>
        
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Limpiar
          </Button>
        )}
      </div>

      <CollapsibleContent className="mt-4">
        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1">
              <ClientProjectSelector
                selectedClientId={selectedClientId}
                selectedProjectId={selectedProjectId}
                onClientChange={onClientChange}
                onProjectChange={onProjectChange}
                showAllOption={true}
                showProjectFilter={true}
              />
            </div>
            
            {hasFilters && (
              <div className="flex gap-2 flex-wrap">
                {selectedClientId && (
                  <Badge variant="secondary" className="gap-1">
                    Cliente seleccionado
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => onClientChange(undefined)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {selectedProjectId && (
                  <Badge variant="secondary" className="gap-1">
                    Proyecto seleccionado
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => onProjectChange(undefined)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}