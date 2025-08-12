import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building2, DollarSign, Camera, TrendingUp, AlertCircle, Calendar, FileText, BarChart3 } from 'lucide-react';
import { CalendarWidgetDashboard } from '@/components/dashboard/CalendarWidgetDashboard';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { PaymentNotifications } from '@/components/PaymentNotifications';
import CorporateDashboard from './CorporateDashboard';


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

export { default as CorporateDashboard } from './CorporateDashboard';

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

  // Use the new corporate dashboard instead
  return <CorporateDashboard />;
}