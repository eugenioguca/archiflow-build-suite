import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building2, DollarSign, Camera, TrendingUp, AlertCircle, Calendar, FileText, BarChart3 } from 'lucide-react';
import { CalendarWidgetDashboard } from '@/components/dashboard/CalendarWidgetDashboard';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { PaymentNotifications } from '@/components/PaymentNotifications';


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
  pipelineValue?: number;
}

interface RecentActivity {
  id: string;
  type: 'client' | 'project' | 'expense' | 'photo';
  description: string;
  date: string;
  amount?: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
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
    pipelineValue: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    
    // Configurar actualización automática cada 5 minutos en lugar de 30 segundos
    const interval = setInterval(() => {
      // Solo actualizar si la página está visible para el usuario
      if (!document.hidden) {
        fetchDashboardData();
      }
    }, 300000); // 5 minutos
    
    // Limpiar interval al desmontar el componente
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      console.log('DEBUG: Starting dashboard data fetch...');
      
      // Solo mostrar loading en la primera carga inicial (cuando no hay datos y realmente estamos cargando)
      const hasData = stats.totalClients > 0 || stats.totalProjects > 0 || stats.totalExpenses > 0 || recentActivity.length > 0;
      if (!hasData && !loading) {
        setLoading(true);
      }
      
      // Fetch client projects data for pipeline calculation
      console.log('DEBUG: Fetching client_projects...');
      const { data: clientProjects, error: clientProjectsError } = await supabase.from('client_projects').select('status, budget');
      console.log('DEBUG: Client projects result:', { data: clientProjects, error: clientProjectsError, count: clientProjects?.length });
      
      const totalClients = clientProjects?.length || 0;
      const activeClients = clientProjects?.filter(c => c.status === 'active').length || 0;
      const potentialClients = clientProjects?.filter(c => c.status === 'potential').length || 0;

      // Fetch real projects data with budget for pipeline calculation
      const { data: projects } = await supabase.from('projects').select('status, name, created_at, progress_percentage, budget');
      const totalProjects = projects?.length || 0;
      const activeProjects = projects?.filter(p => ['construction', 'design', 'permits', 'planning'].includes(p.status)).length || 0;
      const completedProjects = projects?.filter(p => p.status === 'completed').length || 0;

      // Fetch real expenses data
      const { data: expenses } = await supabase.from('expenses').select('amount, created_at, description');
      const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      
      // Monthly expenses (current month)
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyExpenses = expenses?.filter(e => {
        if (!e.created_at) return false;
        const expenseDate = new Date(e.created_at);
        return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
      }).reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      // Photos functionality removed

