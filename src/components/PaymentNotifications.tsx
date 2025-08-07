import React, { useState, useEffect } from 'react';
import { Bell, DollarSign, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface PaymentNotification {
  id: string;
  type: 'payment_due' | 'payment_overdue' | 'payment_received' | 'plan_approved';
  title: string;
  message: string;
  installment_id?: string;
  plan_id?: string;
  client_name?: string;
  project_name?: string;
  amount?: number;
  due_date?: string;
  created_at: string;
  read: boolean;
}

interface PaymentNotificationsProps {
  compact?: boolean;
  maxItems?: number;
}

export const PaymentNotifications: React.FC<PaymentNotificationsProps> = ({
  compact = false,
  maxItems = 10
}) => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<PaymentNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (profile?.role === 'admin' || profile?.role === 'employee') {
      fetchPaymentNotifications();
      
      // Set up real-time subscription for payment notifications
      const subscription = supabase
        .channel('payment_notifications')
        .on('postgres_changes', 
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'payment_installments' 
          }, 
          () => {
            fetchPaymentNotifications();
          }
        )
        .on('postgres_changes', 
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'payment_plans' 
          }, 
          () => {
            fetchPaymentNotifications();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [profile]);

  const fetchPaymentNotifications = async () => {
    try {
      const today = new Date();
      const notifications: PaymentNotification[] = [];

      // Get overdue installments
      const { data: overdueInstallments } = await supabase
        .from('payment_installments')
        .select(`
          *,
          payment_plan:payment_plans(
            client_project:client_projects(
              project_name,
              client:clients(full_name)
            )
          )
        `)
        .eq('status', 'pending')
        .lt('due_date', today.toISOString().split('T')[0])
        .order('due_date', { ascending: true });

      overdueInstallments?.forEach(installment => {
        const clientProject = installment.payment_plan?.client_project;
        notifications.push({
          id: `overdue-${installment.id}`,
          type: 'payment_overdue',
          title: 'Pago Vencido',
          message: `Parcialidad #${installment.installment_number} vencida`,
          installment_id: installment.id,
          plan_id: installment.payment_plan_id,
          client_name: clientProject?.client?.full_name,
          project_name: clientProject?.project_name,
          amount: installment.amount,
          due_date: installment.due_date,
          created_at: installment.due_date,
          read: false
        });
      });

      // Get installments due in next 7 days
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);

      const { data: upcomingInstallments } = await supabase
        .from('payment_installments')
        .select(`
          *,
          payment_plan:payment_plans(
            client_project:client_projects(
              project_name,
              client:clients(full_name)
            )
          )
        `)
        .eq('status', 'pending')
        .gte('due_date', today.toISOString().split('T')[0])
        .lte('due_date', nextWeek.toISOString().split('T')[0])
        .order('due_date', { ascending: true });

      upcomingInstallments?.forEach(installment => {
        const clientProject = installment.payment_plan?.client_project;
        notifications.push({
          id: `due-${installment.id}`,
          type: 'payment_due',
          title: 'Pago Próximo',
          message: `Parcialidad #${installment.installment_number} vence pronto`,
          installment_id: installment.id,
          plan_id: installment.payment_plan_id,
          client_name: clientProject?.client?.full_name,
          project_name: clientProject?.project_name,
          amount: installment.amount,
          due_date: installment.due_date,
          created_at: installment.due_date,
          read: false
        });
      });

      // Get recently paid installments (last 7 days)
      const lastWeek = new Date();
      lastWeek.setDate(today.getDate() - 7);

      const { data: recentPayments } = await supabase
        .from('payment_installments')
        .select(`
          *,
          payment_plan:payment_plans(
            client_project:client_projects(
              project_name,
              client:clients(full_name)
            )
          )
        `)
        .eq('status', 'paid')
        .gte('paid_date', lastWeek.toISOString())
        .order('paid_date', { ascending: false });

      recentPayments?.forEach(installment => {
        const clientProject = installment.payment_plan?.client_project;
        notifications.push({
          id: `paid-${installment.id}`,
          type: 'payment_received',
          title: 'Pago Recibido',
          message: `Parcialidad #${installment.installment_number} pagada`,
          installment_id: installment.id,
          plan_id: installment.payment_plan_id,
          client_name: clientProject?.client?.full_name,
          project_name: clientProject?.project_name,
          amount: installment.amount,
          due_date: installment.due_date,
          created_at: installment.paid_date || installment.updated_at,
          read: false
        });
      });

      // Get recently approved payment plans (last 7 days)
      const { data: approvedPlans } = await supabase
        .from('payment_plans')
        .select(`
          *,
          client_project:client_projects(
            project_name,
            client:clients(full_name)
          )
        `)
        .eq('status', 'approved')
        .gte('approved_at', lastWeek.toISOString())
        .order('approved_at', { ascending: false });

      approvedPlans?.forEach(plan => {
        const clientProject = plan.client_project;
        notifications.push({
          id: `approved-${plan.id}`,
          type: 'plan_approved',
          title: 'Plan Aprobado',
          message: `Plan "${plan.plan_name}" aprobado`,
          plan_id: plan.id,
          client_name: clientProject?.client?.full_name,
          project_name: clientProject?.project_name,
          amount: plan.total_amount,
          created_at: plan.approved_at || plan.updated_at,
          read: false
        });
      });

      // Sort by priority (overdue first, then by date)
      const sortedNotifications = notifications
        .sort((a, b) => {
          if (a.type === 'payment_overdue' && b.type !== 'payment_overdue') return -1;
          if (b.type === 'payment_overdue' && a.type !== 'payment_overdue') return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        })
        .slice(0, maxItems);

      setNotifications(sortedNotifications);
      setUnreadCount(sortedNotifications.filter(n => !n.read).length);

    } catch (error) {
      console.error('Error fetching payment notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment_overdue':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'payment_due':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'payment_received':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'plan_approved':
        return <DollarSign className="h-4 w-4 text-primary" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationVariant = (type: string) => {
    switch (type) {
      case 'payment_overdue':
        return 'destructive' as const;
      case 'payment_due':
        return 'secondary' as const;
      case 'payment_received':
        return 'default' as const;
      case 'plan_approved':
        return 'default' as const;
      default:
        return 'outline' as const;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  if (loading) {
    return (
      <Card className={compact ? "h-64" : ""}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificaciones de Pago
            </CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="rounded-full">
                {unreadCount}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48">
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hay notificaciones de pago</p>
                </div>
              ) : (
                notifications.map((notification, index) => (
                  <div key={notification.id}>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{notification.title}</p>
                          <Badge variant={getNotificationVariant(notification.type)} className="text-xs">
                            {notification.type === 'payment_overdue' && 'Vencido'}
                            {notification.type === 'payment_due' && 'Próximo'}
                            {notification.type === 'payment_received' && 'Pagado'}
                            {notification.type === 'plan_approved' && 'Aprobado'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{notification.message}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs font-medium">{notification.client_name}</p>
                          {notification.amount && (
                            <p className="text-xs font-semibold text-primary">
                              {formatCurrency(notification.amount)}
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), { 
                            addSuffix: true, 
                            locale: es 
                          })}
                        </p>
                      </div>
                    </div>
                    {index < notifications.length - 1 && <Separator className="mt-3" />}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificaciones de Pagos
          </CardTitle>
          {unreadCount > 0 && (
            <Badge variant="destructive">
              {unreadCount} sin leer
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay notificaciones de pago</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <Card key={notification.id} className="border-l-4" style={{
                borderLeftColor: notification.type === 'payment_overdue' ? 'hsl(var(--destructive))' :
                                notification.type === 'payment_due' ? 'hsl(var(--warning))' :
                                notification.type === 'payment_received' ? 'hsl(var(--success))' :
                                'hsl(var(--primary))'
              }}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getNotificationIcon(notification.type)}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{notification.title}</h4>
                          <Badge variant={getNotificationVariant(notification.type)} className="text-xs">
                            {notification.type === 'payment_overdue' && 'Vencido'}
                            {notification.type === 'payment_due' && 'Próximo'}
                            {notification.type === 'payment_received' && 'Pagado'}
                            {notification.type === 'plan_approved' && 'Aprobado'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="font-medium">{notification.client_name}</p>
                            <p className="text-muted-foreground">{notification.project_name}</p>
                          </div>
                          {notification.amount && (
                            <div className="text-right">
                              <p className="font-semibold text-lg text-primary">
                                {formatCurrency(notification.amount)}
                              </p>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(new Date(notification.created_at), { 
                            addSuffix: true, 
                            locale: es 
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};