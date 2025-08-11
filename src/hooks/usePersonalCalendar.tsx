import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface PersonalEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  location?: string;
  start_date: string;
  end_date: string;
  is_all_day: boolean;
  event_type: 'event' | 'reminder' | 'meeting';
  created_at: string;
  updated_at: string;
}

export interface CreateEventData {
  title: string;
  description?: string;
  location?: string;
  start_date: string;
  end_date: string;
  is_all_day: boolean;
  event_type: 'event' | 'reminder' | 'meeting';
  alerts?: Array<{
    minutes_before: number;
    alert_type: 'popup' | 'email' | 'sound';
    sound_type?: string;
  }>;
}

export const usePersonalCalendar = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Obtener eventos del usuario
  const {
    data: events = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['personal-events', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      try {
        const { data, error } = await supabase
          .from('personal_events')
          .select('*')
          .eq('user_id', user.id)
          .order('start_date', { ascending: true });

        if (error) {
          console.error('Error fetching personal events:', error);
          throw error;
        }
        
        return (data || []) as PersonalEvent[];
      } catch (err) {
        console.error('Failed to fetch personal events:', err);
        throw err;
      }
    },
    enabled: !!user?.id,
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
  });

  // Crear evento personal
  const createEventMutation = useMutation({
    mutationFn: async (eventData: CreateEventData) => {
      if (!user?.id) throw new Error('Usuario no autenticado');
      
      try {
        // Crear el evento personal
        const { data: event, error: eventError } = await supabase
          .from('personal_events')
          .insert([{
            title: eventData.title,
            description: eventData.description,
            location: eventData.location,
            start_date: eventData.start_date,
            end_date: eventData.end_date,
            is_all_day: eventData.is_all_day,
            event_type: eventData.event_type,
            user_id: user.id
          }])
          .select()
          .single();

        if (eventError) {
          console.error('Error creating event:', eventError);
          throw eventError;
        }

        // Crear alertas si están configuradas
        if (eventData.alerts && eventData.alerts.length > 0) {
          const alerts = eventData.alerts.map(alert => ({
            event_id: event.id,
            user_id: user.id,
            alert_minutes_before: alert.minutes_before,
            alert_type: alert.alert_type,
            sound_type: alert.sound_type,
            is_active: true
          }));

          const { error: alertError } = await supabase
            .from('event_alerts')
            .insert(alerts);

          if (alertError) {
            console.error('Error creating alerts:', alertError);
          }
        }

        return event;
      } catch (err) {
        console.error('Failed to create event:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-events'] });
      toast.success("Evento creado correctamente");
    },
    onError: (error) => {
      console.error('Error creating event:', error);
      toast.error(error instanceof Error ? error.message : "No se pudo crear el evento.");
    },
  });

  // Actualizar evento
  const updateEventMutation = useMutation({
    mutationFn: async ({ id, ...eventData }: Partial<PersonalEvent> & { id: string }) => {
      if (!user?.id) throw new Error('Usuario no autenticado');
      
      try {
        const { data, error } = await supabase
          .from('personal_events')
          .update(eventData)
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating event:', error);
          throw error;
        }
        
        return data;
      } catch (err) {
        console.error('Failed to update event:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-events'] });
      toast.success("Evento actualizado correctamente");
    },
    onError: (error) => {
      console.error('Error updating event:', error);
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el evento.");
    },
  });

  // Eliminar evento
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      if (!user?.id) throw new Error('Usuario no autenticado');
      
      try {
        // Eliminar el evento
        const { error } = await supabase
          .from('personal_events')
          .delete()
          .eq('id', eventId)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error deleting event:', error);
          throw error;
        }
      } catch (err) {
        console.error('Failed to delete event:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-events'] });
      toast.success("Evento eliminado correctamente");
    },
    onError: (error) => {
      console.error('Error deleting event:', error);
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el evento.");
    },
  });

  return {
    events,
    isLoading,
    error,
    createEvent: createEventMutation.mutate,
    updateEvent: updateEventMutation.mutate,
    deleteEvent: deleteEventMutation.mutate,
    isCreating: createEventMutation.isPending,
    isUpdating: updateEventMutation.isPending,
    isDeleting: deleteEventMutation.isPending,
  };
};