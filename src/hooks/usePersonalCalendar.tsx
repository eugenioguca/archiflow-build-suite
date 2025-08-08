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
  alerts?: EventAlert[];
  invitations?: EventInvitation[];
  participants?: EventParticipant[];
}

export interface EventAlert {
  id: string;
  event_id: string;
  alert_minutes_before: number;
  alert_type: 'popup' | 'email' | 'sound';
  sound_type?: string;
  is_active: boolean;
}

export interface EventInvitation {
  id: string;
  event_id: string;
  inviter_id: string;
  invitee_id: string;
  status: 'pending' | 'accepted' | 'declined';
  response_date?: string;
  response_message?: string;
  invitee?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface EventParticipant {
  id: string;
  event_id: string;
  user_id: string;
  participation_status: 'confirmed' | 'tentative' | 'declined';
  user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface TeamMember {
  user_id: string;
  profile_id: string;
  full_name: string;
  email: string;
  user_role: string;
  user_position?: string;
  department?: string;
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

      const { data, error } = await supabase
        .from('personal_events')
        .select(`
          *,
          alerts:event_alerts(*),
          invitations:event_invitations(
            *,
            invitee:profiles!invitee_id(id, full_name, email)
          ),
          participants:event_participants(
            *,
            user:profiles!user_id(id, full_name, email)
          )
        `)
        .order('start_date', { ascending: true });

      if (error) throw error;
      return data as PersonalEvent[];
    },
    enabled: !!user?.id,
  });

  // Obtener invitaciones recibidas
  const {
    data: receivedInvitations = [],
  } = useQuery({
    queryKey: ['received-invitations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return [];

      const { data, error } = await supabase
        .from('event_invitations')
        .select(`
          *,
          event:personal_events(*),
          inviter:profiles!inviter_id(id, full_name, email)
        `)
        .eq('invitee_id', profile.id)
        .eq('status', 'pending');

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Crear evento con invitaciones y alertas
  const createEventMutation = useMutation({
    mutationFn: async (eventData: Omit<PersonalEvent, 'id' | 'created_at' | 'updated_at' | 'user_id'> & {
      invitedUsers?: string[];
      alerts?: Array<{
        minutes_before: number;
        alert_type: 'popup' | 'email' | 'sound';
        sound_type?: string;
      }>;
    }) => {
      if (!user?.id) throw new Error('Usuario no autenticado');
      
      // Crear el evento
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
          user_id: user.id,
          created_by: user.id
        }])
        .select()
        .single();

      if (eventError) throw eventError;

      // Crear invitaciones si hay usuarios invitados
      if (eventData.invitedUsers && eventData.invitedUsers.length > 0) {
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (currentProfile) {
          const invitations = eventData.invitedUsers.map(profileId => ({
            event_id: event.id,
            inviter_id: currentProfile.id,
            invitee_id: profileId,
            status: 'pending' as const
          }));

          const { error: invitationError } = await supabase
            .from('event_invitations')
            .insert(invitations);

          if (invitationError) console.error('Error creating invitations:', invitationError);
        }
      }

      // Crear alertas si hay alertas configuradas
      if (eventData.alerts && eventData.alerts.length > 0) {
        const alerts = eventData.alerts.map(alert => ({
          event_id: event.id,
          alert_minutes_before: alert.minutes_before,
          alert_type: alert.alert_type,
          sound_type: alert.sound_type,
          is_active: true
        }));

        const { error: alertError } = await supabase
          .from('event_alerts')
          .insert(alerts);

        if (alertError) console.error('Error creating alerts:', alertError);
      }

      return event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-events'] });
      toast({
        title: "Evento creado",
        description: "El evento se ha creado correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo crear el evento.",
        variant: "destructive",
      });
    },
  });

  // Actualizar evento
  const updateEventMutation = useMutation({
    mutationFn: async ({ id, ...eventData }: Partial<PersonalEvent> & { id: string }) => {
      const { data, error } = await supabase
        .from('personal_events')
        .update(eventData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-events'] });
      toast({
        title: "Evento actualizado",
        description: "El evento se ha actualizado correctamente.",
      });
    },
  });

  // Eliminar evento
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from('personal_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-events'] });
      toast({
        title: "Evento eliminado",
        description: "El evento se ha eliminado correctamente.",
      });
    },
  });

  // Responder a invitación
  const respondToInvitationMutation = useMutation({
    mutationFn: async ({ 
      invitationId, 
      status, 
      message,
      eventData
    }: { 
      invitationId: string; 
      status: 'accepted' | 'declined';
      message?: string;
      eventData?: any;
    }) => {
      // Actualizar estado de invitación
      const { data, error } = await supabase
        .from('event_invitations')
        .update({
          status,
          response_date: new Date().toISOString(),
          response_message: message
        })
        .eq('id', invitationId)
        .select(`
          *,
          event:personal_events(*)
        `)
        .single();

      if (error) throw error;

      // Si se acepta, crear el evento en el calendario del usuario invitado
      if (status === 'accepted' && data.event && user?.id) {
        const { error: eventError } = await supabase
          .from('personal_events')
          .insert([{
            title: data.event.title,
            description: data.event.description,
            location: data.event.location,
            start_date: data.event.start_date,
            end_date: data.event.end_date,
            is_all_day: data.event.is_all_day,
            event_type: data.event.event_type,
            user_id: user.id,
            created_by: data.event.created_by // Mantener referencia al creador original
          }]);

        if (eventError) console.error('Error creating accepted event:', eventError);
      }

      return data;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['received-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['personal-events'] });
      toast({
        title: status === 'accepted' ? "Invitación aceptada" : "Invitación declinada",
        description: `Has ${status === 'accepted' ? 'aceptado' : 'declinado'} la invitación.`,
      });
    },
  });

  // Obtener miembros del equipo por proyecto
  const getProjectTeamMembers = async (projectId: string): Promise<TeamMember[]> => {
    const { data, error } = await supabase.rpc('get_project_team_members', {
      project_id_param: projectId
    });
    
    if (error) throw error;
    return data || [];
  };

  // Obtener usuarios por departamento
  const getUsersByDepartment = async (department: string): Promise<TeamMember[]> => {
    const { data, error } = await supabase.rpc('get_users_by_department', {
      department_param: department
    });
    
    if (error) throw error;
    return data || [];
  };

  // Obtener usuarios por posición
  const getUsersByPosition = async (position: string): Promise<TeamMember[]> => {
    const { data, error } = await supabase.rpc('get_users_by_position', {
      position_param: position
    });
    
    if (error) throw error;
    return data || [];
  };

  // Nueva función de búsqueda inteligente
  const searchUsersForInvitation = async (searchText: string = '', limit: number = 20): Promise<TeamMember[]> => {
    const { data, error } = await supabase.rpc('search_users_for_invitation', {
      search_text: searchText,
      limit_results: limit
    });
    
    if (error) throw error;
    return data || [];
  };

  return {
    events,
    receivedInvitations,
    isLoading,
    error,
    createEvent: createEventMutation.mutate,
    updateEvent: updateEventMutation.mutate,
    deleteEvent: deleteEventMutation.mutate,
    respondToInvitation: respondToInvitationMutation.mutate,
    getProjectTeamMembers,
    getUsersByDepartment,
    getUsersByPosition,
    searchUsersForInvitation,
    isCreating: createEventMutation.isPending,
    isUpdating: updateEventMutation.isPending,
    isDeleting: deleteEventMutation.isPending,
  };
};