import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, Building2, DollarSign, TrendingUp, BarChart3 } from 'lucide-react';
import { useNotificationManager } from '@/hooks/useNotificationManager';

export function SmartDashboardStats() {
  const { dashboardStats, loading, subscribeTo } = useNotificationManager();
  const [localStats, setLocalStats] = useState(dashboardStats);

  // Subscribe to dashboard updates
  useEffect(() => {
    const unsubscribe = subscribeTo('dashboard_update', (data) => {
      setLocalStats(data.stats);
    });

    return unsubscribe;
  }, [subscribeTo]);

  // Update local stats when manager stats change
  useEffect(() => {
    setLocalStats(dashboardStats);
  }, [dashboardStats]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  // Calculate conversion rate
  const conversionRate = Math.min(
    localStats.totalClients > 0 ? (localStats.activeClients / localStats.totalClients) * 100 : 0,
    100
  );
  
  const projectCompletionRate = Math.min(
    localStats.totalProjects > 0 ? (localStats.completedProjects / localStats.totalProjects) * 100 : 0,
    100
  );

  if (loading && Object.keys(localStats).length === 0) {
    return (
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-muted rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
      {/* Clients Card */}
      <Card className="transition-all duration-300 hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Clientes</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{localStats.totalClients || 0}</div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              {localStats.activeClients || 0} activos
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {localStats.potentialClients || 0} potenciales
            </Badge>
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Tasa de conversión</span>
              <span>{conversionRate.toFixed(1)}%</span>
            </div>
            <Progress value={conversionRate} className="h-1" />
          </div>
        </CardContent>
      </Card>

      {/* Projects Card */}
      <Card className="transition-all duration-300 hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Proyectos</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{localStats.totalProjects || 0}</div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              {localStats.activeProjects || 0} activos
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {localStats.completedProjects || 0} completados
            </Badge>
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Tasa de finalización</span>
              <span>{projectCompletionRate.toFixed(1)}%</span>
            </div>
            <Progress value={projectCompletionRate} className="h-1" />
          </div>
        </CardContent>
      </Card>

      {/* Expenses Card */}
      <Card className="transition-all duration-300 hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gastos</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(localStats.totalExpenses || 0)}</div>
          <div className="mt-2">
            <Badge variant="outline" className="text-xs">
              Este mes: {formatCurrency(localStats.monthlyExpenses || 0)}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Gastos acumulados del periodo
          </p>
        </CardContent>
      </Card>

      {/* Pipeline Card */}
      <Card className="transition-all duration-300 hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pipeline</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(localStats.pipelineValue || 0)}</div>
          <div className="mt-2">
            <Badge variant="outline" className="text-xs">
              {localStats.potentialClients || 0} oportunidades
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Valor potencial de ventas
          </p>
        </CardContent>
      </Card>
    </div>
  );
}