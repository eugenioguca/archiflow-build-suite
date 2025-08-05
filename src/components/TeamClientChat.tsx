import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  MessageSquare, 
  Send, 
  User, 
  Clock,
  AlertCircle,
  CheckCircle2,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ChatMessage {
  id: string;
  message: string;
  sender_id: string;
  project_id: string;
  client_id: string;
  is_client_message: boolean;
  created_at: string;
  sender_profile: {
    full_name: string;
    avatar_url?: string;
  };
  attachments?: any[];
  read_by: any[];
}

interface Client {
  id: string;
  full_name: string;
}

interface Project {
  id: string;
  project_name: string;
  client_id: string;
  client: Client;
}

interface TeamClientChatProps {
  projectId: string;
  module: 'sales' | 'design' | 'construction';
  className?: string;
}

export const TeamClientChat: React.FC<TeamClientChatProps> = ({
  projectId,
  module,
  className = ""
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
      fetchMessages();
      setupRealtimeSubscription();
    }
  }, [projectId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchProjectData = async () => {
    try {
      const { data, error } = await supabase
        .from('client_projects')
        .select(`
          id,
          project_name,
          client_id,
          client:clients(id, full_name)
        `)
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('client_portal_chat')
        .select(`
          *,
          sender_profile:profiles!client_portal_chat_sender_id_fkey(
            full_name,
            avatar_url
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedMessages = (data || []).map(msg => ({
        ...msg,
        read_by: Array.isArray(msg.read_by) ? msg.read_by : [],
        attachments: Array.isArray(msg.attachments) ? msg.attachments : []
      }));
      
      setMessages(formattedMessages);
      
      // Contar mensajes no leídos del cliente
      const clientMessages = formattedMessages.filter(msg => 
        msg.is_client_message && !msg.read_by.includes(user?.id || '')
      );
      setUnreadCount(clientMessages.length);

    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los mensajes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`team-chat-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'client_portal_chat',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          console.log('New message received:', payload);
          fetchMessages(); // Refetch to get complete data with joins
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending || !user || !project) return;

    setSending(true);
    try {
      // Get current user's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { error } = await supabase
        .from('client_portal_chat')
        .insert({
          project_id: projectId,
          client_id: project.client_id,
          sender_id: profile.id,
          message: newMessage.trim(),
          is_client_message: false,
          read_by: [user.id]
        });

      if (error) throw error;

      setNewMessage('');
      toast({
        title: "Mensaje enviado",
        description: "Tu mensaje ha sido enviado al cliente",
      });

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const markMessagesAsRead = async () => {
    if (!user) return;

    try {
      const clientMessages = messages.filter(msg => 
        msg.is_client_message && !msg.read_by.includes(user.id)
      );

      for (const message of clientMessages) {
        await supabase
          .from('client_portal_chat')
          .update({
            read_by: [...message.read_by, user.id]
          })
          .eq('id', message.id);
      }

      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return format(date, 'HH:mm', { locale: es });
    } else if (diffInHours < 168) { // 7 days
      return format(date, 'EEE HH:mm', { locale: es });
    } else {
      return format(date, 'dd/MM HH:mm', { locale: es });
    }
  };

  const getModuleColor = (module: string) => {
    switch (module) {
      case 'sales':
        return 'bg-blue-500';
      case 'design':
        return 'bg-purple-500';
      case 'construction':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getModuleLabel = (module: string) => {
    switch (module) {
      case 'sales':
        return 'Ventas';
      case 'design':
        return 'Diseño';
      case 'construction':
        return 'Construcción';
      default:
        return 'Equipo';
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-muted-foreground">Cargando chat...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Chat con Cliente
            <Badge className={getModuleColor(module)}>
              {getModuleLabel(module)}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {unreadCount} nuevo{unreadCount > 1 ? 's' : ''}
              </Badge>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={markMessagesAsRead}
              disabled={unreadCount === 0}
            >
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
        {project && (
          <div className="text-sm text-muted-foreground">
            {project.project_name} - {project.client.full_name}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {/* Messages Area */}
        <ScrollArea className="h-80 px-4">
          <div className="space-y-4 py-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No hay mensajes aún. ¡Inicia la conversación!
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.is_client_message ? 'justify-start' : 'justify-end'
                  }`}
                >
                  {message.is_client_message && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={message.sender_profile?.avatar_url} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={`max-w-xs lg:max-w-md ${
                    message.is_client_message ? 'order-2' : 'order-1'
                  }`}>
                    <div className={`rounded-lg px-3 py-2 ${
                      message.is_client_message 
                        ? 'bg-muted text-foreground' 
                        : 'bg-primary text-primary-foreground'
                    }`}>
                      <p className="text-sm">{message.message}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {message.sender_profile?.full_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatMessageTime(message.created_at)}
                      </span>
                      {message.is_client_message && !message.read_by.includes(user?.id || '') && (
                        <AlertCircle className="h-3 w-3 text-orange-500" />
                      )}
                    </div>
                  </div>

                  {!message.is_client_message && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={message.sender_profile?.avatar_url} />
                      <AvatarFallback>
                        <Users className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Escribe un mensaje a ${project?.client.full_name || 'el cliente'}...`}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={sending}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};