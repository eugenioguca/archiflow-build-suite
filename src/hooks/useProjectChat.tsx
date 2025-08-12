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

  // Determinar el tipo de usuario y su ID de forma simple
  const getUserInfo = useCallback(async () => {
    if (!user || !profile) return null;

    if (profile.role === 'client') {
      // Para clientes, obtener el client_id - las políticas RLS esperan client.id
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();
      
      if (!clientData) return null;
      
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
  }, [user, profile]);

  // Cargar mensajes del chat
  const loadMessages = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    try {
      const { data: messagesData, error } = await supabase
        .from('project_chat')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) {
        return;
      }

      // Procesar mensajes y obtener información del remitente
      const formattedMessages: ChatMessage[] = [];
      
      for (const msg of messagesData || []) {
        let senderName = '';
        let senderAvatar = '';
        
        if (msg.sender_type === 'employee') {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', msg.sender_id)
            .single();
          
          senderName = profileData?.full_name || 'Empleado';
          senderAvatar = profileData?.avatar_url || '';
        } else {
          const { data: clientData } = await supabase
            .from('clients')
            .select('full_name')
            .eq('id', msg.sender_id)
            .single();
          
          senderName = clientData?.full_name || 'Cliente';
        }

        formattedMessages.push({
          ...msg,
          sender_type: msg.sender_type as 'employee' | 'client',
          sender_name: senderName,
          sender_avatar: senderAvatar
        });
      }

      setMessages(formattedMessages);
      
      // Marcar mensajes como leídos
      await markMessagesAsRead();
      
    } catch (error) {
      // Silently handle loading errors
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Marcar mensajes como leídos
  const markMessagesAsRead = useCallback(async () => {
    const userInfo = await getUserInfo();
    if (!userInfo || !projectId) return;

    try {
      // Marcar notificaciones como leídas
      const { error } = await supabase
        .from('chat_notifications')
        .update({ is_read: true })
        .eq('project_id', projectId)
        .eq('recipient_id', userInfo.userId)
        .eq('recipient_type', userInfo.userType)
        .eq('is_read', false);

      if (error) {
        // Silently handle notification update errors
      }

      setUnreadCount(0);
    } catch (error) {
      // Silently handle mark as read errors
    }
  }, [projectId, getUserInfo]);

  // Enviar mensaje - simplificado para confiar en las políticas RLS
  const sendMessage = useCallback(async (messageText: string) => {
    if (!projectId || !messageText.trim()) return false;

    const userInfo = await getUserInfo();
    if (!userInfo) return false;

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
        console.error('Chat: Error sending message:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Chat: Error sending message:', error);
      return false;
    } finally {
      setSending(false);
    }
  }, [projectId, getUserInfo]);

  // Scroll al final
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Cargar contador de mensajes no leídos
  const loadUnreadCount = useCallback(async () => {
    const userInfo = await getUserInfo();
    if (!userInfo || !projectId) return;

    try {
      const { data, error } = await supabase
        .from('chat_notifications')
        .select('id')
        .eq('project_id', projectId)
        .eq('recipient_id', userInfo.userId)
        .eq('recipient_type', userInfo.userType)
        .eq('is_read', false);

      if (error) {
        return;
      }

      setUnreadCount(data?.length || 0);
    } catch (error) {
      // Silently handle unread count errors
    }
  }, [projectId, getUserInfo]);

  // Configurar subscripciones en tiempo real
  useEffect(() => {
    if (!projectId) return;

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

  // Cargar datos iniciales
  useEffect(() => {
    if (projectId && user) {
      loadMessages();
      loadUnreadCount();
    }
  }, [projectId, user, loadMessages, loadUnreadCount]);

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