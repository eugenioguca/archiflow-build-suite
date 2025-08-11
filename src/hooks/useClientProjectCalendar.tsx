import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

export interface ClientProjectCalendarEventAlert {
  id: string;
  event_id: string;
  alert_type: 'minutes' | 'hours' | 'days';
  alert_value: number;
  sound_enabled: boolean;
  sound_type: 'soft-alert' | 'professional-alert' | 'loud-alert' | 'icq-message';
  is_triggered: boolean;
}

export interface ClientProjectCalendarEvent {
  id: string;
  client_project_id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  event_type: string;
  location?: string;
  all_day: boolean;
  color?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  alerts?: ClientProjectCalendarEventAlert[];
}

export const useClientProjectCalendar = (projectId: string | null) => {
  const [events, setEvents] = useState<ClientProjectCalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchEvents = async () => {
    if (!projectId) {
      setEvents([]);
      return;
    }

    setLoading(true);
    try {
      // Fetch events with their alerts
      const { data, error } = await supabase
        .from('client_project_calendar_events')
        .select(`
          *,
          alerts:client_project_calendar_event_alerts(*)
        `)
        .eq('client_project_id', projectId)
        .order('start_date', { ascending: true });

      if (error) throw error;
      
      // Transform data to match interface types
      const transformedEvents = (data || []).map(event => ({
        ...event,
        alerts: (event.alerts || []).map((alert: any) => ({
          ...alert,
          alert_type: alert.alert_type as 'minutes' | 'hours' | 'days',
          sound_type: alert.sound_type as 'soft-alert' | 'professional-alert' | 'loud-alert' | 'icq-message'
        }))
      }));
      
      setEvents(transformedEvents);
    } catch (error: any) {
      console.error("Error fetching client project calendar events:", error);
      toast({
        title: "Error al cargar calendario",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (eventData: Omit<ClientProjectCalendarEvent, 'id' | 'created_at' | 'updated_at'>) => {
    if (!projectId) return false;

    try {
      // Separate alerts from event data
      const { alerts, ...eventDataWithoutAlerts } = eventData;

      // Create the event first
      const { data: eventResult, error: eventError } = await supabase
        .from('client_project_calendar_events')
        .insert([{
          ...eventDataWithoutAlerts,
          client_project_id: projectId
        }])
        .select()
        .single();

      if (eventError) throw eventError;

      // If there are alerts, create them
      if (alerts && alerts.length > 0) {
        const alertsToInsert = alerts.map(alert => ({
          event_id: eventResult.id,
          alert_type: alert.alert_type,
          alert_value: alert.alert_value,
          sound_enabled: alert.sound_enabled,
          sound_type: alert.sound_type
        }));

        const { error: alertsError } = await supabase
          .from('client_project_calendar_event_alerts')
          .insert(alertsToInsert);

        if (alertsError) {
          console.error("Error creating alerts:", alertsError);
          // Don't fail the entire operation if alerts fail
        }
      }

      await fetchEvents();
      
      toast({
        title: "Evento creado",
        description: `Se ha creado el evento: ${eventData.title}`,
      });

      return true;
    } catch (error: any) {
      console.error("Error creating client project calendar event:", error);
      toast({
        title: "Error al crear evento",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
  };

  const updateEvent = async (eventId: string, eventData: Partial<ClientProjectCalendarEvent>) => {
    try {
      // Separate alerts from event data
      const { alerts, ...eventDataWithoutAlerts } = eventData;

      // Update the event
      const { error: eventError } = await supabase
        .from('client_project_calendar_events')
        .update(eventDataWithoutAlerts)
        .eq('id', eventId);

      if (eventError) throw eventError;

      // If alerts are provided, update them
      if (alerts !== undefined) {
        // First, delete existing alerts
        const { error: deleteError } = await supabase
          .from('client_project_calendar_event_alerts')
          .delete()
          .eq('event_id', eventId);

        if (deleteError) {
          console.error("Error deleting existing alerts:", deleteError);
        }

        // Then insert new alerts if any
        if (alerts.length > 0) {
          const alertsToInsert = alerts.map(alert => ({
            event_id: eventId,
            alert_type: alert.alert_type,
            alert_value: alert.alert_value,
            sound_enabled: alert.sound_enabled,
            sound_type: alert.sound_type
          }));

          const { error: alertsError } = await supabase
            .from('client_project_calendar_event_alerts')
            .insert(alertsToInsert);

          if (alertsError) {
            console.error("Error creating new alerts:", alertsError);
          }
        }
      }

      await fetchEvents();
      
      toast({
        title: "Evento actualizado",
        description: "El evento se ha actualizado correctamente",
      });

      return true;
    } catch (error: any) {
      console.error("Error updating client project calendar event:", error);
      toast({
        title: "Error al actualizar evento",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('client_project_calendar_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      await fetchEvents();
      
      toast({
        title: "Evento eliminado",
        description: "El evento se ha eliminado correctamente",
      });

      return true;
    } catch (error: any) {
      console.error("Error deleting client project calendar event:", error);
      toast({
        title: "Error al eliminar evento",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    fetchEvents();

    // Set up real-time subscription for calendar events
    if (projectId) {
      const channel = supabase
        .channel(`client_project_calendar_events:${projectId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'client_project_calendar_events',
            filter: `client_project_id=eq.${projectId}`
          },
          (payload) => {
            console.log('Calendar event change:', payload);
            // Refresh events when changes occur
            fetchEvents();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [projectId]);

  return {
    events,
    loading,
    createEvent,
    updateEvent,
    deleteEvent,
    refreshEvents: fetchEvents
  };
};