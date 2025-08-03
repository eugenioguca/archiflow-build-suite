import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageCircle, 
  Send, 
  User, 
  UserCheck, 
  Paperclip,
  File,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ChatMessage {
  id: string;
  message: string;
  sender_id: string;
  client_id: string;
  project_id: string;
  is_client_message: boolean;
  attachments?: any[];
  read_by?: any[];
  created_at: string;
  sender_name?: string;
}

interface ClientPortalChatProps {
  projectId: string;
  clientId: string;
}

export const ClientPortalChat: React.FC<ClientPortalChatProps> = ({ 
  projectId, 
  clientId 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (user && projectId && clientId) {
      fetchMessages();
      subscribeToMessages();
    }
  }, [user, projectId, clientId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('client_portal_chat')
        .select(`
          *,
          profiles!client_portal_chat_sender_id_fkey(full_name)
        `)
        .eq('project_id', projectId)
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const processedMessages = data?.map(msg => ({
        ...msg,
        attachments: Array.isArray(msg.attachments) ? msg.attachments : [],
        read_by: Array.isArray(msg.read_by) ? msg.read_by : [],
        sender_name: (msg.profiles as any)?.full_name || (msg.is_client_message ? 'Cliente' : 'Equipo')
      })) || [];

      setMessages(processedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los mensajes"
      });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'client_portal_chat',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages(prev => [...prev, {
            ...newMessage,
            sender_name: newMessage.is_client_message ? 'Cliente' : 'Equipo'
          }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !user) return;

    setSending(true);
    try {
      // Get current user's profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profileData) throw new Error('Profile not found');

      const { error } = await supabase
        .from('client_portal_chat')
        .insert({
          message: newMessage.trim(),
          sender_id: profileData.id,
          client_id: clientId,
          project_id: projectId,
          is_client_message: true // Assuming this is from client portal
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo enviar el mensaje"
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return format(date, 'HH:mm');
    } else if (diffDays === 1) {
      return `Ayer ${format(date, 'HH:mm')}`;
    } else if (diffDays < 7) {
      return format(date, 'eeee HH:mm', { locale: es });
    } else {
      return format(date, 'dd MMM HH:mm', { locale: es });
    }
  };

  if (loading) {
    return (
      <Card className="h-[500px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </Card>
    );
  }

  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="flex-shrink-0 pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Chat del Proyecto
          </span>
          <Badge variant="secondary" className="gap-1">
            {messages.length} mensajes
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0 space-y-4">
        {/* Messages Area */}
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="font-medium">No hay mensajes aún</p>
                <p className="text-sm">Inicia la conversación enviando un mensaje</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.is_client_message ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.is_client_message
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="space-y-1">
                      <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                      
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <File className="h-4 w-4" />
                          <span className="text-xs">Archivo adjunto</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-xs opacity-70">
                        <div className="flex items-center gap-1">
                          {message.is_client_message ? (
                            <User className="h-3 w-3" />
                          ) : (
                            <UserCheck className="h-3 w-3" />
                          )}
                          {message.sender_name}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatMessageTime(message.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground px-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-75"></div>
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-150"></div>
            </div>
            <span>El equipo está escribiendo...</span>
          </div>
        )}

        {/* Message Input */}
        <div className="flex-shrink-0 flex gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="icon"
            className="flex-shrink-0"
            onClick={() => {
              toast({
                title: "Funcionalidad en desarrollo",
                description: "Los adjuntos estarán disponibles próximamente"
              });
            }}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe tu mensaje..."
            className="flex-1"
            disabled={sending}
          />
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};