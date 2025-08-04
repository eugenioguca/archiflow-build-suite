import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface UserFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  departmentFilter: string;
  onDepartmentFilterChange: (value: string) => void;
  positionFilter: string;
  onPositionFilterChange: (value: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

const roleOptions = [
  { value: 'all', label: 'Todos los roles' },
  { value: 'admin', label: 'Administradores' },
  { value: 'employee', label: 'Empleados' },
  { value: 'client', label: 'Clientes' },
];

const statusOptions = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'approved', label: 'Aprobados' },
  { value: 'pending', label: 'Pendientes' },
];

const departmentOptions = [
  { value: 'all', label: 'Todos los departamentos' },
  { value: 'ventas', label: 'Ventas' },
  { value: 'diseño', label: 'Diseño' },
  { value: 'construcción', label: 'Construcción' },
  { value: 'finanzas', label: 'Finanzas' },
  { value: 'contabilidad', label: 'Contabilidad' },
];

const positionOptions = [
  { value: 'all', label: 'Todos los cargos' },
  { value: 'director', label: 'Director' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'jefatura', label: 'Jefatura' },
  { value: 'analista', label: 'Analista' },
  { value: 'auxiliar', label: 'Auxiliar' },
];

export function UserFilters({
  searchTerm,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  departmentFilter,
  onDepartmentFilterChange,
  positionFilter,
  onPositionFilterChange,
  onClearFilters,
  hasActiveFilters,
}: UserFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Barra de búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Buscar usuarios por nombre o email..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filtros en una fila responsive */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Rol */}
        <Select value={roleFilter} onValueChange={onRoleFilterChange}>
          <SelectTrigger className="w-auto min-w-[140px]">
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            {roleOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Estado */}
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-auto min-w-[140px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtros avanzados en popover para móviles */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Más filtros
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                  !
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Departamento</label>
                <Select value={departmentFilter} onValueChange={onDepartmentFilterChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Cargo</label>
                <Select value={positionFilter} onValueChange={onPositionFilterChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {positionOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Limpiar filtros */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="h-4 w-4 mr-2" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Filtros activos como badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1">
          {roleFilter !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              Rol: {roleOptions.find(r => r.value === roleFilter)?.label}
            </Badge>
          )}
          {statusFilter !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              Estado: {statusOptions.find(s => s.value === statusFilter)?.label}
            </Badge>
          )}
          {departmentFilter !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              Depto: {departmentOptions.find(d => d.value === departmentFilter)?.label}
            </Badge>
          )}
          {positionFilter !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              Cargo: {positionOptions.find(p => p.value === positionFilter)?.label}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}