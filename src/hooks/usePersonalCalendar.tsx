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

export interface EventInvitation {
  id: string;
  event_id: string;
  inviter_id: string;
  invitee_id: string;
  inviter_user_id?: string;
  invitee_user_id?: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at?: string;
  responded_at?: string;
  message?: string;
  event?: any;
  inviter?: any;
}

export interface EventParticipant {
  id: string;
  event_id: string;
  user_id: string;
  participation_status: 'confirmed' | 'tentative' | 'declined';
  added_at?: string;
}

export interface TeamMember {
  user_id: string | null;
  profile_id: string;
  full_name: string;
  email: string;
  user_role: string;
  user_position?: string;
  department?: string;
  user_type: 'employee' | 'client';
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
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: true });

      if (error) throw error;
      return data as PersonalEvent[];
    },
    enabled: !!user?.id,
  });

  // Obtener invitaciones recibidas usando las nuevas columnas user_id
  const {
    data: receivedInvitations = [],
  } = useQuery({
    queryKey: ['received-invitations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('event_invitations')
        .select(`
          *,
          event:personal_events(*),
          inviter:profiles!inviter_id(id, full_name, email)
        `)
        .eq('invitee_user_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;
      return data as EventInvitation[];
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
      
      // Obtener el profile.id del usuario autenticado para created_by
      const { data: currentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !currentProfile) {
        throw new Error('No se pudo obtener el perfil del usuario');
      }
      
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
          created_by: currentProfile.id
        }])
        .select()
        .single();

      if (eventError) throw eventError;

      // Crear invitaciones si hay usuarios invitados
      if (eventData.invitedUsers && eventData.invitedUsers.length > 0) {
        const invitations = [];
        
        for (const inviteeProfileId of eventData.invitedUsers) {
          // Obtener el user_id del invitado basado en su profile_id
          const { data: inviteeProfile } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('id', inviteeProfileId)
            .single();

          if (inviteeProfile?.user_id) {
            invitations.push({
              event_id: event.id,
              inviter_id: currentProfile.id,
              invitee_id: inviteeProfileId,
              inviter_user_id: user.id,
              invitee_user_id: inviteeProfile.user_id,
              status: 'pending' as const
            });
          }
        }

        if (invitations.length > 0) {
          const { error: invitationError } = await supabase
            .from('event_invitations')
            .insert(invitations);

          if (invitationError) {
            console.error('Error creating invitations:', invitationError);
            throw new Error('Error al crear las invitaciones');
          }
        }
      }

      // Crear alertas si hay alertas configuradas
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
      console.error('Error creating event:', error);
      toast({
        title: "Error al crear evento",
        description: error instanceof Error ? error.message : "No se pudo crear el evento.",
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
        .eq('user_id', user?.id) // Solo permitir actualizar propios eventos
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
        .eq('id', eventId)
        .eq('user_id', user?.id); // Solo permitir eliminar propios eventos

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

  // Responder a invitación usando las nuevas funciones de la BD
  const respondToInvitationMutation = useMutation({
    mutationFn: async ({ 
      invitationId, 
      status
    }: { 
      invitationId: string; 
      status: 'accepted' | 'declined';
    }) => {
      if (status === 'accepted') {
        const { error } = await supabase.rpc('accept_event_invitation', {
          invitation_id: invitationId
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc('decline_event_invitation', {
          invitation_id: invitationId
        });
        if (error) throw error;
      }
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

  // Búsqueda de usuarios mejorada
  const searchUsersForInvitation = async (searchText: string = '', limit: number = 20): Promise<TeamMember[]> => {
    try {
      console.log('🔍 Searching users with direct queries:', searchText);
      
      // Search employees and admins first
      const { data: employees, error: employeesError } = await supabase
        .from('profiles')
        .select('user_id, id, full_name, email, role, position_enum, department_enum')
        .in('role', ['admin', 'employee'])
        .or(`full_name.ilike.%${searchText}%,email.ilike.%${searchText}%`)
        .limit(Math.floor(limit * 0.7));

      if (employeesError) {
        console.error('❌ Error fetching employees:', employeesError);
        throw employeesError;
      }

      // Search clients with profile_id lookup
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, profile_id, full_name, email, profiles!profile_id(user_id)')
        .or(`full_name.ilike.%${searchText}%,email.ilike.%${searchText}%`)
        .limit(Math.floor(limit * 0.3));

      if (clientsError) {
        console.warn('⚠️ Error fetching clients (continuing with employees only):', clientsError);
      }

      // Transform employee results
      const employeeResults = (employees || []).map((user: any) => ({
        user_id: user.user_id,
        profile_id: user.id,
        full_name: user.full_name,
        email: user.email,
        user_role: user.role,
        user_position: user.position_enum || '',
        department: user.department_enum || '',
        user_type: 'employee' as const
      }));

      // Transform client results
      const clientResults = (clients || []).map((client: any) => ({
        user_id: client.profiles?.user_id || null,
        profile_id: client.profile_id,
        full_name: client.full_name,
        email: client.email || '',
        user_role: 'client',
        user_position: '',
        department: '',
        user_type: 'client' as const
      }));

      const allResults = [...employeeResults, ...clientResults];
      console.log('✅ Direct search successful, users found:', allResults.length);
      return allResults;
      
    } catch (error) {
      console.error('❌ Error in searchUsersForInvitation:', error);
      return []; // Return empty array to prevent UI crashes
    }
  };

  // Simplified team member functions
  const getProjectTeamMembers = async (projectId: string): Promise<TeamMember[]> => {
    return searchUsersForInvitation('', 50);
  };

  const getUsersByDepartment = async (department: string): Promise<TeamMember[]> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, id, full_name, email, role, position_enum, department_enum')
        .eq('department_enum', department as any)
        .in('role', ['admin', 'employee'])
        .limit(50);

      if (error) throw error;

      return (data || []).map((user: any) => ({
        user_id: user.user_id,
        profile_id: user.id,
        full_name: user.full_name,
        email: user.email,
        user_role: user.role,
        user_position: user.position_enum || '',
        department: user.department_enum || '',
        user_type: 'employee' as const
      }));
    } catch (error) {
      console.error('Error in getUsersByDepartment:', error);
      return [];
    }
  };

  const getUsersByPosition = async (position: string): Promise<TeamMember[]> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, id, full_name, email, role, position_enum, department_enum')
        .eq('position_enum', position as any)
        .in('role', ['admin', 'employee'])
        .limit(50);

      if (error) throw error;

      return (data || []).map((user: any) => ({
        user_id: user.user_id,
        profile_id: user.id,
        full_name: user.full_name,
        email: user.email,
        user_role: user.role,
        user_position: user.position_enum || '',
        department: user.department_enum || '',
        user_type: 'employee' as const
      }));
    } catch (error) {
      console.error('Error in getUsersByPosition:', error);
      return [];
    }
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
    isResponding: respondToInvitationMutation.isPending,
  };
};