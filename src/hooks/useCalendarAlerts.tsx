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
    console.log("🎵 Attempting to play sound:", soundType);
    const audio = new Audio(`/sounds/${soundType}-alert.mp3`);
    audio.play()
      .then(() => console.log("✅ Sound played successfully"))
      .catch((error) => {
        console.error("❌ Error playing sound:", error);
        // Fallback to system sound if available
        if ('Notification' in window) {
          new Notification('Recordatorio de Calendario', {
            body: 'Tienes un evento próximo',
            icon: '/favicon.ico'
          });
        }
      });
  }, []);

  const checkUpcomingAlerts = useCallback(async () => {
    if (!user) {
      console.log("❌ No user found for alerts");
      return;
    }

    console.log("🔔 Checking upcoming alerts for user:", user.id);

    try {
      const { data, error } = await supabase
        .rpc("get_upcoming_alerts", { user_uuid: user.id });

      if (error) {
        console.error("❌ Error calling get_upcoming_alerts:", error);
        throw error;
      }

      console.log("📊 Alerts data received:", data);

      if (data && data.length > 0) {
        setUpcomingAlerts(data as UpcomingAlert[]);
        
        // Process alerts that should trigger now
        const now = new Date();
        console.log("⏰ Current time:", now.toISOString());
        
        const triggeredAlerts = data.filter((alert: UpcomingAlert) => {
          const eventTime = new Date(alert.event_start_date);
          const timeDiff = eventTime.getTime() - now.getTime();
          
          console.log(`🎯 Alert "${alert.event_title}":`, {
            eventTime: eventTime.toISOString(),
            alertType: alert.alert_type,
            alertValue: alert.alert_value,
            timeDiff: Math.round(timeDiff / 1000 / 60), // minutes
            shouldTrigger: timeDiff <= 60000 // within 1 minute
          });
          
          // Trigger alert if event is within 1 minute
          return timeDiff <= 60000 && timeDiff > -300000; // within 1 minute but not more than 5 minutes past
        });

        console.log("🚨 Alerts to trigger now:", triggeredAlerts.length);

        for (const alert of triggeredAlerts) {
          console.log("🔔 Triggering alert:", alert.event_title);
          showAlert(alert as UpcomingAlert);
        }
      } else {
        console.log("📭 No upcoming alerts found");
      }
    } catch (error) {
      console.error("❌ Error checking alerts:", error);
    }
  }, [user]);

  const showAlert = useCallback((alert: UpcomingAlert) => {
    console.log("🚨 Showing alert:", alert.event_title);
    setActiveAlert(alert);
    
    if (alert.sound_enabled) {
      console.log("🔊 Playing sound:", alert.sound_type);
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
    if (!user) {
      console.log("❌ No user, skipping alert setup");
      return;
    }

    console.log("🚀 Setting up calendar alerts for user:", user.id);

    // Check alerts immediately
    checkUpcomingAlerts();

    // Set up interval to check every 30 seconds for better responsiveness
    console.log("⏱️ Setting up 30-second alert check interval");
    const interval = setInterval(checkUpcomingAlerts, 30000);

    return () => {
      console.log("🛑 Cleaning up alert interval");
      clearInterval(interval);
    };
  }, [user, checkUpcomingAlerts]);

  return {
    upcomingAlerts,
    activeAlert,
    dismissAlert,
  };
}