import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";
import { useAuth } from "./useAuth";
import { generateAlertSound } from "@/utils/audioGenerator";

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
    console.log(`Playing generated client project sound: ${soundType}`);
    generateAlertSound(soundType as 'soft' | 'professional' | 'loud' | 'uh-oh' | 'airport')
      .catch((error) => {
        console.error(`Error playing generated sound ${soundType}:`, error);
        // Fallback to browser notification
        if (Notification.permission === 'granted') {
          new Notification('Recordatorio de Proyecto', {
            body: 'Tienes un evento de proyecto próximo',
            icon: '/favicon.ico'
          });
        }
      });
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
        console.log(`Project calendar alert check: Event "${alert.event_title}" (Project: ${alert.project_name}) alert time: ${alertTime.toISOString()}, now: ${now.toISOString()}, diff: ${timeDiff}ms`);
        return timeDiff <= 60000; // 1 minute in milliseconds
      });

      // Show alerts that need to be triggered
      alertsToTrigger.forEach(alert => {
        console.log(`Triggering project calendar alert: ${alert.event_title} for project ${alert.project_name}`);
        showAlert(alert);
      });

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

    // Initial check only - no intervals
    if (checkAlertsRef.current) {
      checkAlertsRef.current();
    }

    // Set up realtime subscription for project event changes
    const channel = supabase
      .channel('client-project-alerts-subscription')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_project_calendar_events'
        },
        () => {
          // Trigger alert check when project events change
          if (checkAlertsRef.current) {
            checkAlertsRef.current();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_project_calendar_event_alerts'
        },
        () => {
          // Trigger alert check when project alerts change
          if (checkAlertsRef.current) {
            checkAlertsRef.current();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    upcomingAlerts,
    activeAlert,
    dismissAlert
  };
};