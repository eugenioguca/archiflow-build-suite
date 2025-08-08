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
  alert_type: 'popup' | 'email';
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

  // Crear evento
  const createEventMutation = useMutation({
    mutationFn: async (eventData: Omit<PersonalEvent, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('personal_events')
        .insert([eventData])
        .select()
        .single();

      if (error) throw error;
      return data;
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
      message 
    }: { 
      invitationId: string; 
      status: 'accepted' | 'declined';
      message?: string;
    }) => {
      const { data, error } = await supabase
        .from('event_invitations')
        .update({
          status,
          response_date: new Date().toISOString(),
          response_message: message
        })
        .eq('id', invitationId)
        .select()
        .single();

      if (error) throw error;
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
    isCreating: createEventMutation.isPending,
    isUpdating: updateEventMutation.isPending,
    isDeleting: deleteEventMutation.isPending,
  };
};