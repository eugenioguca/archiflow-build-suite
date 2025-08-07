import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageCircle, 
  Send, 
  Paperclip, 
  Download, 
  Users,
  Clock,
  Check,
  CheckCheck,
  AlertCircle
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { DragDropUploader } from '@/components/ui/drag-drop-uploader';

interface ChatMessage {
  id: string;
  message: string;
  sender_id: string;
  project_id: string;
  client_id: string;
  is_client_message: boolean;
  attachments?: any[];
  read_by?: string[];
  created_at: string;
  sender_name?: string;
  sender_role?: string;
}

interface TeamMember {
  id: string;
  display_name: string;
  role: string;
  department_enum?: string;
  position_enum?: string;
}

interface SuperiorClientPortalChatProps {
  projectId: string;
  clientId: string;
}

export const SuperiorClientPortalChat = ({ projectId, clientId }: SuperiorClientPortalChatProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInitialData();
    setupRealtimeSubscriptions();
    return () => cleanup();
  }, [projectId, clientId]);

  const fetchInitialData = async () => {
    await Promise.all([
      fetchMessages(),
      fetchTeamMembers(),
    ]);
    setLoading(false);
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('client_portal_chat')
        .select(`
          id,
          message,
          sender_id,
          project_id,
          client_id,
          is_client_message,
          attachments,
          read_by,
          created_at
        `)
        .eq('project_id', projectId)
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Enhance messages with sender names
      const enhancedMessages = await Promise.all(
        (data || []).map(async (msg) => {
          let sender_name = 'Usuario';
          let sender_role = 'unknown';
          
          if (msg.is_client_message) {
            // Get client name
            const { data: client } = await supabase
              .from('clients')
              .select('full_name')
              .eq('id', clientId)
              .single();
            
            sender_name = client?.full_name || 'Cliente';
            sender_role = 'client';
          } else {
            // Get team member name
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, role')
              .eq('user_id', msg.sender_id)
              .single();
            
            sender_name = profile?.full_name || 'Equipo';
            sender_role = profile?.role || 'team';
          }

          return {
            ...msg,
            sender_name,
            sender_role,
            attachments: Array.isArray(msg.attachments) ? msg.attachments : [],
            read_by: Array.isArray(msg.read_by) ? msg.read_by.map(String) : []
          } as ChatMessage;
        })
      );

      setMessages(enhancedMessages);
      scrollToBottom();
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const { data: project, error } = await supabase
        .from('client_projects')
        .select(`
          assigned_advisor_id,
          project_manager_id,
          construction_supervisor_id
        `)
        .eq('id', projectId)
        .single();

      if (error) throw error;

      // Fetch individual team member profiles
      const memberIds = [
        project?.assigned_advisor_id,
        project?.project_manager_id,
        project?.construction_supervisor_id
      ].filter(Boolean);

      if (memberIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, role, department_enum')
          .in('id', memberIds);

        if (!profilesError && profiles) {
          const teamMembersData = profiles.map(profile => ({
            id: profile.id,
            display_name: profile.full_name,
            role: profile.role,
            department_enum: profile.department_enum,
          }));
          setTeamMembers(teamMembersData);
        }
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Chat messages subscription
    const chatChannel = supabase
      .channel('enhanced-chat')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'client_portal_chat',
          filter: `project_id=eq.${projectId}`,
        },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;
          
          // Enhance with sender info
          let sender_name = 'Usuario';
          let sender_role = 'unknown';
          
          if (newMsg.is_client_message) {
            const { data: client } = await supabase
              .from('clients')
              .select('full_name')
              .eq('id', clientId)
              .single();
            
            sender_name = client?.full_name || 'Cliente';
            sender_role = 'client';
          } else {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, role, department_enum')
              .eq('user_id', newMsg.sender_id)
              .single();
            
            sender_name = profile?.full_name || 'Equipo';
            sender_role = profile?.department_enum || profile?.role || 'team';
          }

          setMessages(prev => [...prev, {
            ...newMsg,
            sender_name,
            sender_role,
            attachments: Array.isArray(newMsg.attachments) ? newMsg.attachments : [],
            read_by: Array.isArray(newMsg.read_by) ? newMsg.read_by.map(String) : []
          } as ChatMessage]);
          
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
    };
  };

  const cleanup = () => {
    // Cleanup subscriptions
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && attachments.length === 0) || sending) return;

    setSending(true);
    setUploading(attachments.length > 0);

    try {
      let messageAttachments: any[] = [];

      // Upload attachments if any
      if (attachments.length > 0) {
        for (const file of attachments) {
          const fileName = `${Date.now()}-${file.name}`;
          const filePath = `chat-attachments/${clientId}/${projectId}/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('project-documents')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          messageAttachments.push({
            name: file.name,
            path: filePath,
            size: file.size,
            type: file.type
          });
        }
      }

      // Get current user profile
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('user_id', user?.id)
        .single();

      // Send message
      const { error } = await supabase
        .from('client_portal_chat')
        .insert({
          project_id: projectId,
          client_id: clientId,
          sender_id: user?.id,
          message: newMessage.trim(),
          is_client_message: userProfile?.role === 'client',
          attachments: messageAttachments.length > 0 ? messageAttachments : null,
        });

      if (error) throw error;

      // Clear inputs
      setNewMessage('');
      setAttachments([]);

      toast({
        title: "Mensaje enviado",
        description: "Tu mensaje ha sido enviado correctamente",
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
      setUploading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `Ayer ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'dd/MM HH:mm', { locale: es });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const downloadAttachment = async (attachment: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-documents')
        .download(attachment.path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo descargar el archivo",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Chat del Proyecto
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <Badge variant="outline">{teamMembers.length + 1} participantes</Badge>
          </div>
        </CardTitle>
        
        {/* Team members indicator */}
        <div className="flex gap-2 flex-wrap">
          {teamMembers.map((member) => (
            <Badge key={member.id} variant="secondary" className="text-xs">
              {member.display_name} ({member.department_enum || member.role})
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages area */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.is_client_message ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] ${message.is_client_message ? 'order-2' : 'order-1'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {message.sender_name?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{message.sender_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatMessageTime(message.created_at)}
                    </span>
                  </div>
                  
                  <div
                    className={`rounded-lg p-3 ${
                      message.is_client_message
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {message.message && (
                      <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                    )}
                    
                    {/* Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {message.attachments.map((attachment: any, index: number) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-background/10 rounded border"
                          >
                            <div className="flex items-center gap-2">
                              <Paperclip className="h-4 w-4" />
                              <span className="text-sm truncate">{attachment.name}</span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => downloadAttachment(attachment)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>

        {/* File attachments preview */}
        {attachments.length > 0 && (
          <div className="border-t p-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Archivos adjuntos:</h4>
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="text-sm truncate">{file.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="border-t p-4">
          <div className="space-y-3">
            {/* Drag and drop for attachments */}
            <DragDropUploader
              onFilesSelected={(files) => setAttachments(prev => [...prev, ...files])}
              accept={{
                'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
                'application/pdf': ['.pdf'],
                'application/msword': ['.doc'],
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                'text/*': ['.txt']
              }}
              multiple={true}
              maxSize={10 * 1024 * 1024} // 10MB
              showPreview={false}
            />
            
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe tu mensaje..."
                disabled={sending}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={sending || (!newMessage.trim() && attachments.length === 0)}
                size="icon"
              >
                {sending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background"></div>
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {uploading && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                Subiendo archivos...
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};