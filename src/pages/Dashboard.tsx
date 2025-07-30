import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building2, DollarSign, Camera, TrendingUp, AlertCircle, Calendar, FileText, BarChart3 } from 'lucide-react';
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
      // Mock data para demostración - mezclando datos reales con mock
      
      // Datos de ventas (mock)
      const mockSalesData = {
        totalPipeline: 3700000,
        activeLeads: 8,
        negotiating: 3,
        conversionRate: 68,
        recentLeads: [
          { name: "Empresa ABC", status: "interested", value: 500000, probability: 70 },
          { name: "Construcciones XYZ", status: "proposal_sent", value: 1200000, probability: 85 },
          { name: "Desarrollos Inmobiliarios", status: "negotiating", value: 2000000, probability: 90 }
        ]
      };

      // Datos de proyectos (mock)
      const mockProjectsData = {
        activeProjects: 5,
        completedThisMonth: 2,
        totalProgress: 78,
        projects: [
          { name: "Casa Moderna Satelite", progress: 75, location: "Naucalpan" },
          { name: "Oficinas Corporativas", progress: 45, location: "Polanco" },
          { name: "Residencial Los Pinos", progress: 90, location: "Santa Fe" }
        ]
      };

      // Fetch clients data (real)
      const { data: clients } = await supabase.from('clients').select('status');
      const totalClients = clients?.length || 15; // mock fallback
      const activeClients = clients?.filter(c => c.status === 'active').length || 10;
      const potentialClients = clients?.filter(c => c.status === 'potential').length || mockSalesData.activeLeads;

      // Fetch projects data (real)
      const { data: projects } = await supabase.from('projects').select('status, name, created_at');
      const totalProjects = projects?.length || mockProjectsData.activeProjects + 3;
      const activeProjects = projects?.filter(p => ['construction', 'design', 'permits'].includes(p.status)).length || mockProjectsData.activeProjects;
      const completedProjects = projects?.filter(p => p.status === 'completed').length || 3;

      // Fetch expenses data (real)
      const { data: expenses } = await supabase.from('expenses').select('amount, created_at, description');
      const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 250000;
      
      // Monthly expenses (current month)
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyExpenses = expenses?.filter(e => {
        const expenseDate = new Date(e.created_at);
        return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
      }).reduce((sum, e) => sum + e.amount, 0) || 45000;

      // Fetch photos data (real)
      const { data: photos } = await supabase.from('progress_photos').select('taken_at');
      const totalPhotos = photos?.length || 120;
      
      // Recent photos (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentPhotos = photos?.filter(p => new Date(p.taken_at) > sevenDaysAgo).length || 15;

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

      // Create recent activity from different sources (mock + real)
      const activity: RecentActivity[] = [
        {
          id: 'sales-1',
          type: 'client',
          description: 'Nueva propuesta enviada a Empresa ABC',
          date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          amount: 500000,
        },
        {
          id: 'project-1',
          type: 'project',
          description: 'Fase de acabados iniciada - Casa Moderna Satelite',
          date: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        },
        {
          id: 'sales-2',
          type: 'client',
          description: 'Llamada de seguimiento con Construcciones XYZ',
          date: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        },
        {
          id: 'project-2',
          type: 'project',
          description: 'Progreso del 90% en Residencial Los Pinos',
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        },
        {
          id: 'expense-1',
          type: 'expense',
          description: 'Compra de materiales para construcción',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
          amount: 25000,
        }
      ];

      // Add real projects if available
      if (projects) {
        projects.slice(0, 2).forEach((project, index) => {
          activity.push({
            id: `real-project-${index}`,
            type: 'project',
            description: `Actualización de proyecto: ${project.name}`,
            date: project.created_at,
          });
        });
      }

      // Add real expenses if available
      if (expenses) {
        expenses.slice(0, 2).forEach((expense, index) => {
          activity.push({
            id: `real-expense-${index}`,
            type: 'expense',
            description: `Gasto registrado: ${expense.description}`,
            date: expense.created_at,
            amount: expense.amount,
          });
        });
      }

      // Sort by date and take latest 6
      activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentActivity(activity.slice(0, 6));

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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-hover border-0 bg-gradient-to-br from-green-100/50 to-green-50/50 border-l-4 border-l-green-500 cursor-pointer glass-card floating-effect" onClick={() => window.location.href = '/sales'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline de Ventas</CardTitle>
            <div className="p-2 bg-green-500/20 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">$3.7M</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-600 font-medium">+22%</span> este mes
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover border-0 bg-gradient-to-br from-blue-100/50 to-blue-50/50 border-l-4 border-l-blue-500 cursor-pointer glass-card floating-effect" onClick={() => window.location.href = '/progress-overview'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proyectos Activos</CardTitle>
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.activeProjects}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-blue-600 font-medium">78%</span> progreso promedio
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover border-0 bg-gradient-to-br from-purple-100/50 to-purple-50/50 border-l-4 border-l-purple-500 cursor-pointer glass-card floating-effect" onClick={() => window.location.href = '/sales'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Potenciales</CardTitle>
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{stats.potentialClients}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-purple-600 font-medium">85%</span> probabilidad promedio
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover border-0 bg-gradient-to-br from-orange-100/50 to-orange-50/50 border-l-4 border-l-orange-500 glass-card floating-effect">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Conversión</CardTitle>
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <BarChart3 className="h-5 w-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">68%</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-orange-600 font-medium">+5%</span> vs mes anterior
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secciones de información detallada */}
      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="card-hover border-0 shadow-lg glass-card">
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

        <Card className="card-hover border-0 shadow-lg glass-card">
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
      </div>
    </div>
  );
}