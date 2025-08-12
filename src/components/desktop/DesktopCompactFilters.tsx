import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Filter, X } from "lucide-react";

interface Employee {
  id: string;
  full_name: string;
  role: string;
}

interface DesktopCompactFiltersProps {
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
  nuevo_lead: "Nuevo Lead",
  en_contacto: "En Contacto", 
  lead_perdido: "Lead Perdido",
  cliente_cerrado: "Cliente Cerrado",
};

export const DesktopCompactFilters: React.FC<DesktopCompactFiltersProps> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  advisorFilter,
  onAdvisorChange,
  employees,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Calculate active filters count
  const activeFiltersCount = [
    statusFilter !== 'all',
    advisorFilter !== 'all'
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    onStatusChange('all');
    onAdvisorChange('all');
    setIsOpen(false);
  };

  const getStatusLabel = (status: string) => {
    return statusConfig[status as keyof typeof statusConfig] || status;
  };

  const getAdvisorName = (advisorId: string) => {
    if (advisorId === 'unassigned') return 'Sin asignar';
    const advisor = employees.find(emp => emp.id === advisorId);
    return advisor?.full_name || 'Desconocido';
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Search Input - Always Visible */}
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente, proyecto, email o teléfono..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10"
        />
      </div>

      {/* Active Filters Display */}
      <div className="flex items-center space-x-2">
        {statusFilter !== 'all' && (
          <Badge variant="secondary" className="text-xs">
            Estado: {getStatusLabel(statusFilter)}
            <button
              onClick={() => onStatusChange('all')}
              className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}

        {advisorFilter !== 'all' && (
          <Badge variant="secondary" className="text-xs">
            Asesor: {getAdvisorName(advisorFilter)}
            <button
              onClick={() => onAdvisorChange('all')}
              className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
      </div>

      {/* Filters Popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="relative">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
              >
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        
        <PopoverContent align="end" className="w-80">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filtros Avanzados</h4>
              {activeFiltersCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearAllFilters}
                  className="text-xs"
                >
                  Limpiar todo
                </Button>
              )}
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Fase del Pipeline</label>
              <Select value={statusFilter} onValueChange={onStatusChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar fase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las fases</SelectItem>
                  {Object.entries(statusConfig).map(([status, label]) => (
                    <SelectItem key={status} value={status}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Advisor Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Asesor Asignado</label>
              <Select value={advisorFilter} onValueChange={onAdvisorChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar asesor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los asesores</SelectItem>
                  <SelectItem value="unassigned">Sin asignar</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Apply Button */}
            <Button 
              onClick={() => setIsOpen(false)} 
              className="w-full"
              size="sm"
            >
              Aplicar filtros
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};