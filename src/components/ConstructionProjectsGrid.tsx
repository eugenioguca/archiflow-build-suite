import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ConstructionProjectCard } from './ConstructionProjectCard';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Search, Filter, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConstructionProject {
  id: string;
  project_name: string;
  budget: number;
  spent_budget: number;
  construction_area: number;
  land_square_meters: number;
  construction_start_date: string | null;
  estimated_completion_date: string | null;
  overall_progress_percentage: number;
  permit_status: string;
  project_manager_id: string | null;
  construction_supervisor_id: string | null;
  client: {
    full_name: string;
  };
  project_manager?: {
    display_name: string;
  };
  construction_supervisor?: {
    display_name: string;
  };
  // Métricas calculadas
  active_phases_count?: number;
  pending_deliveries?: number;
  safety_incidents?: number;
  team_members_count?: number;
}

interface ConstructionProjectsGridProps {
  onProjectSelect: (projectId: string) => void;
}

export function ConstructionProjectsGrid({ onProjectSelect }: ConstructionProjectsGridProps) {
  const [projects, setProjects] = useState<ConstructionProject[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ConstructionProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [progressFilter, setProgressFilter] = useState('all');

  useEffect(() => {
    fetchConstructionProjects();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [projects, searchTerm, statusFilter, progressFilter]);

  const fetchConstructionProjects = async () => {
    try {
      setLoading(true);
      
      // Fetch client projects with construction status and related data
      const { data: constructionData, error: constructionError } = await supabase
        .from('client_projects')
        .select(`
          *,
          client:clients(full_name),
          project_manager:profiles!project_manager_id(display_name),
          construction_supervisor:profiles!construction_supervisor_id(display_name)
        `)
        .eq('status', 'construction');

      if (constructionError) throw constructionError;

      // For each project, get additional metrics from general tables
      const projectsWithMetrics = await Promise.all(
        (constructionData || []).map(async (project) => {
          // Get expenses count for phases
          const { count: expensesCount } = await supabase
            .from('expenses')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id)
            .eq('expense_type', 'construction');

          // Get budget items count 
          const { count: budgetItemsCount } = await supabase
            .from('budget_items')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id);

          // Get documents count
          const { count: documentsCount } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id)
            .eq('department', 'construction');

          return {
            ...project,
            active_phases_count: Math.floor(Math.random() * 8) + 1, // Simulado - puedes usar lógica real
            pending_deliveries: Math.floor(Math.random() * 5), // Simulado
            team_members_count: Math.floor(Math.random() * 15) + 5, // Simulado
            safety_incidents: 0,
            expenses_count: expensesCount || 0,
            budget_items_count: budgetItemsCount || 0,
            documents_count: documentsCount || 0
          };
        })
      );

      setProjects(projectsWithMetrics);
    } catch (error) {
      console.error('Error fetching construction projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProjects = () => {
    let filtered = projects;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(project => 
        project.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.client.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(project => project.permit_status === statusFilter);
    }

    // Progress filter
    if (progressFilter !== 'all') {
      switch (progressFilter) {
        case 'not-started':
          filtered = filtered.filter(project => (project.overall_progress_percentage || 0) === 0);
          break;
        case 'in-progress':
          filtered = filtered.filter(project => {
            const progress = project.overall_progress_percentage || 0;
            return progress > 0 && progress < 100;
          });
          break;
        case 'completed':
          filtered = filtered.filter(project => (project.overall_progress_percentage || 0) === 100);
          break;
        case 'delayed':
          filtered = filtered.filter(project => {
            if (!project.estimated_completion_date) return false;
            const daysRemaining = Math.ceil(
              (new Date(project.estimated_completion_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            );
            return daysRemaining < 0;
          });
          break;
      }
    }

    setFilteredProjects(filtered);
  };

  const getProjectStats = () => {
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => {
      const progress = p.overall_progress_percentage || 0;
      return progress > 0 && progress < 100;
    }).length;
    const completedProjects = projects.filter(p => 
      (p.overall_progress_percentage || 0) === 100
    ).length;
    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const spentBudget = projects.reduce((sum, p) => sum + (p.spent_budget || 0), 0);
    
    return { totalProjects, activeProjects, completedProjects, totalBudget, spentBudget };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const stats = getProjectStats();

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            Construcción
          </h1>
          <p className="text-muted-foreground">
            Gestión integral de proyectos de construcción
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Proyecto
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{stats.totalProjects}</div>
            <div className="text-sm text-muted-foreground">Total Proyectos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.activeProjects}</div>
            <div className="text-sm text-muted-foreground">En Progreso</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-emerald-600">{stats.completedProjects}</div>
            <div className="text-sm text-muted-foreground">Completados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-600">
              ${stats.totalBudget.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Presupuesto Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              ${stats.spentBudget.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Gastado</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por proyecto o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Estado de permisos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="approved">Aprobados</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="expired">Vencidos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={progressFilter} onValueChange={setProgressFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Progreso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo el progreso</SelectItem>
                <SelectItem value="not-started">Sin iniciar</SelectItem>
                <SelectItem value="in-progress">En progreso</SelectItem>
                <SelectItem value="completed">Completados</SelectItem>
                <SelectItem value="delayed">Retrasados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay proyectos de construcción</h3>
            <p className="text-muted-foreground">
              {projects.length === 0 
                ? "Aún no tienes proyectos de construcción creados." 
                : "No se encontraron proyectos que coincidan con los filtros seleccionados."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ConstructionProjectCard
              key={project.id}
              project={project}
              onOpenProject={onProjectSelect}
            />
          ))}
        </div>
      )}

      {/* Results count */}
      {filteredProjects.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Mostrando {filteredProjects.length} de {projects.length} proyectos
        </div>
      )}
    </div>
  );
}