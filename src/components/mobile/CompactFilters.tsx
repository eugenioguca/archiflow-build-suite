import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Filter, Search, X } from "lucide-react";

interface Employee {
  id: string;
  full_name: string;
  role: string;
}

interface CompactFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  advisorFilter: string;
  onAdvisorChange: (value: string) => void;
  employees: Employee[];
  className?: string;
}

const statusConfig = {
  nuevo_lead: { label: "Nuevo Lead" },
  en_contacto: { label: "En Contacto" },
  lead_perdido: { label: "Lead Perdido" },
  cliente_cerrado: { label: "Cliente Cerrado" },
};

export function CompactFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  advisorFilter,
  onAdvisorChange,
  employees,
  className
}: CompactFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Contar filtros activos
  const activeFiltersCount = [
    searchTerm,
    statusFilter !== 'all' ? statusFilter : '',
    advisorFilter !== 'all' ? advisorFilter : ''
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    onSearchChange('');
    onStatusChange('all');
    onAdvisorChange('all');
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Búsqueda rápida visible */}
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar proyectos..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Botón de filtros con indicador */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="relative">
            <Filter className="h-4 w-4" />
            {activeFiltersCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
              >
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>

        <SheetContent side="bottom" className="h-[400px]">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span>Filtros</span>
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-destructive"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpiar todo
                </Button>
              )}
            </SheetTitle>
            <SheetDescription>
              Filtra los proyectos por fase del pipeline y asesor asignado
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Filtro por fase del pipeline */}
            <div className="space-y-3">
              <Label>Fase del Pipeline</Label>
              <Select value={statusFilter} onValueChange={onStatusChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar fase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span className="flex items-center gap-2">
                      Todas las fases
                    </span>
                  </SelectItem>
                  {Object.entries(statusConfig).map(([phase, config]) => (
                    <SelectItem key={phase} value={phase}>
                      <span className="flex items-center gap-2">
                        {config.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {statusFilter !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  Filtrado por: {statusConfig[statusFilter as keyof typeof statusConfig]?.label}
                </Badge>
              )}
            </div>

            {/* Filtro por asesor */}
            <div className="space-y-3">
              <Label>Asesor Asignado</Label>
              <Select value={advisorFilter} onValueChange={onAdvisorChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar asesor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span className="flex items-center gap-2">
                      Todos los asesores
                    </span>
                  </SelectItem>
                  <SelectItem value="unassigned">
                    <span className="flex items-center gap-2">
                      Sin asignar
                    </span>
                  </SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      <span className="flex items-center gap-2">
                        {employee.full_name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {advisorFilter !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  {advisorFilter === 'unassigned' 
                    ? 'Filtrado por: Sin asignar'
                    : `Filtrado por: ${employees.find(e => e.id === advisorFilter)?.full_name}`
                  }
                </Badge>
              )}
            </div>

            {/* Resumen de filtros activos */}
            {activeFiltersCount > 0 && (
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''} activo{activeFiltersCount > 1 ? 's' : ''}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                  >
                    Aplicar filtros
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}