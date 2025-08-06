import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus, X, Check, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Attendee {
  profile_id: string;
  name: string;
  email: string;
  status: 'invited' | 'accepted' | 'declined';
}

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  department_enum?: string;
}

interface AppointmentInvitationManagerProps {
  appointmentId: string;
  clientId: string;
  projectId?: string;
  attendees: Attendee[];
  onAttendeesUpdate: (attendees: Attendee[]) => void;
  trigger?: React.ReactNode;
}

export const AppointmentInvitationManager: React.FC<AppointmentInvitationManagerProps> = ({
  appointmentId,
  clientId,
  projectId,
  attendees,
  onAttendeesUpdate,
  trigger
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [availableMembers, setAvailableMembers] = useState<TeamMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchAvailableMembers = async () => {
    try {
      setLoading(true);
      
      // Obtener miembros del equipo (empleados y admins)
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          role,
          department_enum
        `)
        .in('role', ['admin', 'employee'])
        .ilike('full_name', `%${searchQuery}%`);

      if (error) throw error;

      // Filtrar los que ya están invitados
      const filtered = profiles?.filter(profile => 
        !attendees.some(attendee => attendee.profile_id === profile.id)
      ) || [];

      setAvailableMembers(filtered);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los miembros del equipo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAvailableMembers();
    }
  }, [isOpen, searchQuery, attendees]);

  const handleInvite = async (member: TeamMember) => {
    try {
      const newAttendee: Attendee = {
        profile_id: member.id,
        name: member.full_name,
        email: member.email,
        status: 'invited'
      };

      const updatedAttendees = [...attendees, newAttendee];

      // Actualizar en la base de datos
      const { error } = await supabase
        .from('design_appointments')
        .update({ attendees: updatedAttendees as any })
        .eq('id', appointmentId);

      if (error) throw error;

      // Crear notificación para el invitado
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', member.id)
        .single();

      if (userProfile) {
        await supabase
          .from('module_notifications')
          .insert({
            user_id: userProfile.user_id,
            client_id: clientId,
            source_module: 'design',
            target_module: member.department_enum || 'general',
            notification_type: 'appointment_invitation',
            title: 'Nueva invitación a cita',
            message: `Has sido invitado a una cita de revisión`,
            metadata: {
              appointment_id: appointmentId,
              project_id: projectId
            }
          });
      }

      onAttendeesUpdate(updatedAttendees);
      toast({
        title: "Invitación enviada",
        description: `Se ha invitado a ${member.full_name} a la cita`,
      });
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        title: "Error",
        description: "No se pudo enviar la invitación",
        variant: "destructive",
      });
    }
  };

  const handleRemoveAttendee = async (profileId: string) => {
    try {
      const updatedAttendees = attendees.filter(attendee => attendee.profile_id !== profileId);

      const { error } = await supabase
        .from('design_appointments')
        .update({ attendees: updatedAttendees as any })
        .eq('id', appointmentId);

      if (error) throw error;

      onAttendeesUpdate(updatedAttendees);
      toast({
        title: "Participante eliminado",
        description: "Se ha eliminado al participante de la cita",
      });
    } catch (error) {
      console.error('Error removing attendee:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar al participante",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return <Check className="h-4 w-4 text-green-600" />;
      case 'declined': return <X className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'accepted': return 'Confirmado';
      case 'declined': return 'Declinado';
      default: return 'Pendiente';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Gestionar Invitados
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestionar Invitados a la Cita</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Lista de invitados actuales */}
          <div>
            <Label className="text-base font-medium">Invitados Actuales</Label>
            <div className="space-y-2 mt-2">
              {attendees.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay invitados en esta cita</p>
              ) : (
                attendees.map((attendee) => (
                  <Card key={attendee.profile_id}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(attendee.status)}
                          <div>
                            <p className="font-medium">{attendee.name}</p>
                            <p className="text-sm text-muted-foreground">{attendee.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            attendee.status === 'accepted' ? 'default' : 
                            attendee.status === 'declined' ? 'destructive' : 'secondary'
                          }>
                            {getStatusLabel(attendee.status)}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAttendee(attendee.profile_id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Buscar y agregar nuevos invitados */}
          <div>
            <Label className="text-base font-medium">Invitar Miembros del Equipo</Label>
            <div className="space-y-3 mt-2">
              <Input
                placeholder="Buscar por nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              
              <div className="max-h-48 overflow-y-auto space-y-2">
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : availableMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    {searchQuery ? 'No se encontraron miembros' : 'Todos los miembros ya están invitados'}
                  </p>
                ) : (
                  availableMembers.map((member) => (
                    <Card key={member.id} className="cursor-pointer hover:bg-muted/50">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{member.full_name}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {member.role} {member.department_enum && `- ${member.department_enum}`}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleInvite(member)}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Invitar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};