      // Fetch real CRM activities for recent activity
      const { data: activities } = await supabase
        .from('crm_activities')
        .select('title, activity_type, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      // Income tracking removed

      // Calculate real pipeline value from potential client projects
      const realPipelineValue = clientProjects?.filter(c => c.status === 'potential').reduce((sum, c) => sum + (Number(c.budget) || 0), 0) || 0;
      const potentialProjectsBudgets = projects?.filter(p => p.status === 'planning').reduce((sum, p) => sum + (Number(p.budget) || 0), 0) || 0;
      const pipelineValue = realPipelineValue + potentialProjectsBudgets;

      setStats({
        totalClients,
        activeClients,
        potentialClients,
        totalProjects,
        activeProjects,
        completedProjects,
        totalExpenses,
        monthlyExpenses,
        totalPhotos: 0,
        recentPhotos: 0,
        pipelineValue,
      });

      // Create recent activity from real data only
      const activity: RecentActivity[] = [];

      // Add real activities if available
      if (activities && activities.length > 0) {
        activities.forEach((activity_item, index) => {
          activity.push({
            id: `activity-${index}`,
            type: 'client',
            description: activity_item.title,
            date: activity_item.created_at,
          });
        });
      }

      // Add real projects if available
      if (projects && projects.length > 0) {
        projects.slice(0, 2).forEach((project, index) => {
          activity.push({
            id: `project-${index}`,
            type: 'project',
            description: `Proyecto: ${project.name}`,
            date: project.created_at,
          });
        });
      }

      // Add real expenses if available
      if (expenses && expenses.length > 0) {
        expenses.slice(0, 2).forEach((expense, index) => {
          activity.push({
            id: `expense-${index}`,
            type: 'expense',
            description: `Gasto: ${expense.description}`,
            date: expense.created_at,
            amount: Number(expense.amount),
          });
        });
      }

      // Income tracking removed - no longer available

      // Sort by date and take latest 6
      activity.sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      setRecentActivity(activity.slice(0, 6));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Reset to empty state on error
      setStats({
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
        pipelineValue: 0,
      });
      setRecentActivity([]);
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
    if (!dateString) return 'Sin fecha';
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

  // Calculate conversion rate (cap at 100%)
  const conversionRate = Math.min(
    stats.totalClients > 0 ? (stats.activeClients / stats.totalClients) * 100 : 0,
    100
  );
  const projectCompletionRate = Math.min(
    stats.totalProjects > 0 ? (stats.completedProjects / stats.totalProjects) * 100 : 0,
    100
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground text-lg mt-2">
            Resumen ejecutivo de tu negocio
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="status-dot bg-success"></div>
          Sistema operativo
        </div>
      </div>

      {/* Métricas de Ventas y Avances de Proyectos */}
      <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="card-hover border-0 bg-gradient-to-br from-green-100/50 to-green-50/50 border-l-4 border-l-green-500 cursor-pointer glassmorphic-bg enhanced-hover" onClick={() => navigate('/sales')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium break-words">Pipeline de Ventas</CardTitle>
            <div className="p-1.5 sm:p-2 bg-green-500/20 rounded-lg">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl xl:text-3xl font-bold text-green-600 break-all">
              {formatCurrency(stats.pipelineValue || 0)} 
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.potentialClients} clientes potenciales
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover border-0 bg-gradient-to-br from-blue-100/50 to-blue-50/50 border-l-4 border-l-blue-500 cursor-pointer glassmorphic-bg enhanced-hover" onClick={() => navigate('/progress-overview')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium break-words">Proyectos Activos</CardTitle>
            <div className="p-1.5 sm:p-2 bg-blue-500/20 rounded-lg">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl xl:text-3xl font-bold text-blue-600">{stats.activeProjects}</div>
            <p className="text-xs text-muted-foreground mt-1 break-words">
              {stats.totalProjects > 0 ? `${stats.totalProjects} total` : 'Sin proyectos aún'}
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover border-0 bg-gradient-to-br from-purple-100/50 to-purple-50/50 border-l-4 border-l-purple-500 cursor-pointer glassmorphic-bg enhanced-hover" onClick={() => navigate('/sales')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium break-words">Clientes Potenciales</CardTitle>
            <div className="p-1.5 sm:p-2 bg-purple-500/20 rounded-lg">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl xl:text-3xl font-bold text-purple-600">{stats.potentialClients}</div>
            <p className="text-xs text-muted-foreground mt-1 break-words">
              {stats.totalClients > 0 ? 'En pipeline' : 'Sin clientes aún'}
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover border-0 bg-gradient-to-br from-orange-100/50 to-orange-50/50 border-l-4 border-l-orange-500 glassmorphic-bg enhanced-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium break-words">Tasa de Conversión</CardTitle>
            <div className="p-1.5 sm:p-2 bg-orange-500/20 rounded-lg">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-xl md:text-2xl xl:text-3xl font-bold text-orange-600">
              {stats.totalClients > 0 ? Math.round((stats.activeClients / stats.totalClients) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1 break-words">
              Conversión de clientes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secciones de información detallada */}
      <div className="grid gap-4 sm:gap-6 lg:gap-8 grid-cols-1 lg:grid-cols-3">
        <Card className="card-hover border-0 shadow-lg glassmorphic-bg enhanced-hover">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-primary/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              Métricas de Negocio
            </CardTitle>
            <CardDescription className="text-base">
              Indicadores clave de rendimiento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Conversión de Clientes</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-orange">{conversionRate.toFixed(1)}%</span>
                </div>
              </div>
              <div className="relative overflow-hidden">
                <Progress value={conversionRate} className="h-3" />
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-orange">{stats.activeClients}</span> de {stats.totalClients} clientes convertidos
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Proyectos Completados</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-success">{projectCompletionRate.toFixed(1)}%</span>
                </div>
              </div>
              <div className="relative overflow-hidden">
                <Progress value={projectCompletionRate} className="h-3" />
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-success">{stats.completedProjects}</span> de {stats.totalProjects} proyectos finalizados
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-6 border-t">
              <div className="text-center p-4 bg-orange/5 rounded-lg">
                <div className="text-3xl font-bold text-orange">{stats.totalClients}</div>
                <p className="text-sm text-muted-foreground font-medium">Total Clientes</p>
              </div>
              <div className="text-center p-4 bg-success/5 rounded-lg">
                <div className="text-3xl font-bold text-success">{stats.totalProjects}</div>
                <p className="text-sm text-muted-foreground font-medium">Total Proyectos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover border-0 shadow-lg glassmorphic-bg enhanced-hover">
          <CardHeader className="bg-gradient-to-r from-purple/5 to-pink/5 rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-purple/20 rounded-lg">
                <Calendar className="h-6 w-6 text-purple" />
              </div>
              Actividad Reciente
            </CardTitle>
            <CardDescription className="text-base">
              Últimas acciones en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={activity.id} className="flex items-start gap-4 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className={`p-2 rounded-lg ${
                      activity.type === 'client' ? 'bg-orange/20' :
                      activity.type === 'project' ? 'bg-success/20' :
                      activity.type === 'expense' ? 'bg-info/20' :
                      'bg-pink/20'
                    }`}>
                      <div className={
                        activity.type === 'client' ? 'text-orange' :
                        activity.type === 'project' ? 'text-success' :
                        activity.type === 'expense' ? 'text-info' :
                        'text-pink'
                      }>
                        {getActivityIcon(activity.type)}
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {formatDate(activity.date)} • <span className="font-medium">EG</span>
                        </p>
                        {activity.amount && (
                          <Badge variant="outline" className="bg-info/10 text-info border-info/20">
                            {formatCurrency(activity.amount)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="p-4 bg-muted/20 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">No hay actividad reciente</p>
                <p className="text-sm text-muted-foreground">Empieza creando clientes y proyectos</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-hover border-0 shadow-lg glassmorphic-bg enhanced-hover">
          <CardHeader className="bg-gradient-to-r from-info/5 to-primary/5 rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-info/20 rounded-lg">
                <Calendar className="h-6 w-6 text-info" />
              </div>
              Calendario
            </CardTitle>
            <CardDescription className="text-base">
              Tus próximos eventos y recordatorios
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <CalendarWidgetDashboard />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}