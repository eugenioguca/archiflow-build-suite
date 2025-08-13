import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, MessageSquare, CheckCircle2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationManager } from "@/hooks/useNotificationManager";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ModuleNotification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  source_module: string;
  target_module: string;
  client_id: string | null;
  user_id: string;
  is_read: boolean;
  created_at: string;
  client?: {
    full_name: string;
  };
}

interface ModuleNotificationsProps {
  module: "sales" | "design" | "construction";
  className?: string;
}

export function ModuleNotifications({ module, className }: ModuleNotificationsProps) {
  const { user } = useAuth();
  const { moduleNotifications } = useNotificationManager();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Get notifications for this module from the centralized manager
  const notifications = moduleNotifications[module] || [];

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('module_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      // The notification manager will update the state automatically via subscriptions
      toast.success("Notificación marcada como leída");
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error("Error al marcar como leída");
    }
  };

  const markAllAsRead = async () => {
    if (notifications.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('module_notifications')
        .update({ is_read: true })
        .eq('target_module', module)
        .eq('user_id', user?.id)
        .eq('is_read', false);

      if (error) throw error;

      // The notification manager will update the state automatically via subscriptions
      toast.success("Todas las notificaciones marcadas como leídas");
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error("Error al marcar todas como leídas");
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_chat_message':
      case 'new_team_message':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'new_chat_message':
      case 'new_team_message':
        return 'bg-blue-500';
      case 'payment_proof_uploaded':
        return 'bg-green-500';
      case 'appointment_scheduled':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const unreadCount = notifications.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn("relative", className)}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Notificaciones de {module.charAt(0).toUpperCase() + module.slice(1)}
              </CardTitle>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs h-auto p-1"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Marcar todas
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : unreadCount === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No hay notificaciones nuevas
              </div>
            ) : (
              <ScrollArea className="max-h-80">
                <div className="space-y-1 p-2">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className={cn(
                        "rounded-full p-2 flex-shrink-0",
                        getNotificationColor(notification.notification_type)
                      )}>
                        {getNotificationIcon(notification.notification_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {notification.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                            {notification.client && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Cliente: {notification.client.full_name}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(notification.created_at).toLocaleString()}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-1 flex-shrink-0"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}