import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Bell,
  Check,
  CheckCheck,
  Calendar,
  FileText,
  CreditCard,
  Construction,
  AlertCircle,
  Info,
  CheckCircle,
  X
} from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  read: boolean;
  created_at: string;
  metadata?: any;
}

interface ClientNotificationsPanelProps {
  clientId: string;
  projectId?: string;
}

export const ClientNotificationsPanel: React.FC<ClientNotificationsPanelProps> = ({
  clientId,
  projectId
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('unread');
  const { toast } = useToast();

  useEffect(() => {
    fetchNotifications();
  }, [clientId, projectId]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('client_portal_notifications')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las notificaciones',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('client_portal_notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );

      toast({
        title: 'Notificación marcada como leída',
        description: 'La notificación se marcó correctamente'
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: 'Error',
        description: 'No se pudo marcar la notificación como leída',
        variant: 'destructive'
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      let query = supabase
        .from('client_portal_notifications')
        .update({ read: true })
        .eq('client_id', clientId)
        .eq('read', false);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { error } = await query;

      if (error) throw error;

      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );

      toast({
        title: 'Todas las notificaciones marcadas como leídas',
        description: 'Se marcaron correctamente todas las notificaciones'
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron marcar todas las notificaciones como leídas',
        variant: 'destructive'
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment_reminder':
      case 'payment_received':
        return <CreditCard className="h-4 w-4" />;
      case 'design_update':
      case 'design_completed':
        return <FileText className="h-4 w-4" />;
      case 'construction_update':
      case 'construction_milestone':
        return <Construction className="h-4 w-4" />;
      case 'appointment_scheduled':
      case 'appointment_reminder':
        return <Calendar className="h-4 w-4" />;
      case 'document_uploaded':
      case 'document_required':
        return <FileText className="h-4 w-4" />;
      case 'project_status_change':
        return <Info className="h-4 w-4" />;
      case 'milestone_completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'urgent':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationBadge = (type: string) => {
    const typeConfig = {
      payment_reminder: { label: 'Pago', variant: 'destructive' as const },
      payment_received: { label: 'Pago', variant: 'default' as const },
      design_update: { label: 'Diseño', variant: 'secondary' as const },
      design_completed: { label: 'Diseño', variant: 'default' as const },
      construction_update: { label: 'Construcción', variant: 'secondary' as const },
      construction_milestone: { label: 'Construcción', variant: 'default' as const },
      appointment_scheduled: { label: 'Cita', variant: 'outline' as const },
      appointment_reminder: { label: 'Recordatorio', variant: 'destructive' as const },
      document_uploaded: { label: 'Documento', variant: 'default' as const },
      document_required: { label: 'Documento', variant: 'destructive' as const },
      project_status_change: { label: 'Proyecto', variant: 'secondary' as const },
      milestone_completed: { label: 'Hito', variant: 'default' as const },
      urgent: { label: 'Urgente', variant: 'destructive' as const }
    };

    const config = typeConfig[type as keyof typeof typeConfig] || 
                  { label: 'General', variant: 'outline' as const };

    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Hoy';
    } else if (diffDays === 1) {
      return 'Ayer';
    } else if (diffDays < 7) {
      return `Hace ${diffDays} días`;
    } else {
      return date.toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificaciones
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant={filter === 'unread' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter('unread')}
                className="rounded-none text-xs h-8"
              >
                No leídas
              </Button>
              <Button
                variant={filter === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter('all')}
                className="rounded-none text-xs h-8"
              >
                Todas
              </Button>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs h-8"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Marcar todas
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="font-medium">
              {filter === 'unread' ? 'No hay notificaciones pendientes' : 'No hay notificaciones'}
            </p>
            <p className="text-sm">
              {filter === 'unread' 
                ? 'Todas las notificaciones están al día' 
                : 'Las notificaciones aparecerán aquí'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border transition-colors ${
                  notification.read 
                    ? 'bg-background hover:bg-muted/50' 
                    : 'bg-muted/50 hover:bg-muted border-primary/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-full ${notification.read ? 'bg-muted' : 'bg-primary/10'}`}>
                      {getNotificationIcon(notification.notification_type)}
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className={`font-medium ${!notification.read ? 'font-semibold' : ''}`}>
                          {notification.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          {getNotificationBadge(notification.notification_type)}
                          {!notification.read && (
                            <div className="h-2 w-2 bg-primary rounded-full"></div>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(notification.created_at)}
                        </span>
                        
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                            className="text-xs h-7"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Marcar leída
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};