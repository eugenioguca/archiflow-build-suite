import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

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
      const { data, error } = await supabase
        .from('client_project_calendar_events')
        .select('*')
        .eq('client_project_id', projectId)
        .order('start_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
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
      const { data, error } = await supabase
        .from('client_project_calendar_events')
        .insert([{
          ...eventData,
          client_project_id: projectId
        }])
        .select()
        .single();

      if (error) throw error;

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
      const { error } = await supabase
        .from('client_project_calendar_events')
        .update(eventData)
        .eq('id', eventId);

      if (error) throw error;

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