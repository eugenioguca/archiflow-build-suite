import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  TrendingUp,
  DollarSign,
  Calendar,
  Target,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3
} from "lucide-react";

interface DashboardMetrics {
  totalProjects: number;
  activeProjects: number;
  convertedClients: number;
  totalBudget: number;
  projectsByStage: Record<string, number>;
  recentActivity: any[];
  conversionRate: number;
  averageBudget: number;
}

export const SalesExecutiveDashboard = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  const fetchDashboardMetrics = async () => {
    try {
      // Obtener todos los proyectos de clientes
      const { data: projects, error: projectsError } = await supabase
        .from('client_projects')
        .select(`
          *,
          clients!client_projects_client_id_fkey(id, full_name, email)
        `);

      if (projectsError) throw projectsError;

      // Calcular métricas
      const totalProjects = projects?.length || 0;
      const activeProjects = projects?.filter(p => 
        ['en_contacto', 'propuesta_enviada', 'negociacion'].includes(p.sales_pipeline_stage)
      ).length || 0;
      
      const convertedClients = projects?.filter(p => 
        p.sales_pipeline_stage === 'cliente_cerrado'
      ).length || 0;

      const totalBudget = projects?.reduce((sum, p) => sum + (p.budget || 0), 0) || 0;
      const averageBudget = totalProjects > 0 ? totalBudget / totalProjects : 0;
      const conversionRate = totalProjects > 0 ? (convertedClients / totalProjects) * 100 : 0;

      // Proyectos por etapa
      const projectsByStage = projects?.reduce((acc, project) => {
        const stage = project.sales_pipeline_stage || 'nuevo_lead';
        acc[stage] = (acc[stage] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Actividad reciente (últimos 5 proyectos actualizados)
      const recentActivity = projects
        ?.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5) || [];

      setMetrics({
        totalProjects,
        activeProjects,
        convertedClients,
        totalBudget,
        projectsByStage,
        recentActivity,
        conversionRate,
        averageBudget
      });

    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las métricas del dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      'nuevo_lead': 'Nuevo Lead',
      'en_contacto': 'En Contacto',
      'propuesta_enviada': 'Propuesta Enviada',
      'negociacion': 'Negociación',
      'cliente_cerrado': 'Cliente Cerrado',
      'perdido': 'Perdido'
    };
    return labels[stage] || stage;
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      'nuevo_lead': 'bg-blue-500',
      'en_contacto': 'bg-yellow-500',
      'propuesta_enviada': 'bg-purple-500',
      'negociacion': 'bg-orange-500',
      'cliente_cerrado': 'bg-green-500',
      'perdido': 'bg-red-500'
    };
    return colors[stage] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-1/3"></div>
                <div className="h-8 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium">No se pudieron cargar las métricas</h3>
          <p className="text-muted-foreground">
            Intenta recargar la página
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Proyectos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.activeProjects} activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa Conversión</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.convertedClients} cerrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Presupuesto Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(metrics.totalBudget / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-muted-foreground">
              Promedio: ${(metrics.averageBudget / 1000).toFixed(0)}K
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Negociación</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.projectsByStage['negociacion'] || 0}</div>
            <p className="text-xs text-muted-foreground">
              Próximos a cerrar
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline de ventas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Pipeline de Ventas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(metrics.projectsByStage).map(([stage, count]) => (
              <div key={stage} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getStageColor(stage)}`}></div>
                    <span className="text-sm font-medium">{getStageLabel(stage)}</span>
                  </div>
                  <Badge variant="secondary">{count}</Badge>
                </div>
                <Progress 
                  value={(count / metrics.totalProjects) * 100} 
                  className="h-2"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Actividad reciente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Actividad Reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.recentActivity.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No hay actividad reciente
                </p>
              ) : (
                metrics.recentActivity.map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{project.clients?.full_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {project.project_name}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant="outline"
                        className={`${getStageColor(project.sales_pipeline_stage)} text-white border-0`}
                      >
                        {getStageLabel(project.sales_pipeline_stage)}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        ${(project.budget / 1000).toFixed(0)}K
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};