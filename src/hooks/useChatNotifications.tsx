import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { serviceWorkerManager } from '@/utils/serviceWorkerManager';

interface ChatNotification {
  id: string;
  messageId: string;
  projectId: string;
  projectName: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  recipientId: string;
  recipientType: 'employee' | 'client';
}

interface UseChatNotificationsReturn {
  notifications: ChatNotification[];
  unreadCount: number;
  latestNotification: ChatNotification | null;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  refreshNotifications: () => void;
}

export function useChatNotifications(): UseChatNotificationsReturn {
  const [notifications, setNotifications] = useState<ChatNotification[]>([]);
  const [latestNotification, setLatestNotification] = useState<ChatNotification | null>(null);

  // Load initial notifications
  const loadNotifications = useCallback(async () => {
    try {
      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      // Get chat notifications for this user
      const { data: chatNotifications, error } = await supabase
        .from('chat_notifications')
        .select(`
          id,
          message_id,
          project_id,
          is_read,
          created_at
        `)
        .eq('recipient_id', profile.id)
        .eq('recipient_type', profile.role === 'client' ? 'client' : 'employee')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading chat notifications:', error);
        return;
      }

      // For each notification, get the related message and project data
      const formattedNotifications: ChatNotification[] = [];
      
      for (const notif of chatNotifications || []) {
        // Get message details
        const { data: message } = await supabase
          .from('project_chat')
          .select('id, message, sender_id, sender_name, sender_avatar')
          .eq('id', notif.message_id)
          .single();

        // Get project details
        const { data: project } = await supabase
          .from('client_projects')
          .select('id, project_name')
          .eq('id', notif.project_id)
          .single();

        if (message && project) {
          formattedNotifications.push({
            id: notif.id,
            messageId: notif.message_id,
            projectId: notif.project_id,
            projectName: project.project_name,
            senderName: message.sender_name || 'Usuario',
            senderAvatar: message.sender_avatar,
            content: message.message,
            timestamp: notif.created_at,
            isRead: notif.is_read,
            recipientId: profile.id,
            recipientType: profile.role === 'client' ? 'client' : 'employee'
          });
        }
      }

      setNotifications(formattedNotifications);
    } catch (error) {
      console.error('Error in loadNotifications:', error);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('chat_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, isRead: true }
            : notif
        )
      );
    } catch (error) {
      console.error('Error in markAsRead:', error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      const { error } = await supabase
        .from('chat_notifications')
        .update({ is_read: true })
        .eq('recipient_id', profile.id)
        .eq('recipient_type', profile.role === 'client' ? 'client' : 'employee')
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }

      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true }))
      );
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
    }
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    let mounted = true;

    const setupRealtimeSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !mounted) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('user_id', user.id)
          .single();

        if (!profile || !mounted) return;

        // Subscribe to new chat notifications
        const channel = supabase
          .channel('chat_notifications_changes')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'chat_notifications',
              filter: `recipient_id=eq.${profile.id}`
            },
            async (payload) => {
              if (!mounted) return;

              // Fetch the complete notification data
              const { data: newNotification } = await supabase
                .from('chat_notifications')
                .select(`
                  id,
                  message_id,
                  project_id,
                  is_read,
                  created_at
                `)
                .eq('id', payload.new.id)
                .single();

              if (newNotification) {
                // Get message details
                const { data: message } = await supabase
                  .from('project_chat')
                  .select('id, message, sender_id, sender_name, sender_avatar')
                  .eq('id', newNotification.message_id)
                  .single();

                // Get project details
                const { data: project } = await supabase
                  .from('client_projects')
                  .select('id, project_name')
                  .eq('id', newNotification.project_id)
                  .single();

                if (message && project) {
                  const formattedNotification: ChatNotification = {
                    id: newNotification.id,
                    messageId: newNotification.message_id,
                    projectId: newNotification.project_id,
                    projectName: project.project_name,
                    senderName: message.sender_name || 'Usuario',
                    senderAvatar: message.sender_avatar,
                    content: message.message,
                    timestamp: newNotification.created_at,
                    isRead: newNotification.is_read,
                    recipientId: profile.id,
                    recipientType: profile.role === 'client' ? 'client' : 'employee'
                  };

                  setNotifications(prev => [formattedNotification, ...prev]);
                  setLatestNotification(formattedNotification);

                  // Request permission for browser notifications if not granted
                  if ('Notification' in window && Notification.permission === 'default') {
                    await Notification.requestPermission();
                  }

                  // Show browser notification if permission granted and page not visible
                  if ('Notification' in window && 
                      Notification.permission === 'granted' && 
                      document.visibilityState === 'hidden') {
                    new Notification(`Nuevo mensaje de ${formattedNotification.senderName}`, {
                      body: formattedNotification.content,
                      icon: '/favicon.ico',
                      tag: 'chat-notification'
                    });
                  }
                }
              }
            }
          )
          .subscribe();

        return () => {
          if (mounted) {
            supabase.removeChannel(channel);
          }
        };
      } catch (error) {
        console.error('Error setting up realtime subscription:', error);
      }
    };

    setupRealtimeSubscription();
    loadNotifications();

    return () => {
      mounted = false;
    };
  }, [loadNotifications]);

  // Register service worker for background notifications
  useEffect(() => {
    serviceWorkerManager.register();
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return {
    notifications,
    unreadCount,
    latestNotification,
    markAsRead,
    markAllAsRead,
    refreshNotifications: loadNotifications
  };
}