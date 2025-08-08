import React from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useCalendarNotifications } from '@/hooks/useCalendarNotifications';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export const NotificationBadge: React.FC = () => {
  const { 
    notifications, 
    hasNewNotifications, 
    notificationCount, 
    markAsRead,
    clearNotifications 
  } = useCalendarNotifications();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          onClick={markAsRead}
        >
          <Bell className="h-5 w-5" />
          {hasNewNotifications && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {notificationCount > 9 ? '9+' : notificationCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Invitaciones de Calendario</span>
          {notifications.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearNotifications}
              className="text-xs h-auto p-1"
            >
              Limpiar
            </Button>
          )}
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {notifications.length === 0 ? (
          <DropdownMenuItem disabled>
            No hay invitaciones pendientes
          </DropdownMenuItem>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem key={notification.id} className="flex-col items-start p-3">
              <div className="font-medium text-sm">
                {notification.event_title}
              </div>
              <div className="text-xs text-muted-foreground">
                Invitado por: {notification.inviter_name}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(notification.created_at), { 
                  addSuffix: true, 
                  locale: es 
                })}
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};