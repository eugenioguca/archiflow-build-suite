import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type SoundType = 'none' | 'icq' | 'soft' | 'loud';

export interface EventAlert {
  id: string;
  event_id: string;
  alert_minutes_before: number;
  alert_type: 'popup' | 'email' | 'sound';
  sound_type?: SoundType;
  is_active: boolean;
}

export interface AlertConfig {
  minutes_before: number;
  alert_type: 'popup' | 'email' | 'sound';
  sound_type?: SoundType;
}

const SOUND_FILES = {
  icq: '/sounds/icq-message.mp3',
  soft: '/sounds/soft-alert.mp3',
  loud: '/sounds/professional-alert.mp3'
};

export const useEventAlerts = () => {
  const { user } = useAuth();
  const [activeAlerts, setActiveAlerts] = useState<Map<string, NodeJS.Timeout>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio element
    audioRef.current = new Audio();
    audioRef.current.volume = 0.7;

    return () => {
      // Clear all timeouts on unmount
      activeAlerts.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  const createEventAlert = async (eventId: string, config: AlertConfig) => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('event_alerts')
        .insert({
          event_id: eventId,
          alert_minutes_before: config.minutes_before,
          alert_type: config.alert_type,
          sound_type: config.sound_type,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating event alert:', error);
      throw error;
    }
  };

  const scheduleEventAlerts = async (eventId: string, eventStartDate: string) => {
    try {
      // Get all alerts for this event
      const { data: alerts, error } = await supabase
        .from('event_alerts')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_active', true);

      if (error) throw error;
      if (!alerts || alerts.length === 0) return;

      const eventStart = new Date(eventStartDate);
      const now = new Date();

      alerts.forEach(alert => {
        const alertTime = new Date(eventStart.getTime() - (alert.alert_minutes_before * 60 * 1000));
        
        if (alertTime > now) {
          const timeout = setTimeout(() => {
            triggerAlert({
              ...alert,
              alert_type: alert.alert_type as 'popup' | 'email' | 'sound',
              sound_type: alert.sound_type as SoundType
            });
          }, alertTime.getTime() - now.getTime());

          setActiveAlerts(prev => new Map(prev.set(`${eventId}-${alert.id}`, timeout)));
        }
      });
    } catch (error) {
      console.error('Error scheduling event alerts:', error);
    }
  };

  const triggerAlert = (alert: EventAlert) => {
    switch (alert.alert_type) {
      case 'popup':
        showPopupAlert(alert);
        break;
      case 'sound':
        if (alert.sound_type && alert.sound_type !== 'none') {
          playAlertSound(alert.sound_type);
        }
        break;
      case 'email':
        // Email alerts would be handled server-side
        console.log('Email alert triggered for event:', alert.event_id);
        break;
    }
  };

  const showPopupAlert = (alert: EventAlert) => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('Recordatorio de evento', {
          body: `Tu evento comienza en ${alert.alert_minutes_before} minutos`,
          icon: '/favicon.ico'
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('Recordatorio de evento', {
              body: `Tu evento comienza en ${alert.alert_minutes_before} minutos`,
              icon: '/favicon.ico'
            });
          }
        });
      }
    }
  };

  const playAlertSound = (soundType: SoundType) => {
    if (!audioRef.current || soundType === 'none') return;

    const soundFile = SOUND_FILES[soundType];
    if (soundFile) {
      audioRef.current.src = soundFile;
      audioRef.current.play().catch(error => {
        console.error('Error playing alert sound:', error);
      });
    }
  };

  const testSound = (soundType: SoundType) => {
    playAlertSound(soundType);
  };

  const removeEventAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('event_alerts')
        .delete()
        .eq('id', alertId);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing event alert:', error);
      throw error;
    }
  };

  const getEventAlerts = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('event_alerts')
        .select('*')
        .eq('event_id', eventId)
        .order('alert_minutes_before', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting event alerts:', error);
      return [];
    }
  };

  return {
    createEventAlert,
    scheduleEventAlerts,
    testSound,
    removeEventAlert,
    getEventAlerts,
    triggerAlert
  };
};