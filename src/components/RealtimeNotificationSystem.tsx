import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Bell, Check, Clock, AlertCircle, DollarSign, FileText, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface RealtimeNotification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  metadata?: any;
}

interface RealtimeNotificationSystemProps {
  clientId: string;
  projectId: string;
}

export const RealtimeNotificationSystem = ({ clientId, projectId }: RealtimeNotificationSystemProps) => {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchNotifications();
    setupRealtimeSubscriptions();
  }, [clientId, projectId]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('client_portal_notifications')
        .select('*')
        .eq('client_id', clientId)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Notifications subscription
    const notificationChannel = supabase
      .channel('client-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'client_portal_notifications',
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          const newNotification = payload.new as RealtimeNotification;
          
          setNotifications(prev => [newNotification, ...prev.slice(0, 9)]);
          setUnreadCount(prev => prev + 1);
          
          // Show toast notification
          toast({
            title: newNotification.title,
            description: newNotification.message,
            duration: 5000,
          });
        }
      )
      .subscribe();

    // Payment installments subscription for real-time status updates
    const paymentsChannel = supabase
      .channel('payment-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payment_installments',
        },
        (payload) => {
          const updated = payload.new;
          const old = payload.old;
          
          if (old.status !== updated.status) {
            // Create instant notification for payment status change
            const statusText = updated.status === 'paid' ? 'Pagada' : 
                              updated.status === 'overdue' ? 'Vencida' : 'Pendiente';
            
            toast({
              title: "Estado de pago actualizado",
              description: `Parcialidad #${updated.installment_number} ahora está: ${statusText}`,
              duration: 6000,
            });
          }
        }
      )
      .subscribe();

    // Electronic invoices subscription
    const invoicesChannel = supabase
      .channel('invoice-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'electronic_invoices',
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          const newInvoice = payload.new;
          
          toast({
            title: "Nueva factura disponible",
            description: `Se ha generado la factura ${newInvoice.serie}-${newInvoice.folio}`,
            duration: 5000,
          });
        }
      )
      .subscribe();

    // Payment proof status updates
    const proofUpdatesChannel = supabase
      .channel('proof-status-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'client_payment_proofs',
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          const updated = payload.new;
          const old = payload.old;
          
          if (old.status !== updated.status) {
            const statusText = updated.status === 'approved' ? 'aprobado' : 'rechazado';
            const variant = updated.status === 'approved' ? 'default' : 'destructive';
            
            toast({
              title: `Comprobante ${statusText}`,
              description: `Su comprobante de pago ha sido ${statusText}`,
              variant: variant === 'destructive' ? 'destructive' : undefined,
              duration: 6000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationChannel);
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(invoicesChannel);
      supabase.removeChannel(proofUpdatesChannel);
    };
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('client_portal_notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment_status_update':
        return <DollarSign className="h-4 w-4 text-green-600" />;
      case 'new_document':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'new_chat_message':
        return <MessageCircle className="h-4 w-4 text-purple-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatNotificationTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Ahora';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return format(date, 'dd/MM', { locale: es });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificaciones en Tiempo Real
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay notificaciones</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                !notification.read ? 'bg-primary/5 border-primary/20' : 'bg-background'
              }`}
              onClick={() => !notification.read && markAsRead(notification.id)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {getNotificationIcon(notification.notification_type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium truncate">
                      {notification.title}
                    </h4>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">
                        {formatNotificationTime(notification.created_at)}
                      </span>
                      {!notification.read ? (
                        <div className="w-2 h-2 bg-primary rounded-full ml-1"></div>
                      ) : (
                        <Check className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-1">
                    {notification.message}
                  </p>
                  
                  {notification.metadata && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {notification.metadata.amount && (
                        <span>Monto: ${notification.metadata.amount}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};