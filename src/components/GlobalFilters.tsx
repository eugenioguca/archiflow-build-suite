import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClientProjectSelector } from '@/components/ClientProjectSelector';
import { X, Filter } from 'lucide-react';

interface GlobalFiltersProps {
  selectedClientId?: string;
  selectedProjectId?: string;
  onClientChange: (clientId: string | undefined) => void;
  onProjectChange: (projectId: string | undefined) => void;
  onClearFilters: () => void;
  showTitle?: boolean;
}

export function GlobalFilters({
  selectedClientId,
  selectedProjectId,
  onClientChange,
  onProjectChange,
  onClearFilters,
  showTitle = true
}: GlobalFiltersProps) {
  const hasFilters = selectedClientId || selectedProjectId;

  return (
    <Card className="mb-6">
      {showTitle && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filtros Globales
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
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
            <div className="flex flex-col sm:flex-row gap-2">
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
              <Button
                variant="outline"
                size="sm"
                onClick={onClearFilters}
                className="shrink-0"
              >
                Limpiar filtros
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}