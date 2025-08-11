import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  all_day: boolean;
  color: string;
  location?: string;
  alerts?: EventAlert[];
}

export interface EventAlert {
  id?: string;
  event_id?: string;
  alert_type: "minutes" | "hours" | "days";
  alert_value: number;
  sound_enabled: boolean;
  sound_type: "soft" | "professional" | "loud";
  is_triggered?: boolean;
}

export function usePersonalCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEvents = async () => {
    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from("personal_calendar_events")
        .select("*")
        .order("start_date", { ascending: true });

      if (eventsError) throw eventsError;

      // Fetch alerts for each event
      const eventsWithAlerts = await Promise.all(
        (eventsData || []).map(async (event) => {
          const { data: alertsData } = await supabase
            .from("event_alerts")
            .select("*")
            .eq("event_id", event.id)
            .order("alert_value", { ascending: true });

          return {
            ...event,
            alerts: alertsData || [],
          };
        })
      );

      setEvents(eventsWithAlerts as CalendarEvent[]);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los eventos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (eventData: Partial<CalendarEvent> & { alerts?: Partial<EventAlert>[] }) => {
    try {
      const { alerts, ...eventFields } = eventData;
      
      const { data: newEvent, error: eventError } = await supabase
        .from("personal_calendar_events")
        .insert([eventFields as any])
        .select()
        .single();

      if (eventError) throw eventError;

      // Create alerts if provided
      if (alerts && alerts.length > 0) {
        const alertsToCreate = alerts.map(alert => ({
          ...alert,
          event_id: newEvent.id,
        }));

        const { error: alertsError } = await supabase
          .from("event_alerts")
          .insert(alertsToCreate);

        if (alertsError) throw alertsError;
      }

      toast({
        title: "Evento creado",
        description: "El evento se creó exitosamente",
      });

      await fetchEvents();
    } catch (error) {
      console.error("Error creating event:", error);
      toast({
        title: "Error",
        description: "No se pudo crear el evento",
        variant: "destructive",
      });
    }
  };

  const updateEvent = async (eventId: string, eventData: Partial<CalendarEvent> & { alerts?: Partial<EventAlert>[] }) => {
    try {
      const { alerts, ...eventFields } = eventData;

      const { error: eventError } = await supabase
        .from("personal_calendar_events")
        .update(eventFields)
        .eq("id", eventId);

      if (eventError) throw eventError;

      // Update alerts
      if (alerts) {
        // Delete existing alerts
        await supabase
          .from("event_alerts")
          .delete()
          .eq("event_id", eventId);

        // Create new alerts
        if (alerts.length > 0) {
          const alertsToCreate = alerts.map(alert => ({
            ...alert,
            event_id: eventId,
          }));

          const { error: alertsError } = await supabase
            .from("event_alerts")
            .insert(alertsToCreate);

          if (alertsError) throw alertsError;
        }
      }

      toast({
        title: "Evento actualizado",
        description: "El evento se actualizó exitosamente",
      });

      await fetchEvents();
    } catch (error) {
      console.error("Error updating event:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el evento",
        variant: "destructive",
      });
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from("personal_calendar_events")
        .delete()
        .eq("id", eventId);

      if (error) throw error;

      toast({
        title: "Evento eliminado",
        description: "El evento se eliminó exitosamente",
      });

      await fetchEvents();
    } catch (error) {
      console.error("Error deleting event:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el evento",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return {
    events,
    loading,
    createEvent,
    updateEvent,
    deleteEvent,
    refreshEvents: fetchEvents,
  };
}