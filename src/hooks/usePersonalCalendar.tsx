import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "@/hooks/use-toast";

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
  created_by?: string;
}

export interface EventAlert {
  id: string;
  event_id: string;
  user_id?: string;
  alert_minutes_before: number;
  alert_type: 'popup' | 'email' | 'sound';
  sound_type?: string;
  is_active: boolean;
}


export const usePersonalCalendar = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Obtener eventos del usuario con manejo de errores optimizado
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
        
        return data as PersonalEvent[];
      } catch (err) {
        console.error('Failed to fetch personal events:', err);
        throw err;
      }
    },
    enabled: !!user?.id,
    retry: 3,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });


  // Crear evento personal optimizado
  const createEventMutation = useMutation({
    mutationFn: async (eventData: Omit<PersonalEvent, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'created_by'> & {
      alerts?: Array<{
        minutes_before: number;
        alert_type: 'popup' | 'email' | 'sound';
        sound_type?: string;
      }>;
    }) => {
      if (!user?.id) throw new Error('Usuario no autenticado');
      
      try {
        // Crear el evento personal sin referencias a invitaciones
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
            // No throw error for alerts, event was created successfully
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
      toast({
        title: "Evento creado",
        description: "El evento se ha creado correctamente.",
      });
    },
    onError: (error) => {
      console.error('Error creating event:', error);
      toast({
        title: "Error al crear evento",
        description: error instanceof Error ? error.message : "No se pudo crear el evento.",
        variant: "destructive",
      });
    },
  });

  // Actualizar evento con validación mejorada
  const updateEventMutation = useMutation({
    mutationFn: async ({ id, ...eventData }: Partial<PersonalEvent> & { id: string }) => {
      if (!user?.id) throw new Error('Usuario no autenticado');
      
      try {
        const { data, error } = await supabase
          .from('personal_events')
          .update(eventData)
          .eq('id', id)
          .eq('user_id', user.id) // Solo permitir actualizar propios eventos
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
      toast({
        title: "Evento actualizado",
        description: "El evento se ha actualizado correctamente.",
      });
    },
    onError: (error) => {
      console.error('Error updating event:', error);
      toast({
        title: "Error al actualizar evento",
        description: error instanceof Error ? error.message : "No se pudo actualizar el evento.",
        variant: "destructive",
      });
    },
  });

  // Eliminar evento con validación mejorada
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      if (!user?.id) throw new Error('Usuario no autenticado');
      
      try {
        // Primero eliminar alertas relacionadas
        await supabase
          .from('event_alerts')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', user.id);

        // Luego eliminar el evento
        const { error } = await supabase
          .from('personal_events')
          .delete()
          .eq('id', eventId)
          .eq('user_id', user.id); // Solo permitir eliminar propios eventos

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
      toast({
        title: "Evento eliminado",
        description: "El evento se ha eliminado correctamente.",
      });
    },
    onError: (error) => {
      console.error('Error deleting event:', error);
      toast({
        title: "Error al eliminar evento",
        description: error instanceof Error ? error.message : "No se pudo eliminar el evento.",
        variant: "destructive",
      });
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