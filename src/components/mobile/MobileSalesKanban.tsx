import React, { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MobileProjectCard } from "./MobileProjectCard";
import { MobileMetricCard } from "./MobileMetricCard";
import {
  Eye,
  Plus,
  Filter,
  TrendingUp,
  Users,
  Clock,
  DollarSign,
  Target,
  Briefcase,
  Calendar,
  Settings
} from "lucide-react";

interface SalesProject {
  id: string;
  name: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  address?: string;
  status: string;
  budget?: number;
  progress?: number;
  created_at: string;
  updated_at?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  phase: string;
  estimated_value?: number;
  probability?: number;
  next_action?: string;
  next_action_date?: string;
}

interface MobileSalesKanbanProps {
  projects: SalesProject[];
  onProjectSelect?: (project: SalesProject) => void;
  onNewProject?: () => void;
  className?: string;
}

const salesPhases = [
  { key: 'prospecto', label: 'Prospectos', icon: Eye, color: 'bg-blue-500' },
  { key: 'contacto', label: 'Contacto Inicial', icon: Users, color: 'bg-indigo-500' },
  { key: 'presentacion', label: 'Presentación', icon: Briefcase, color: 'bg-purple-500' },
  { key: 'propuesta', label: 'Propuesta', icon: Target, color: 'bg-orange-500' },
  { key: 'negociacion', label: 'Negociación', icon: DollarSign, color: 'bg-yellow-500' },
  { key: 'cierre', label: 'Cierre', icon: Calendar, color: 'bg-green-500' },
];

const getProjectsByPhase = (projects: SalesProject[], phase: string) => {
  return projects.filter(project => project.phase === phase);
};

const calculatePhaseMetrics = (projects: SalesProject[], phase: string) => {
  const phaseProjects = getProjectsByPhase(projects, phase);
  const totalValue = phaseProjects.reduce((sum, p) => sum + (p.estimated_value || 0), 0);
  const avgProbability = phaseProjects.length > 0 
    ? phaseProjects.reduce((sum, p) => sum + (p.probability || 0), 0) / phaseProjects.length 
    : 0;
  
  return {
    count: phaseProjects.length,
    totalValue,
    avgProbability: Math.round(avgProbability)
  };
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export function MobileSalesKanban({ 
  projects, 
  onProjectSelect, 
  onNewProject,
  className = "" 
}: MobileSalesKanbanProps) {
  const isMobile = useIsMobile();
  const [selectedPhase, setSelectedPhase] = useState(salesPhases[0].key);
  const [sortBy, setSortBy] = useState<'created' | 'value' | 'probability'>('created');

  if (!isMobile) return null;

  const currentPhase = salesPhases.find(p => p.key === selectedPhase);
  const phaseProjects = getProjectsByPhase(projects, selectedPhase);
  const phaseMetrics = calculatePhaseMetrics(projects, selectedPhase);

  // Sort projects
  const sortedProjects = [...phaseProjects].sort((a, b) => {
    switch (sortBy) {
      case 'value':
        return (b.estimated_value || 0) - (a.estimated_value || 0);
      case 'probability':
        return (b.probability || 0) - (a.probability || 0);
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  // Calculate overall metrics
  const totalProjects = projects.length;
  const totalValue = projects.reduce((sum, p) => sum + (p.estimated_value || 0), 0);
  const avgConversion = projects.length > 0 
    ? projects.reduce((sum, p) => sum + (p.probability || 0), 0) / projects.length 
    : 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Overview Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <MobileMetricCard
          title="Total Proyectos"
          value={totalProjects}
          icon={Briefcase}
          subtitle="En pipeline"
        />
        <MobileMetricCard
          title="Valor Total"
          value={formatCurrency(totalValue)}
          icon={DollarSign}
          subtitle="Pipeline"
        />
      </div>

      {/* Phase Navigation */}
      <Card className="bg-card/50 border border-border/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Fases de Venta</CardTitle>
            {onNewProject && (
              <Button size="sm" onClick={onNewProject}>
                <Plus className="h-4 w-4 mr-1" />
                Nuevo
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Phase Selector */}
          <Select value={selectedPhase} onValueChange={setSelectedPhase}>
            <SelectTrigger className="w-full">
              <SelectValue>
                <div className="flex items-center gap-2">
                  {currentPhase && <currentPhase.icon className="h-4 w-4" />}
                  {currentPhase?.label}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {salesPhases.map((phase) => (
                <SelectItem key={phase.key} value={phase.key}>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${phase.color}`} />
                    <phase.icon className="h-4 w-4" />
                    <span>{phase.label}</span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      {getProjectsByPhase(projects, phase.key).length}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Phase Metrics */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Proyectos</p>
              <p className="text-lg font-bold text-foreground">{phaseMetrics.count}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Valor</p>
              <p className="text-sm font-bold text-foreground">
                {formatCurrency(phaseMetrics.totalValue)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Probabilidad</p>
              <p className="text-lg font-bold text-foreground">{phaseMetrics.avgProbability}%</p>
            </div>
          </div>

          {/* Sort Options */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created">Más Recientes</SelectItem>
                <SelectItem value="value">Mayor Valor</SelectItem>
                <SelectItem value="probability">Mayor Probabilidad</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Projects List */}
      <div className="space-y-3">
        {sortedProjects.length === 0 ? (
          <Card className="bg-card/30 border border-border/20">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <div className="p-3 rounded-full bg-muted/20 mb-3">
                {currentPhase && <currentPhase.icon className="h-6 w-6 text-muted-foreground" />}
              </div>
              <h3 className="font-medium text-foreground mb-1">
                No hay proyectos en {currentPhase?.label}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Comienza agregando un nuevo proyecto a esta fase
              </p>
              {onNewProject && (
                <Button size="sm" onClick={onNewProject}>
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar Proyecto
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          sortedProjects.map((project) => (
            <MobileProjectCard
              key={project.id}
              project={{
                ...project,
                next_milestone: project.next_action,
                next_milestone_date: project.next_action_date,
              }}
              onSelect={onProjectSelect}
              actions={
                <div className="flex gap-2 w-full">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="h-3 w-3 mr-1" />
                    Ver
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Settings className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                </div>
              }
            />
          ))
        )}
      </div>
    </div>
  );
}