import React, { useState } from 'react';
import { Bell, MessageCircle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useChatNotifications } from '@/hooks/useChatNotifications';
import { useNavigate } from 'react-router-dom';

export function ChatNotificationBell() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useChatNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    setIsOpen(false);
    
    // Navigate to the appropriate module based on project status
    if (notification.projectId) {
      // Determine which module to navigate to based on project data
      // For now, navigate to sales module and pass project ID
      navigate(`/sales?project=${notification.projectId}`);
    }
  };

  const handleMarkAllRead = () => {
    markAllAsRead();
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-9 w-9 rounded-full"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <>
              {/* Red dot indicator */}
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full animate-pulse" />
              {/* Badge with count */}
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-80 max-h-96"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificaciones de Chat</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <Eye className="h-3 w-3 mr-1" />
              Marcar todas
            </Button>
          )}
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay notificaciones de chat</p>
          </div>
        ) : (
          <ScrollArea className="max-h-64">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`p-3 cursor-pointer ${
                  !notification.isRead ? 'bg-primary/5' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3 w-full">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={notification.senderAvatar} />
                    <AvatarFallback>
                      {notification.senderName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium truncate">
                        {notification.senderName}
                      </p>
                      {!notification.isRead && (
                        <div className="h-2 w-2 bg-primary rounded-full flex-shrink-0" />
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-1">
                      {notification.projectName}
                    </p>
                    
                    <p className="text-sm text-foreground line-clamp-2 mb-1">
                      {notification.content}
                    </p>
                    
                    <p className="text-xs text-muted-foreground">
                      {new Date(notification.timestamp).toLocaleDateString()} {' '}
                      {new Date(notification.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}