import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar as CalendarIcon, Clock, Users, Plus, Edit, Trash2, UserPlus } from "lucide-react";
import { AppointmentInvitationManager } from "./AppointmentInvitationManager";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Attendee {
  profile_id: string;
  name: string;
  email: string;
  status: 'invited' | 'accepted' | 'declined';
}

interface DesignAppointment {
  id: string;
  project_id: string;
  client_id?: string;
  appointment_date: string;
  title: string;
  description?: string;
  status: string;
  attendees: Attendee[];
  created_by: string;
}

interface TeamMember {
  id: string;
  full_name: string;
  avatar_url?: string;
}

interface DesignCalendarProps {
  projectId: string;
  teamMembers: TeamMember[];
}

export function DesignCalendar({ projectId, teamMembers }: DesignCalendarProps) {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<DesignAppointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedAppointments, setSelectedAppointments] = useState<DesignAppointment[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<DesignAppointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [invitationDialogOpen, setInvitationDialogOpen] = useState(false);
  const [selectedAppointmentForInvitation, setSelectedAppointmentForInvitation] = useState<DesignAppointment | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    appointment_date: new Date().toISOString().slice(0, 16),
    attendees: [] as Attendee[]
  });

  useEffect(() => {
    fetchAppointments();
  }, [projectId]);

  useEffect(() => {
    if (selectedDate) {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const dayAppointments = appointments.filter(apt => 
        apt.appointment_date.startsWith(dateStr)
      );
      setSelectedAppointments(dayAppointments);
    }
  }, [selectedDate, appointments]);

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from("design_appointments")
        .select("*")
        .eq("project_id", projectId)
        .order("appointment_date");

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
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las citas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Perfil no encontrado");

      // Get client_id from project
      const { data: projectData } = await supabase
        .from('client_projects')
        .select('client_id')
        .eq('id', projectId)
        .single();

      // Convert Attendee objects to string array for database compatibility
      const attendeesForDb = formData.attendees.map(a => a.profile_id);

      const appointmentData = {
        project_id: projectId,
        client_id: projectData?.client_id,
        title: formData.title,
        description: formData.description,
        appointment_date: formData.appointment_date,
        attendees: attendeesForDb,
        created_by: profile.id,
        status: "scheduled",
        visible_to_sales: true
      };

      if (editingAppointment) {
        const { error } = await supabase
          .from("design_appointments")
          .update(appointmentData)
          .eq("id", editingAppointment.id);

        if (error) throw error;

        toast({
          title: "Cita actualizada",
          description: "Los cambios han sido guardados"
        });
      } else {
        const { error } = await supabase
          .from("design_appointments")
          .insert([appointmentData]);

        if (error) throw error;

        toast({
          title: "Cita creada",
          description: "La cita ha sido programada exitosamente"
        });
      }

      setDialogOpen(false);
      setEditingAppointment(null);
      resetForm();
      fetchAppointments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (appointment: DesignAppointment) => {
    setEditingAppointment(appointment);
    setFormData({
      title: appointment.title,
      description: appointment.description || "",
      appointment_date: format(new Date(appointment.appointment_date), "yyyy-MM-dd'T'HH:mm"),
      attendees: appointment.attendees
    });
    setDialogOpen(true);
  };

  const handleDelete = async (appointmentId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta cita?")) return;

    try {
      const { error } = await supabase
        .from("design_appointments")
        .delete()
        .eq("id", appointmentId);

      if (error) throw error;

      toast({
        title: "Cita eliminada",
        description: "La cita ha sido eliminada del calendario"
      });

      fetchAppointments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      appointment_date: new Date().toISOString().slice(0, 16),
      attendees: []
    });
  };

  const openInvitationManager = (appointment: DesignAppointment) => {
    setSelectedAppointmentForInvitation(appointment);
    setInvitationDialogOpen(true);
  };

  const toggleAttendee = (memberId: string) => {
    const member = teamMembers.find(m => m.id === memberId);
    if (!member) return;
    
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees.some(a => a.profile_id === memberId)
        ? prev.attendees.filter(a => a.profile_id !== memberId)
        : [...prev.attendees, { 
            profile_id: memberId, 
            name: member.full_name, 
            email: '',
            status: 'invited' as const 
          }]
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "scheduled": return "Programada";
      case "completed": return "Completada";
      case "cancelled": return "Cancelada";
      default: return status;
    }
  };

  const hasAppointments = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return appointments.some(apt => apt.appointment_date.startsWith(dateStr));
  };

  if (loading && appointments.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Calendario de Citas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border"
            modifiers={{
              hasAppointments: (date) => hasAppointments(date)
            }}
            modifiersStyles={{
              hasAppointments: { 
                backgroundColor: "hsl(var(--primary))", 
                color: "hsl(var(--primary-foreground))",
                fontWeight: "bold"
              }
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {selectedDate 
                ? `Citas - ${format(selectedDate, "dd 'de' MMMM, yyyy", { locale: es })}`
                : "Citas del Día"
              }
            </CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Cita
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingAppointment ? "Editar Cita" : "Programar Nueva Cita"}
                  </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Título de la Cita *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="ej. Revisión de avances"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="appointment_date">Fecha y Hora *</Label>
                      <Input
                        id="appointment_date"
                        type="datetime-local"
                        value={formData.appointment_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, appointment_date: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Agenda y objetivos de la cita..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Asistentes</Label>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                      {teamMembers.map((member) => (
                        <div
                          key={member.id}
                          className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                            formData.attendees.some(a => a.profile_id === member.id)
                              ? "bg-primary/10 border-primary"
                              : "bg-background border-border hover:bg-muted"
                          }`}
                          onClick={() => toggleAttendee(member.id)}
                        >
                          <input
                            type="checkbox"
                            checked={formData.attendees.some(a => a.profile_id === member.id)}
                            onChange={() => {}} // Handled by onClick
                            className="rounded"
                          />
                          <span className="text-sm">{member.full_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Guardando..." : (editingAppointment ? "Actualizar" : "Programar")}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {selectedAppointments.length > 0 ? (
              selectedAppointments.map((appointment) => (
                <div key={appointment.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{appointment.title}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Clock className="h-4 w-4" />
                        {format(new Date(appointment.appointment_date), "HH:mm")}
                        <Users className="h-4 w-4 ml-2" />
                        {appointment.attendees.length} asistentes
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openInvitationManager(appointment)}
                        title="Gestionar Invitados"
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(appointment)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(appointment.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <Badge className={getStatusColor(appointment.status)}>
                    {getStatusLabel(appointment.status)}
                  </Badge>
                  
                  {appointment.description && (
                    <p className="text-sm text-muted-foreground">
                      {appointment.description}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay citas programadas para este día</p>
                <Button size="sm" className="mt-2" onClick={() => setDialogOpen(true)}>
                  Programar Cita
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invitation Management Dialog */}
      {selectedAppointmentForInvitation && invitationDialogOpen && (
        <Dialog open={invitationDialogOpen} onOpenChange={setInvitationDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gestionar Invitados</DialogTitle>
            </DialogHeader>
            <AppointmentInvitationManager
              appointmentId={selectedAppointmentForInvitation.id}
              clientId={selectedAppointmentForInvitation.client_id || ''}
              attendees={selectedAppointmentForInvitation.attendees}
              onAttendeesUpdate={(updatedAttendees) => {
                setSelectedAppointmentForInvitation(prev => prev ? { ...prev, attendees: updatedAttendees } : null);
                fetchAppointments();
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}