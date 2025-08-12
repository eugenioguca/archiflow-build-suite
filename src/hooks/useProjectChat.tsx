import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ChatMessage {
  id: string;
  project_id: string;
  sender_id: string;
  sender_type: 'employee' | 'client';
  message: string;
  created_at: string;
  updated_at: string;
  is_read: boolean;
  sender_name?: string;
  sender_avatar?: string;
}

export interface ChatNotification {
  id: string;
  project_id: string;
  message_id: string;
  recipient_id: string;
  recipient_type: 'employee' | 'client';
  is_read: boolean;
  created_at: string;
}

interface UseProjectChatProps {
  projectId: string;
  onNewMessage?: (message: ChatMessage) => void;
  onNotification?: (notification: ChatNotification) => void;
}

export const useProjectChat = ({ 
  projectId, 
  onNewMessage, 
  onNotification 
}: UseProjectChatProps) => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Validar autenticación antes de cualquier operación
  const validateAuth = useCallback((): boolean => {
    if (!user || !user.id) {
      console.error('Chat: Usuario no autenticado');
      return false;
    }
    if (!profile || !profile.id) {
      console.error('Chat: Perfil de usuario no disponible');
      return false;
    }
    return true;
  }, [user, profile]);

  // Determinar el tipo de usuario y su ID de forma simple
  const getUserInfo = useCallback(async () => {
    if (!validateAuth()) return null;

    if (profile.role === 'client') {
      // Para clientes, obtener el client_id - las políticas RLS esperan client.id
      const { data: clientData, error } = await supabase
        .from('clients')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();
      
      if (error) {
        console.error('Chat: Error obteniendo datos del cliente:', error);
        return null;
      }
      
      if (!clientData) {
        console.error('Chat: No se encontró cliente para el perfil:', profile.id);
        return null;
      }
      
      return {
        userId: clientData.id, // Este es el client.id que espera la RLS
        userType: 'client' as const,
        userName: profile.full_name || 'Cliente',
        userAvatar: profile.avatar_url
      };
    } else {
      // Para empleados, usar profile_id - las políticas RLS esperan profile.id
      return {
        userId: profile.id, // Este es el profile.id que espera la RLS
        userType: 'employee' as const,
        userName: profile.full_name || 'Empleado',
        userAvatar: profile.avatar_url
      };
    }
  }, [user, profile, validateAuth]);

  // Cargar mensajes del proyecto
  const loadMessages = useCallback(async () => {
    if (!projectId || !validateAuth()) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('project_chat')
        .select(`
          id,
          project_id,
          sender_id,
          sender_type,
          message,
          created_at,
          is_read
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Chat: Error loading messages:', error);
        return;
      }

      // Formatear mensajes con información del remitente
      const formattedMessages = await Promise.all(
        (data || []).map(async (msg) => {
          let senderName = 'Usuario Desconocido';
          let senderAvatar = null;

          if (msg.sender_type === 'client') {
            const { data: clientData } = await supabase
              .from('clients')
              .select('full_name, profile_id')
              .eq('id', msg.sender_id)
              .single();
            
            if (clientData) {
              senderName = clientData.full_name || 'Cliente';
              // Obtener avatar del perfil
              const { data: profileData } = await supabase
                .from('profiles')
                .select('avatar_url')
                .eq('id', clientData.profile_id)
                .single();
              senderAvatar = profileData?.avatar_url;
            }
          } else {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', msg.sender_id)
              .single();
            
            if (profileData) {
              senderName = profileData.full_name || 'Empleado';
              senderAvatar = profileData.avatar_url;
            }
          }

          return {
            ...msg,
            sender_name: senderName,
            sender_avatar: senderAvatar
          } as ChatMessage;
        })
      );

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Chat: Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, validateAuth]);

  // Marcar mensajes como leídos
  const markMessagesAsRead = useCallback(async () => {
    if (!projectId || !validateAuth()) return;
    
    const userInfo = await getUserInfo();
    if (!userInfo) return;

    try {
      const { error } = await supabase
        .from('chat_notifications')
        .update({ is_read: true })
        .eq('project_id', projectId)
        .eq('recipient_id', userInfo.userId)
        .eq('recipient_type', userInfo.userType)
        .eq('is_read', false);

      if (error) {
        console.error('Chat: Error marking messages as read:', error);
      } else {
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Chat: Error marking messages as read:', error);
    }
  }, [projectId, getUserInfo, validateAuth]);

  // Enviar mensaje - con validaciones completas
  const sendMessage = useCallback(async (messageText: string) => {
    if (!projectId || !messageText.trim()) {
      console.error('Chat: Falta projectId o mensaje vacío');
      return false;
    }

    if (!validateAuth()) {
      console.error('Chat: Usuario no autenticado para enviar mensaje');
      return false;
    }

    const userInfo = await getUserInfo();
    if (!userInfo) {
      console.error('Chat: No se pudo obtener información del usuario');
      return false;
    }

    console.log('Chat: Enviando mensaje', {
      projectId,
      senderId: userInfo.userId,
      senderType: userInfo.userType,
      messageLength: messageText.trim().length
    });

    setSending(true);
    try {
      const { error } = await supabase
        .from('project_chat')
        .insert({
          project_id: projectId,
          sender_id: userInfo.userId,
          sender_type: userInfo.userType,
          message: messageText.trim()
        });

      if (error) {
        console.error('Chat: Error enviando mensaje:', error);
        if (error.message.includes('row-level security')) {
          console.error('Chat: Error de seguridad RLS - el usuario no tiene acceso al proyecto');
        }
        return false;
      }

      console.log('Chat: Mensaje enviado correctamente');
      return true;
    } catch (error) {
      console.error('Chat: Excepción enviando mensaje:', error);
      return false;
    } finally {
      setSending(false);
    }
  }, [projectId, getUserInfo, validateAuth]);

  // Scroll al final
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Cargar cantidad de mensajes no leídos
  const loadUnreadCount = useCallback(async () => {
    if (!projectId || !validateAuth()) return;
    
    const userInfo = await getUserInfo();
    if (!userInfo) return;

    try {
      const { count } = await supabase
        .from('chat_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('recipient_id', userInfo.userId)
        .eq('recipient_type', userInfo.userType)
        .eq('is_read', false);

      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Chat: Error loading unread count:', error);
    }
  }, [projectId, getUserInfo, validateAuth]);

  // Configurar realtime subscriptions
  useEffect(() => {
    if (!projectId || !validateAuth()) return;

    // Suscripción a nuevos mensajes
    const messagesChannel = supabase
      .channel(`project_chat_${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_chat',
          filter: `project_id=eq.${projectId}`
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Obtener información del remitente
          let senderName = '';
          let senderAvatar = '';
          
          if (newMessage.sender_type === 'employee') {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', newMessage.sender_id)
              .single();
            
            senderName = profileData?.full_name || 'Empleado';
            senderAvatar = profileData?.avatar_url || '';
          } else {
            const { data: clientData } = await supabase
              .from('clients')
              .select('full_name')
              .eq('id', newMessage.sender_id)
              .single();
            
            senderName = clientData?.full_name || 'Cliente';
          }

          const formattedMessage: ChatMessage = {
            ...newMessage,
            sender_name: senderName,
            sender_avatar: senderAvatar
          };

          setMessages(prev => [...prev, formattedMessage]);
          onNewMessage?.(formattedMessage);
          
          // Auto-scroll si es mensaje propio
          const userInfo = await getUserInfo();
          if (userInfo && newMessage.sender_id === userInfo.userId) {
            setTimeout(scrollToBottom, 100);
          }
        }
      )
      .subscribe();

    // Suscripción a notificaciones
    const notificationsChannel = supabase
      .channel(`chat_notifications_${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_notifications',
          filter: `project_id=eq.${projectId}`
        },
        async (payload) => {
          const notification = payload.new as ChatNotification;
          const userInfo = await getUserInfo();
          
          // Solo procesar notificaciones dirigidas al usuario actual
          if (userInfo && 
              notification.recipient_id === userInfo.userId && 
              notification.recipient_type === userInfo.userType) {
            
            setUnreadCount(prev => prev + 1);
            onNotification?.(notification);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [projectId, onNewMessage, onNotification, getUserInfo, scrollToBottom]);

  // Cargar mensajes iniciales y contador cuando cambie el proyecto o usuario
  useEffect(() => {
    if (projectId && validateAuth()) {
      loadMessages();
      loadUnreadCount();
    }
  }, [projectId, user, profile, loadMessages, loadUnreadCount, validateAuth]);

  // Auto-scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  return {
    messages,
    loading,
    sending,
    unreadCount,
    sendMessage,
    markMessagesAsRead,
    scrollToBottom,
    messagesEndRef,
    getUserInfo
  };
};