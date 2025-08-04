import { Card, CardContent } from '@/components/ui/card';
import { 
  Users, 
  UserCheck, 
  Shield, 
  Building, 
  TrendingUp,
  Clock
} from 'lucide-react';

interface UserProfile {
  id: string;
  role: 'admin' | 'employee' | 'client';
  approval_status: string;
  department_enum?: string;
  position_enum?: string;
  created_at: string;
}

interface UserStatsCardsProps {
  users: UserProfile[];
}

export function UserStatsCards({ users }: UserStatsCardsProps) {
  const totalUsers = users.length;
  const adminCount = users.filter(u => u.role === 'admin').length;
  const employeeCount = users.filter(u => u.role === 'employee').length;
  const clientCount = users.filter(u => u.role === 'client').length;
  const approvedCount = users.filter(u => u.approval_status === 'approved').length;
  const pendingCount = users.filter(u => u.approval_status === 'pending').length;
  
  // Empleados configurados (con departamento y posición)
  const configuredEmployees = users.filter(u => 
    u.role === 'employee' && u.department_enum && u.position_enum
  ).length;

  // Nuevos usuarios en los últimos 7 días
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const newUsersThisWeek = users.filter(u => 
    new Date(u.created_at) > weekAgo
  ).length;

  const statsCards = [
    {
      title: 'Total Usuarios',
      value: totalUsers,
      icon: Users,
      description: 'Usuarios registrados',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      title: 'Empleados',
      value: employeeCount,
      icon: Building,
      description: `${configuredEmployees} configurados`,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      title: 'Administradores',
      value: adminCount,
      icon: Shield,
      description: 'Con acceso completo',
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
    },
    {
      title: 'Clientes',
      value: clientCount,
      icon: UserCheck,
      description: 'Acceso portal',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      title: 'Aprobados',
      value: approvedCount,
      icon: UserCheck,
      description: `${pendingCount} pendientes`,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      title: 'Nuevos (7d)',
      value: newUsersThisWeek,
      icon: TrendingUp,
      description: 'Esta semana',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {statsCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="border-border/50 hover:border-border transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </div>
                <div className={`${stat.bgColor} ${stat.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}