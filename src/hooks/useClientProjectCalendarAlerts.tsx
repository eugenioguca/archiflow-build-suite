import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";
import { useAuth } from "./useAuth";

export interface ClientProjectUpcomingAlert {
  event_id: string;
  event_title: string;
  event_start_date: string;
  alert_id: string;
  alert_type: string;
  alert_value: number;
  sound_enabled: boolean;
  sound_type: string;
  project_id: string;
  project_name: string;
  client_name: string;
}

export const useClientProjectCalendarAlerts = () => {
  const [upcomingAlerts, setUpcomingAlerts] = useState<ClientProjectUpcomingAlert[]>([]);
  const [activeAlert, setActiveAlert] = useState<ClientProjectUpcomingAlert | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const checkAlertsRef = useRef<() => Promise<void>>();

  const playAlertSound = (soundType: string) => {
    try {
      const audio = new Audio(`/sounds/${soundType}.mp3`);
      audio.volume = 0.7;
      audio.play().catch(() => {
        // Fallback to browser notification if audio fails
        if (Notification.permission === 'granted') {
          new Notification('Recordatorio de Proyecto', {
            body: 'Tienes una cita programada próximamente',
            icon: '/favicon.ico'
          });
        }
      });
    } catch (error) {
      console.warn('Could not play alert sound:', error);
    }
  };

  const showAlert = (alert: ClientProjectUpcomingAlert) => {
    setActiveAlert(alert);
    
    // Show toast notification
    toast({
      title: `🔔 ${alert.event_title}`,
      description: `Proyecto: ${alert.project_name} - Cliente: ${alert.client_name}`,
      duration: 8000,
    });

    // Play sound if enabled
    if (alert.sound_enabled) {
      playAlertSound(alert.sound_type);
    }

    // Mark alert as triggered
    markAlertAsTriggered(alert.alert_id);
  };

  checkAlertsRef.current = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_upcoming_client_project_alerts', {
        user_uuid: user.id
      });

      if (error) {
        console.error('Error fetching upcoming project calendar alerts:', error);
        return;
      }

      setUpcomingAlerts(data || []);

      // Check for alerts that should be triggered (within 1 minute of alert time)
      const now = new Date();
      const alertsToTrigger = (data || []).filter((alert: ClientProjectUpcomingAlert) => {
        const eventDate = new Date(alert.event_start_date);
        const alertTime = new Date(eventDate);
        
        // Calculate alert time based on type
        switch (alert.alert_type) {
          case 'minutes':
            alertTime.setMinutes(alertTime.getMinutes() - alert.alert_value);
            break;
          case 'hours':
            alertTime.setHours(alertTime.getHours() - alert.alert_value);
            break;
          case 'days':
            alertTime.setDate(alertTime.getDate() - alert.alert_value);
            break;
        }

        // Trigger if we're within 1 minute of the alert time
        const timeDiff = Math.abs(now.getTime() - alertTime.getTime());
        return timeDiff <= 60000; // 1 minute in milliseconds
      });

      // Show alerts that need to be triggered
      alertsToTrigger.forEach(showAlert);

    } catch (error) {
      console.error('Error in checkAlerts:', error);
    }
  };

  const markAlertAsTriggered = async (alertId: string) => {
    try {
      await supabase
        .from('client_project_calendar_event_alerts')
        .update({ is_triggered: true })
        .eq('id', alertId);
    } catch (error) {
      console.error('Error marking alert as triggered:', error);
    }
  };

  const dismissAlert = () => {
    setActiveAlert(null);
  };

  useEffect(() => {
    if (!user) return;

    // Check alerts immediately
    if (checkAlertsRef.current) {
      checkAlertsRef.current();
    }

    // Set up interval to check for alerts every 30 seconds
    const interval = setInterval(() => {
      if (checkAlertsRef.current) {
        checkAlertsRef.current();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  return {
    upcomingAlerts,
    activeAlert,
    dismissAlert
  };
};