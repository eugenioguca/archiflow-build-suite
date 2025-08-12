import { useState, useMemo } from "react";
import { CompactProjectCard } from "./CompactProjectCard";
import { CompactFilters } from "./CompactFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  Users, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  Loader2,
  ArrowUp,
  ArrowDown
} from "lucide-react";

interface ClientProject {
  id: string;
  client_id: string;
  project_name: string;
  project_description?: string;
  budget?: number;
  sales_pipeline_stage: 'nuevo_lead' | 'en_contacto' | 'lead_perdido' | 'cliente_cerrado';
  assigned_advisor_id?: string;
  last_contact_date?: string;
  next_contact_date?: string;
  probability_percentage?: number;
  service_type?: string;
  created_at: string;
  updated_at: string;
  clients?: {
    id: string;
    full_name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  assigned_advisor?: {
    id: string;
    full_name: string;
  };
}

interface Employee {
  id: string;
  full_name: string;
  role: string;
}

interface MobileSalesViewProps {
  projects: ClientProject[];
  filteredProjects: ClientProject[];
  employees: Employee[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  advisorFilter: string;
  onAdvisorChange: (value: string) => void;
  onProjectSelect: (project: ClientProject) => void;
  onStageChange?: (projectId: string, newStage: ClientProject['sales_pipeline_stage']) => void;
  loading?: boolean;
}

const statusConfig = {
  nuevo_lead: { label: "Nuevo Lead", color: "text-yellow-600", icon: Clock, progress: 5 },
  en_contacto: { label: "En Contacto", color: "text-blue-600", icon: Users, progress: 50 },
  lead_perdido: { label: "Lead Perdido", color: "text-red-600", icon: XCircle, progress: 0 },
  cliente_cerrado: { label: "Cliente Cerrado", color: "text-green-600", icon: CheckCircle, progress: 100 },
};

type SortOption = 'recent' | 'budget_high' | 'budget_low' | 'name' | 'stage';

export function MobileSalesView({
  projects,
  filteredProjects,
  employees,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  advisorFilter,
  onAdvisorChange,
  onProjectSelect,
  onStageChange,
  loading = false
}: MobileSalesViewProps) {
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [selectedPhase, setSelectedPhase] = useState<string>('all');

  // Calcular métricas por fase
  const phaseMetrics = useMemo(() => {
    const metrics: Record<string, { count: number; totalBudget: number; avgProbability: number }> = {};
    
    Object.keys(statusConfig).forEach(phase => {
      const phaseProjects = projects.filter(p => p.sales_pipeline_stage === phase);
      metrics[phase] = {
        count: phaseProjects.length,
        totalBudget: phaseProjects.reduce((sum, p) => sum + (p.budget || 0), 0),
        avgProbability: phaseProjects.length > 0 
          ? phaseProjects.reduce((sum, p) => sum + (p.probability_percentage || 0), 0) / phaseProjects.length
          : 0
      };
    });
    
    return metrics;
  }, [projects]);

  // Aplicar filtro de fase específica si está seleccionada
  const phaseFilteredProjects = useMemo(() => {
    if (selectedPhase === 'all') return filteredProjects;
    return filteredProjects.filter(project => project.sales_pipeline_stage === selectedPhase);
  }, [filteredProjects, selectedPhase]);

  // Ordenar proyectos
  const sortedProjects = useMemo(() => {
    const sorted = [...phaseFilteredProjects];
    
    switch (sortBy) {
      case 'recent':
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'budget_high':
        return sorted.sort((a, b) => (b.budget || 0) - (a.budget || 0));
      case 'budget_low':
        return sorted.sort((a, b) => (a.budget || 0) - (b.budget || 0));
      case 'name':
        return sorted.sort((a, b) => (a.clients?.full_name || '').localeCompare(b.clients?.full_name || ''));
      case 'stage':
        return sorted.sort((a, b) => a.sales_pipeline_stage.localeCompare(b.sales_pipeline_stage));
      default:
        return sorted;
    }
  }, [phaseFilteredProjects, sortBy]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumen de métricas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Resumen del Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(statusConfig).map(([phase, config]) => {
              const Icon = config.icon;
              const metrics = phaseMetrics[phase];
              
              return (
                <div key={phase} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Icon className={`h-5 w-5 ${config.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">{config.label}</p>
                    <p className="text-lg font-bold">{metrics.count}</p>
                    {metrics.totalBudget > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(metrics.totalBudget)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filtros compactos */}
      <CompactFilters
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        statusFilter={statusFilter}
        onStatusChange={onStatusChange}
        advisorFilter={advisorFilter}
        onAdvisorChange={onAdvisorChange}
        employees={employees}
      />

      {/* Controles de visualización */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            {/* Selector de fase */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Ver por fase</label>
              <Select value={selectedPhase} onValueChange={setSelectedPhase}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar fase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las fases</SelectItem>
                  {Object.entries(statusConfig).map(([phase, config]) => (
                    <SelectItem key={phase} value={phase}>
                      <div className="flex items-center gap-2">
                        <config.icon className={`h-4 w-4 ${config.color}`} />
                        {config.label}
                        <Badge variant="secondary" className="ml-auto">
                          {phaseMetrics[phase].count}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Ordenamiento */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Ordenar por</label>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Más recientes</SelectItem>
                  <SelectItem value="budget_high">
                    <div className="flex items-center gap-2">
                      Presupuesto <ArrowDown className="h-4 w-4" />
                    </div>
                  </SelectItem>
                  <SelectItem value="budget_low">
                    <div className="flex items-center gap-2">
                      Presupuesto <ArrowUp className="h-4 w-4" />
                    </div>
                  </SelectItem>
                  <SelectItem value="name">Nombre del cliente</SelectItem>
                  <SelectItem value="stage">Fase del pipeline</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información de resultados */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {sortedProjects.length} proyecto{sortedProjects.length !== 1 ? 's' : ''} encontrado{sortedProjects.length !== 1 ? 's' : ''}
        </span>
        {selectedPhase !== 'all' && (
          <Badge variant="outline">
            {statusConfig[selectedPhase as keyof typeof statusConfig]?.label}
          </Badge>
        )}
      </div>

      {/* Lista de proyectos */}
      <div className="space-y-3">
        {sortedProjects.length > 0 ? (
          sortedProjects.map((project) => (
            <CompactProjectCard
              key={project.id}
              project={project}
              onSelect={onProjectSelect}
              onStageChange={onStageChange}
              showActions={true}
            />
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                No se encontraron proyectos que coincidan con los filtros aplicados
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}