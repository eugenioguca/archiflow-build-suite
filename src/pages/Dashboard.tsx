import { useEffect } from 'react';
import CorporateDashboard from './CorporateDashboard';
import { useNotificationManager } from '@/hooks/useNotificationManager';


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
  const { loading } = useNotificationManager();

  // Initialize the notification manager on dashboard load
  useEffect(() => {
    // The hook handles all initialization and subscriptions
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Use the new corporate dashboard with push-based updates
  return <CorporateDashboard />;
}