import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

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

  const playAlertSound = useCallback((soundType: string) => {
    const audio = new Audio(`/sounds/${soundType}-alert.mp3`);
    audio.play().catch(console.error);
  }, []);

  const checkUpcomingAlerts = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc("get_upcoming_alerts", { user_uuid: user.id });

      if (error) throw error;

      if (data && data.length > 0) {
        setUpcomingAlerts(data as UpcomingAlert[]);
        
        // Process immediate alerts (within 1 minute)
        const immediateAlerts = data.filter((alert: UpcomingAlert) => {
          const eventTime = new Date(alert.event_start_date);
          const now = new Date();
          const timeDiff = eventTime.getTime() - now.getTime();
          
          if (alert.alert_type === "minutes") {
            return timeDiff <= alert.alert_value * 60 * 1000;
          }
          return false;
        });

        for (const alert of immediateAlerts) {
          showAlert(alert as UpcomingAlert);
        }
      }
    } catch (error) {
      console.error("Error checking alerts:", error);
    }
  }, [user]);

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
    if (!user) return;

    // Check alerts immediately
    checkUpcomingAlerts();

    // Set up interval to check every minute
    const interval = setInterval(checkUpcomingAlerts, 60000);

    return () => clearInterval(interval);
  }, [user, checkUpcomingAlerts]);

  return {
    upcomingAlerts,
    activeAlert,
    dismissAlert,
  };
}