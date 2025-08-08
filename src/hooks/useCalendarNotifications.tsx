import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

export interface CalendarNotification {
  id: string;
  event_id: string;
  inviter_name: string;
  event_title: string;
  event_start_date: string;
  created_at: string;
}

export const useCalendarNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<CalendarNotification[]>([]);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to new event invitations
    const channel = supabase
      .channel(`user-invitations-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'event_invitations',
          filter: `invitee_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('New invitation received:', payload);
          
          // Fetch invitation details
          const { data: invitationData } = await supabase
            .from('event_invitations')
            .select(`
              *,
              event:personal_events(*),
              inviter:profiles!inviter_id(full_name)
            `)
            .eq('id', payload.new.id)
            .single();

          if (invitationData) {
            const notification: CalendarNotification = {
              id: invitationData.id,
              event_id: invitationData.event_id,
              inviter_name: invitationData.inviter?.full_name || 'Usuario desconocido',
              event_title: invitationData.event?.title || 'Evento sin título',
              event_start_date: invitationData.event?.start_date || '',
              created_at: invitationData.created_at
            };

            setNotifications(prev => [notification, ...prev]);
            setHasNewNotifications(true);

            // Show toast notification
            toast({
              title: "Nueva invitación de calendario",
              description: `${notification.inviter_name} te ha invitado a: ${notification.event_title}`,
              duration: 5000,
            });

            // Play notification sound if enabled
            playNotificationSound();
          }

          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['received-invitations'] });
          queryClient.invalidateQueries({ queryKey: ['personal-events'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(console.error);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  const markAsRead = () => {
    setHasNewNotifications(false);
    setNotifications([]);
  };

  const clearNotifications = () => {
    setNotifications([]);
    setHasNewNotifications(false);
  };

  return {
    notifications,
    hasNewNotifications,
    markAsRead,
    clearNotifications,
    notificationCount: notifications.length
  };
};