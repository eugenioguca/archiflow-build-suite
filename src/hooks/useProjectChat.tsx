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
  enablePopupNotifications?: boolean;
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

  // ULTRA SIMPLIFICADO: Solo usar profile.id directamente
  const getUserInfo = useCallback(() => {
    if (!validateAuth()) return null;

    return {
      userId: profile.id, // Solo usar profile.id - sin validaciones complejas
      userType: profile.role === 'client' ? 'client' as const : 'employee' as const,
      userName: profile.full_name || 'Usuario',
      userAvatar: profile.avatar_url
    };
  }, [profile, validateAuth]);

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
          sender_name,
          sender_avatar,
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

      // Los mensajes ya vienen con sender_name y sender_avatar de la BD
      const formattedMessages = (data || []).map(msg => ({
        ...msg,
        sender_name: msg.sender_name || (msg.sender_type === 'employee' ? 'Empleado' : 'Cliente'),
        sender_avatar: msg.sender_avatar
      })) as ChatMessage[];

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Chat: Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, validateAuth]);

  // Marcar mensajes como leídos - simplificado
  const markMessagesAsRead = useCallback(async () => {
    if (!projectId || !validateAuth()) return;
    
    const userInfo = getUserInfo();
    if (!userInfo) return;

    try {
      const { error } = await supabase
        .from('chat_notifications')
        .update({ is_read: true })
        .eq('project_id', projectId)
        .eq('recipient_id', userInfo.userId)
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

  // ENVIAR MENSAJE ULTRA SIMPLIFICADO
  const sendMessage = useCallback(async (messageText: string) => {
    if (!projectId || !messageText.trim() || !validateAuth()) {
      return false;
    }

    const userInfo = getUserInfo();
    if (!userInfo) {
      return false;
    }

    setSending(true);
    try {
      const { error } = await supabase
        .from('project_chat')
        .insert({
          project_id: projectId,
          sender_id: userInfo.userId, // Solo profile.id
          sender_type: userInfo.userType,
          sender_name: userInfo.userName,
          sender_avatar: userInfo.userAvatar,
          message: messageText.trim()
        });

      if (error) {
        console.error('Chat error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Chat exception:', error);
      return false;
    } finally {
      setSending(false);
    }
  }, [projectId, getUserInfo, validateAuth]);

  // Scroll al final
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Cargar cantidad de mensajes no leídos - simplificado
  const loadUnreadCount = useCallback(async () => {
    if (!projectId || !validateAuth()) return;
    
    const userInfo = getUserInfo();
    if (!userInfo) return;

    try {
      const { count } = await supabase
        .from('chat_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('recipient_id', userInfo.userId)
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
          
          // Los mensajes nuevos ya vienen con sender_name y sender_avatar de la BD
          const formattedMessage: ChatMessage = {
            ...newMessage,
            sender_name: newMessage.sender_name || (newMessage.sender_type === 'employee' ? 'Empleado' : 'Cliente'),
            sender_avatar: newMessage.sender_avatar
          };

          setMessages(prev => [...prev, formattedMessage]);
          onNewMessage?.(formattedMessage);
          
          // Auto-scroll si es mensaje propio
          const userInfo = getUserInfo();
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
          const userInfo = getUserInfo();
          
          // Solo procesar notificaciones dirigidas al usuario actual
          if (userInfo && notification.recipient_id === userInfo.userId) {
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