import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DragDropUploader } from '@/components/ui/drag-drop-uploader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageCircle, 
  Send, 
  Paperclip,
  User,
  Building2,
  Download,
  Image,
  FileText,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ChatMessage {
  id: string;
  message: string;
  sender_id: string;
  is_client_message: boolean;
  attachments?: any;
  read_by?: any;
  created_at: string;
  sender_name?: string;
  sender_role?: string;
}

interface EnhancedClientPortalChatProps {
  projectId: string;
  clientId: string;
}

export const EnhancedClientPortalChat: React.FC<EnhancedClientPortalChatProps> = ({
  projectId,
  clientId
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMessages();
    // Set up real-time subscription
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
          const newMsg = payload.new as ChatMessage;
          setMessages(prev => [...prev, {
            ...newMsg,
            sender_name: newMsg.is_client_message ? 'Tú' : 'Equipo',
            sender_role: newMsg.is_client_message ? 'client' : 'team'
          }]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('client_portal_chat')
        .select(`
          id,
          message,
          sender_id,
          is_client_message,
          attachments,
          read_by,
          created_at
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const messagesWithSender = (data || []).map(msg => ({
        ...msg,
        sender_name: msg.is_client_message ? 'Tú' : 'Equipo',
        sender_role: msg.is_client_message ? 'client' : 'team',
        attachments: Array.isArray(msg.attachments) ? msg.attachments : [],
        read_by: Array.isArray(msg.read_by) ? msg.read_by : []
      }));

      setMessages(messagesWithSender);
    } catch (error: any) {
      console.error('Error fetching chat messages:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los mensajes"
      });
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', currentUser.id)
        .single();

      if (!profile) throw new Error('Perfil no encontrado');

      const { error } = await supabase
        .from('client_portal_chat')
        .insert([{
          project_id: projectId,
          client_id: clientId,
          sender_id: profile.id,
          message: newMessage.trim(),
          is_client_message: true,
          attachments: [],
          read_by: [profile.id]
        }]);

      if (error) throw error;

      setNewMessage('');
      toast({
        title: "Mensaje enviado",
        description: "Tu mensaje ha sido enviado al equipo"
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo enviar el mensaje"
      });
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploadingFile(true);

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', currentUser.id)
        .single();

      if (!profile) throw new Error('Perfil no encontrado');

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `chat/${projectId}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Send message with attachment
      const attachment = {
        type: file.type.startsWith('image/') ? 'image' : 'file',
        name: file.name,
        url: uploadData.path,
        size: file.size
      };

      const { error } = await supabase
        .from('client_portal_chat')
        .insert([{
          project_id: projectId,
          client_id: clientId,
          sender_id: profile.id,
          message: `📎 Archivo adjunto: ${file.name}`,
          is_client_message: true,
          attachments: [attachment],
          read_by: [profile.id]
        }]);

      if (error) throw error;

      toast({
        title: "Archivo enviado",
        description: "El archivo ha sido compartido con el equipo"
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo enviar el archivo"
      });
    } finally {
      setUploadingFile(false);
      setShowAttachments(false);
    }
  };

  const handleDownloadAttachment = async (attachment: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-documents')
        .download(attachment.url);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = attachment.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo descargar el archivo"
      });
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.abs(now.getTime() - date.getTime()) / 36e5;

    if (diffHours < 24) {
      return format(date, 'HH:mm');
    } else if (diffHours < 168) { // 7 days
      return format(date, 'EEE HH:mm', { locale: es });
    } else {
      return format(date, 'dd/MM/yyyy HH:mm');
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="h-5 w-5" />
          Chat del Proyecto
          {messages.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {messages.length} mensajes
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 py-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-2">Inicia la conversación</h3>
                <p className="text-muted-foreground text-sm">
                  Comunícate con el equipo sobre tu proyecto. Todas las conversaciones quedan registradas.
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.is_client_message ? 'justify-end' : 'justify-start'}`}
                >
                  {!message.is_client_message && (
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Building2 className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={`max-w-xs lg:max-w-md ${message.is_client_message ? 'order-first' : ''}`}>
                    <div className={`rounded-lg px-4 py-3 ${
                      message.is_client_message 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}>
                      <p className="text-sm">{message.message}</p>
                      
                      {/* Attachments */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.attachments.map((attachment, index) => (
                            <div 
                              key={index}
                              className={`flex items-center gap-2 p-2 rounded ${
                                message.is_client_message ? 'bg-primary-foreground/10' : 'bg-background'
                              }`}
                            >
                              {attachment.type === 'image' ? (
                                <Image className="h-4 w-4" />
                              ) : (
                                <FileText className="h-4 w-4" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{attachment.name}</p>
                                <p className="text-xs opacity-70">{formatFileSize(attachment.size)}</p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDownloadAttachment(attachment)}
                                className="h-6 w-6 p-0"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className={`flex items-center gap-2 mt-1 text-xs text-muted-foreground ${
                      message.is_client_message ? 'justify-end' : 'justify-start'
                    }`}>
                      <Clock className="h-3 w-3" />
                      <span>{formatMessageTime(message.created_at)}</span>
                      <span>•</span>
                      <span>{message.sender_name}</span>
                    </div>
                  </div>
                  
                  {message.is_client_message && (
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarFallback className="bg-secondary">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Attachment Upload Area */}
        {showAttachments && (
          <div className="px-6 py-4 border-t bg-muted/30">
            <DragDropUploader
              onFilesSelected={(files) => handleFileUpload(files as any)}
              accept={{
                'application/pdf': ['.pdf'],
                'application/msword': ['.doc'],
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                'image/jpeg': ['.jpg', '.jpeg'],
                'image/png': ['.png'],
                'text/plain': ['.txt']
              }}
              maxSize={10 * 1024 * 1024}
            />
          </div>
        )}

        {/* Input Area */}
        <div className="p-6 border-t">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAttachments(!showAttachments)}
              disabled={uploadingFile}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe tu mensaje..."
              className="flex-1"
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
          <p className="text-xs text-muted-foreground mt-2">
            Presiona Enter para enviar. Los archivos se limitan a 10MB.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};