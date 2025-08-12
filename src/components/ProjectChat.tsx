import React, { useState, useEffect } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Send, MessageCircle, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useProjectChat, type ChatMessage } from '@/hooks/useProjectChat';
import { useChatNotificationSound } from '@/components/ChatNotificationSound';

interface ProjectChatProps {
  projectId: string;
  projectName: string;
  className?: string;
  showHeader?: boolean;
  height?: string;
}

export const ProjectChat: React.FC<ProjectChatProps> = ({
  projectId,
  projectName,
  className = "",
  showHeader = true,
  height = "h-96"
}) => {
  const { toast } = useToast();
  const [messageText, setMessageText] = useState('');
  const { playNotificationSound } = useChatNotificationSound({
    enabled: true,
    soundType: 'soft',
    volume: 0.7
  });

  // Validar que el projectId esté presente
  if (!projectId) {
    return (
      <div className={`flex items-center justify-center bg-background border border-border rounded-lg ${height} ${className}`}>
        <div className="text-center text-muted-foreground">
          <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>ID de proyecto no válido</p>
        </div>
      </div>
    );
  }

  const {
    messages,
    loading,
    sending,
    unreadCount,
    sendMessage,
    markMessagesAsRead,
    messagesEndRef,
    getUserInfo
  } = useProjectChat({
    projectId,
    onNewMessage: (message: ChatMessage) => {
      // Solo reproducir sonido si no es mensaje propio
      const userInfo = getUserInfo();
      if (userInfo && message.sender_id !== userInfo.userId) {
        playNotificationSound();
        
        // Mostrar notificación toast
        toast({
          title: `💬 Nuevo mensaje de ${message.sender_name}`,
          description: message.message.length > 50 
            ? `${message.message.substring(0, 50)}...` 
            : message.message,
          duration: 4000,
        });
      }
    }
  });

  // Manejar envío de mensaje
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageText.trim() || sending) return;

    const success = await sendMessage(messageText);
    
    if (success) {
      setMessageText('');
    } else {
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  };

  // Formatear fecha de mensaje
  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    
    if (isToday(date)) {
      return format(date, 'HH:mm', { locale: es });
    } else if (isYesterday(date)) {
      return `Ayer ${format(date, 'HH:mm', { locale: es })}`;
    } else {
      return format(date, 'dd/MM/yy HH:mm', { locale: es });
    }
  };

  // Obtener iniciales para avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Agrupar mensajes por fecha
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.created_at);
    let dateKey = '';
    
    if (isToday(date)) {
      dateKey = 'Hoy';
    } else if (isYesterday(date)) {
      dateKey = 'Ayer';
    } else {
      dateKey = format(date, 'dd/MM/yyyy', { locale: es });
    }
    
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
    
    return groups;
  }, {} as Record<string, ChatMessage[]>);

  // Marcar como leídos cuando el componente está visible
  useEffect(() => {
    if (unreadCount > 0) {
      const timer = setTimeout(() => {
        markMessagesAsRead();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [unreadCount, markMessagesAsRead]);

  return (
    <div className={`flex flex-col bg-background border border-border rounded-lg ${height} ${className}`}>
      {/* Header */}
      {showHeader && (
        <>
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">
                Chat del Proyecto
              </h3>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate max-w-48">
              {projectName}
            </p>
          </div>
          <Separator />
        </>
      )}

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground text-sm">Cargando chat...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground text-sm">
              No hay mensajes aún
            </p>
            <p className="text-muted-foreground/70 text-xs mt-1">
              Inicia la conversación enviando el primer mensaje
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedMessages).map(([dateKey, dayMessages]) => (
              <div key={dateKey}>
                {/* Separador de fecha */}
                <div className="flex items-center justify-center my-4">
                  <div className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full">
                    {dateKey}
                  </div>
                </div>

                {/* Mensajes del día */}
                <div className="space-y-3">
                  {dayMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.sender_type === 'client' ? 'flex-row-reverse' : ''
                      }`}
                    >
                      {/* Avatar */}
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={message.sender_avatar} />
                        <AvatarFallback className="text-xs">
                          {message.sender_type === 'client' ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <Users className="h-4 w-4" />
                          )}
                        </AvatarFallback>
                      </Avatar>

                      {/* Message Bubble */}
                      <div
                        className={`flex flex-col max-w-xs ${
                          message.sender_type === 'client' 
                            ? 'items-end' 
                            : 'items-start'
                        }`}
                      >
                        {/* Sender name */}
                        <div className="text-xs text-muted-foreground mb-1">
                          {message.sender_name}
                        </div>

                        {/* Message content */}
                        <div
                          className={`px-4 py-2 rounded-lg max-w-full break-words text-sm ${
                            message.sender_type === 'client'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          {message.message}
                        </div>

                        {/* Timestamp */}
                        <div className="text-xs text-muted-foreground/70 mt-1">
                          {formatMessageDate(message.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Message Input */}
      <div className="border-t border-border p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Escribe un mensaje..."
            disabled={sending}
            className="flex-1"
            maxLength={500}
          />
          <Button 
            type="submit" 
            size="sm" 
            disabled={!messageText.trim() || sending}
            className="px-3"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        
        {/* Character counter */}
        {messageText.length > 400 && (
          <div className="text-xs text-muted-foreground mt-1 text-right">
            {messageText.length}/500
          </div>
        )}
      </div>
    </div>
  );
};