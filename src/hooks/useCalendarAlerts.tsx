import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { generateAlertSound } from "@/utils/audioGenerator";

interface UpcomingAlert {
  event_id: string;
  event_title: string;
  event_start_date: string;
  alert_id: string;
  alert_type: "minutes" | "hours" | "days";
  alert_value: number;
  sound_enabled: boolean;
  sound_type: "soft" | "professional" | "loud";
}

export function useCalendarAlerts() {
  const [upcomingAlerts, setUpcomingAlerts] = useState<UpcomingAlert[]>([]);
  const [activeAlert, setActiveAlert] = useState<UpcomingAlert | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const checkAlertsRef = useRef<(() => Promise<void>) | null>(null);

  const playAlertSound = useCallback((soundType: string) => {
    console.log(`Playing generated sound: ${soundType}`);
    generateAlertSound(soundType as 'soft' | 'professional' | 'loud' | 'uh-oh')
      .catch((error) => {
        console.error(`Error playing generated sound ${soundType}:`, error);
        // Fallback to browser notification
        if (Notification.permission === 'granted') {
          new Notification('Recordatorio de Calendario', {
            body: 'Tienes un evento próximo',
            icon: '/favicon.ico'
          });
        }
      });
  }, []);

  const showAlert = useCallback((alert: UpcomingAlert) => {
    setActiveAlert(alert);
    
    if (alert.sound_enabled) {
      playAlertSound(alert.sound_type);
    }

    toast({
      title: `Recordatorio: ${alert.event_title}`,
      description: `Evento en ${alert.alert_value} ${
        alert.alert_type === "minutes" ? "minutos" :
        alert.alert_type === "hours" ? "horas" : "días"
      }`,
      duration: 10000,
    });

    // Mark alert as triggered
    markAlertAsTriggered(alert.alert_id);
  }, [playAlertSound, toast]);

  // Create a stable ref for the check function
  checkAlertsRef.current = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .rpc("get_upcoming_alerts", { user_uuid: user.id });

      if (error) throw error;

      if (data && data.length > 0) {
        setUpcomingAlerts(data as UpcomingAlert[]);
        
        // Process alerts that should trigger now
        const now = new Date();
        const triggeredAlerts = data.filter((alert: UpcomingAlert) => {
          const eventTime = new Date(alert.event_start_date);
          const timeDiff = eventTime.getTime() - now.getTime();
          
          // Trigger alert if event is within 1 minute
          return timeDiff <= 60000 && timeDiff > -300000;
        });

        for (const alert of triggeredAlerts) {
          showAlert(alert as UpcomingAlert);
        }
      }
    } catch (error) {
      console.error("Error checking alerts:", error);
    }
  }, [user?.id, showAlert]);

  const markAlertAsTriggered = async (alertId: string) => {
    try {
      await supabase
        .from("event_alerts")
        .update({ is_triggered: true })
        .eq("id", alertId);
    } catch (error) {
      console.error("Error marking alert as triggered:", error);
    }
  };

  const dismissAlert = () => {
    setActiveAlert(null);
  };

  useEffect(() => {
    if (!user?.id) return;

    let interval: NodeJS.Timeout | null = null;

    // Use ref to access current function without dependencies
    const checkAlerts = () => {
      if (checkAlertsRef.current) {
        checkAlertsRef.current();
      }
    };

    // Start checking alerts immediately
    checkAlerts();

    // Set up interval
    interval = setInterval(checkAlerts, 30000);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [user?.id]); // Only depend on user.id

  return {
    upcomingAlerts,
    activeAlert,
    dismissAlert,
  };
}