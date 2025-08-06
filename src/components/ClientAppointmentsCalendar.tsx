import React, { useState, useEffect } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Users, CheckCircle, XCircle, UserCheck, UserX, Phone, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, isSameDay, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";

interface Attendee {
  profile_id: string;
  name: string;
  email: string;
  status: 'invited' | 'accepted' | 'declined';
}

interface DesignAppointment {
  id: string;
  title: string;
  description?: string;
  appointment_date: string;
  status: string;
  attendees: Attendee[];
  client_id?: string;
  project_id?: string;
  location?: string;
}

interface ClientAppointmentsCalendarProps {
  clientId: string;
  projectId?: string;
}

export const ClientAppointmentsCalendar: React.FC<ClientAppointmentsCalendarProps> = ({
  clientId,
  projectId
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState<DesignAppointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<DesignAppointment | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const startDate = startOfMonth(currentDate);
      const endDate = endOfMonth(currentDate);

      let query = supabase
        .from('design_appointments')
        .select(`
          id,
          title,
          description,
          appointment_date,
          status,
          attendees,
          client_id,
          project_id
        `)
        .eq('client_id', clientId)
        
        .gte('appointment_date', startDate.toISOString())
        .lte('appointment_date', endDate.toISOString());

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query.order('appointment_date');

      if (error) throw error;
      
      // Transform attendees from string[] to Attendee[] if needed
      const processedData = (data || []).map(appointment => ({
        ...appointment,
        attendees: Array.isArray(appointment.attendees) 
          ? appointment.attendees.map(attendee => 
              typeof attendee === 'string' 
                ? { profile_id: attendee, name: 'Usuario', email: '', status: 'invited' as const }
                : attendee
            )
          : []
      }));
      
      setAppointments(processedData);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las citas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [currentDate, clientId, projectId]);

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter(appointment => 
      isSameDay(new Date(appointment.appointment_date), date)
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-yellow-500';
      case 'confirmed': return 'bg-green-500';
      case 'completed': return 'bg-blue-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Programada';
      case 'confirmed': return 'Confirmada';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone className="h-4 w-4" />;
      case 'video_call': return <Video className="h-4 w-4" />;
      default: return <MapPin className="h-4 w-4" />;
    }
  };

  const handleAcceptInvitation = async (appointmentId: string) => {
    try {
      const appointment = appointments.find(a => a.id === appointmentId);
      if (!appointment) return;

      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      // Update attendee status in normalized format
      const updatedAttendees = appointment.attendees.map((attendee: Attendee) => 
        attendee.profile_id === profile.id 
          ? { ...attendee, status: 'accepted' as const }
          : attendee
      );

      const { error } = await supabase
        .from('design_appointments')
        .update({ attendees: updatedAttendees as any })
        .eq('id', appointmentId);

      if (error) throw error;

      await fetchAppointments();
      toast({
        title: "Invitación aceptada",
        description: "Has confirmado tu asistencia a la cita",
      });
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast({
        title: "Error",
        description: "No se pudo aceptar la invitación",
        variant: "destructive",
      });
    }
  };

  const handleDeclineInvitation = async (appointmentId: string) => {
    try {
      const appointment = appointments.find(a => a.id === appointmentId);
      if (!appointment) return;

      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      // Update attendee status in normalized format
      const updatedAttendees = appointment.attendees.map((attendee: Attendee) => 
        attendee.profile_id === profile.id 
          ? { ...attendee, status: 'declined' as const }
          : attendee
      );

      const { error } = await supabase
        .from('design_appointments')
        .update({ attendees: updatedAttendees as any })
        .eq('id', appointmentId);

      if (error) throw error;

      await fetchAppointments();
      toast({
        title: "Invitación declinada",
        description: "Has declinado la invitación a la cita",
      });
    } catch (error) {
      console.error('Error declining invitation:', error);
      toast({
        title: "Error",
        description: "No se pudo declinar la invitación",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calendario de Citas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Cargando citas...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Calendario de Citas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                onMonthChange={setCurrentDate}
                locale={es}
                className="rounded-md border"
                components={{
                  DayContent: ({ date }) => {
                    const dayAppointments = getAppointmentsForDay(date);
                    return (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <span>{date.getDate()}</span>
                        {dayAppointments.length > 0 && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></div>
                        )}
                      </div>
                    );
                  }
                }}
              />
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">
                {selectedDate ? (
                  `Citas del ${format(selectedDate, 'dd MMMM yyyy', { locale: es })}`
                ) : (
                  'Selecciona una fecha'
                )}
              </h3>
              
              {selectedDate && (
                <div className="space-y-3">
                  {getAppointmentsForDay(selectedDate).length === 0 ? (
                    <p className="text-muted-foreground text-sm">No hay citas programadas para este día</p>
                  ) : (
                    getAppointmentsForDay(selectedDate).map((appointment) => (
                      <Card key={appointment.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedAppointment(appointment)}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{appointment.title}</h4>
                            <Badge variant="outline" className={getStatusColor(appointment.status)}>
                              {getStatusLabel(appointment.status)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {format(new Date(appointment.appointment_date), 'HH:mm')}
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              Cita de revisión
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointment Detail Dialog */}
      <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedAppointment?.title}</DialogTitle>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Fecha y Hora</label>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedAppointment.appointment_date), 'dd MMMM yyyy HH:mm', { locale: es })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Tipo</label>
                  <p className="text-sm text-muted-foreground">
                    Cita de revisión
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Estado</label>
                  <Badge variant="outline" className={getStatusColor(selectedAppointment.status)}>
                    {getStatusLabel(selectedAppointment.status)}
                  </Badge>
                </div>
              </div>

              {selectedAppointment.description && (
                <div>
                  <label className="text-sm font-medium">Descripción</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedAppointment.description}
                  </p>
                </div>
              )}


              {selectedAppointment.attendees && selectedAppointment.attendees.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Participantes</label>
                  <div className="space-y-2 mt-2">
                    {selectedAppointment.attendees.map((attendee: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div>
                          <p className="text-sm font-medium">
                            {typeof attendee === 'string' ? 'Miembro del equipo' : attendee.name || 'Miembro del equipo'}
                          </p>
                          {typeof attendee !== 'string' && attendee.email && (
                            <p className="text-xs text-muted-foreground">{attendee.email}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {typeof attendee !== 'string' && (
                            <>
                              <Badge variant={attendee.status === 'accepted' ? 'default' : 'secondary'}>
                                {attendee.status === 'invited' ? 'Invitado' :
                                 attendee.status === 'accepted' ? 'Confirmado' : 'Declinado'}
                              </Badge>
                               {attendee.status === 'invited' && (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleAcceptInvitation(selectedAppointment.id)}
                                  >
                                    Aceptar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeclineInvitation(selectedAppointment.id)}
                                  >
                                    Declinar
                                  </Button>
                                </div>
                               )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};