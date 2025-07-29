import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building2, DollarSign, Camera, TrendingUp, AlertCircle, Calendar, FileText } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  totalClients: number;
  activeClients: number;
  potentialClients: number;
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalExpenses: number;
  monthlyExpenses: number;
  totalPhotos: number;
  recentPhotos: number;
}

interface RecentActivity {
  id: string;
  type: 'client' | 'project' | 'expense' | 'photo';
  description: string;
  date: string;
  amount?: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeClients: 0,
    potentialClients: 0,
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalExpenses: 0,
    monthlyExpenses: 0,
    totalPhotos: 0,
    recentPhotos: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch clients data
      const { data: clients } = await supabase.from('clients').select('status');
      const totalClients = clients?.length || 0;
      const activeClients = clients?.filter(c => c.status === 'active').length || 0;
      const potentialClients = clients?.filter(c => c.status === 'potential').length || 0;

      // Fetch projects data
      const { data: projects } = await supabase.from('projects').select('status, name, created_at');
      const totalProjects = projects?.length || 0;
      const activeProjects = projects?.filter(p => ['construction', 'design', 'permits'].includes(p.status)).length || 0;
      const completedProjects = projects?.filter(p => p.status === 'completed').length || 0;

      // Fetch expenses data
      const { data: expenses } = await supabase.from('expenses').select('amount, created_at, description');
      const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
      
      // Monthly expenses (current month)
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyExpenses = expenses?.filter(e => {
        const expenseDate = new Date(e.created_at);
        return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
      }).reduce((sum, e) => sum + e.amount, 0) || 0;

      // Fetch photos data
      const { data: photos } = await supabase.from('progress_photos').select('taken_at');
      const totalPhotos = photos?.length || 0;
      
      // Recent photos (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentPhotos = photos?.filter(p => new Date(p.taken_at) > sevenDaysAgo).length || 0;

      setStats({
        totalClients,
        activeClients,
        potentialClients,
        totalProjects,
        activeProjects,
        completedProjects,
        totalExpenses,
        monthlyExpenses,
        totalPhotos,
        recentPhotos,
      });

      // Create recent activity from different sources
      const activity: RecentActivity[] = [];

      // Recent projects
      if (projects) {
        projects.slice(0, 3).forEach(project => {
          activity.push({
            id: `project-${project.name}`,
            type: 'project',
            description: `Nuevo proyecto: ${project.name}`,
            date: project.created_at,
          });
        });
      }

      // Recent expenses
      if (expenses) {
        expenses.slice(0, 3).forEach(expense => {
          activity.push({
            id: `expense-${expense.description}`,
            type: 'expense',
            description: `Gasto registrado: ${expense.description}`,
            date: expense.created_at,
            amount: expense.amount,
          });
        });
      }

      // Sort by date and take latest 5
      activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentActivity(activity.slice(0, 5));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'client': return <Users className="h-4 w-4" />;
      case 'project': return <Building2 className="h-4 w-4" />;
      case 'expense': return <DollarSign className="h-4 w-4" />;
      case 'photo': return <Camera className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  // Calculate conversion rate
  const conversionRate = stats.totalClients > 0 ? (stats.activeClients / stats.totalClients) * 100 : 0;
  const projectCompletionRate = stats.totalProjects > 0 ? (stats.completedProjects / stats.totalProjects) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Resumen general del CRM</p>
      </div>

      {/* Tarjetas de estadísticas principales */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeClients}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{stats.potentialClients}</span> potenciales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proyectos en Curso</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProjects}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-blue-600">{stats.completedProjects}</span> completados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos del Mes</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.monthlyExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              Total: {formatCurrency(stats.totalExpenses)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fotos de Avance</CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPhotos}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{stats.recentPhotos}</span> esta semana
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secciones de información detallada */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Métricas de Negocio
            </CardTitle>
            <CardDescription>
              Indicadores clave de rendimiento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Conversión de Clientes</span>
                <span className="font-medium">{conversionRate.toFixed(1)}%</span>
              </div>
              <Progress value={conversionRate} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {stats.activeClients} de {stats.totalClients} clientes convertidos
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Proyectos Completados</span>
                <span className="font-medium">{projectCompletionRate.toFixed(1)}%</span>
              </div>
              <Progress value={projectCompletionRate} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {stats.completedProjects} de {stats.totalProjects} proyectos finalizados
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.totalClients}</div>
                <p className="text-xs text-muted-foreground">Total Clientes</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalProjects}</div>
                <p className="text-xs text-muted-foreground">Total Proyectos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Actividad Reciente
            </CardTitle>
            <CardDescription>
              Últimas acciones en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {formatDate(activity.date)}
                        </p>
                        {activity.amount && (
                          <Badge variant="outline">
                            {formatCurrency(activity.amount)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay actividad reciente</p>
                <p className="text-sm">Empieza creando clientes y proyectos</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}