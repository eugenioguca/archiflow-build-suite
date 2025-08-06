import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, Users, Eye, Bell, Plus, UserPlus } from "lucide-react";
import { AppointmentInvitationManager } from "./AppointmentInvitationManager";
import { SalesAppointmentScheduler } from "./SalesAppointmentScheduler";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from "date-fns";
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
  appointment_date: string;
  description?: string;
  status: string;
  attendees: Attendee[];
  client_id?: string;
  project_id?: string;
  visible_to_sales: boolean;
  client?: {
    full_name: string;
  };
  project?: {
    name: string;
  };
}

interface ModuleNotification {
  id: string;
  title: string;
  message: string;
  source_module: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
  client?: {
    full_name: string;
  };
}

interface SalesDesignCalendarProps {
  clientId?: string; // Para filtrar por cliente específico
  showNotifications?: boolean;
}

interface ClientProject {
  id: string;
  project_name: string;
  client_id: string;
}

export function SalesDesignCalendar({ clientId, showNotifications = true }: SalesDesignCalendarProps) {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<DesignAppointment[]>([]);
  const [notifications, setNotifications] = useState<ModuleNotification[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<DesignAppointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [invitationDialogOpen, setInvitationDialogOpen] = useState(false);
  const [clientProject, setClientProject] = useState<ClientProject | null>(null);

  useEffect(() => {
    fetchDesignAppointments();
    if (showNotifications) {
      fetchNotifications();
    }
    if (clientId) {
      fetchClientProject();
    }
  }, [clientId, currentDate]);

  const fetchClientProject = async () => {
    if (!clientId) return;
    
    try {
      const { data, error } = await supabase
        .from('client_projects')
        .select('id, project_name, client_id')
        .eq('client_id', clientId)
        .limit(1)
        .single();

      if (error) throw error;
      setClientProject(data);
    } catch (error) {
      console.error('Error fetching client project:', error);
    }
  };

  const fetchDesignAppointments = async () => {
    try {
      const startDate = startOfMonth(currentDate);
      const endDate = endOfMonth(currentDate);

      let query = supabase
        .from('design_appointments')
        .select(`
          *,
          client:clients(full_name)
        `)
        .eq('visible_to_sales', true)
        .gte('appointment_date', startDate.toISOString())
        .lte('appointment_date', endDate.toISOString())
        .order('appointment_date');

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

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
          : [],
        project: { name: appointment.project_id || '' }
      }));
      
      setAppointments(processedData);
    } catch (error) {
      console.error('Error fetching design appointments:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las citas de diseño",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('module_notifications')
        .select(`
          *,
          client:clients(full_name)
        `)
        .eq('target_module', 'sales')
        .eq('source_module', 'design')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('module_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(notifications.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  };

  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter(appointment => 
      isSameDay(new Date(appointment.appointment_date), day)
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completada';
      case 'in_progress': return 'En Progreso';
      case 'cancelled': return 'Cancelada';
      default: return 'Programada';
    }
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calendario de Diseño</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {showNotifications && notifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificaciones de Diseño
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div key={notification.id} className="flex items-start justify-between p-3 border rounded-lg bg-blue-50">
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900">{notification.title}</h4>
                    <p className="text-sm text-blue-700 mt-1">{notification.message}</p>
                    <p className="text-xs text-blue-600 mt-2">
                      {format(new Date(notification.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => markNotificationAsRead(notification.id)}
                  >
                    Marcar como leída
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Citas de Diseño
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={previousMonth}>
                ←
              </Button>
              <h3 className="font-medium min-w-[150px] text-center">
                {format(currentDate, "MMMM yyyy", { locale: es })}
              </h3>
              <Button variant="outline" size="sm" onClick={nextMonth}>
                →
              </Button>
              {clientProject && (
                <SalesAppointmentScheduler clientProject={clientProject} />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Calendar Grid */}
          <div className="space-y-4">
            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-gray-600">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                <div key={day} className="p-2">{day}</div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-2">
              {getDaysInMonth().map((day) => {
                const dayAppointments = getAppointmentsForDay(day);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentDate);

                return (
                  <div
                    key={day.toISOString()}
                    className={`
                      min-h-[80px] p-2 border rounded-lg relative
                      ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                      ${isToday ? 'bg-blue-50 border-blue-200' : ''}
                      ${dayAppointments.length > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}
                    `}
                  >
                    <div className={`text-sm ${isToday ? 'font-bold text-blue-600' : ''}`}>
                      {format(day, 'd')}
                    </div>
                    
                    {dayAppointments.map((appointment, index) => (
                      <div
                        key={appointment.id}
                        className="mt-1 text-xs p-1 rounded cursor-pointer hover:opacity-80"
                        style={{ backgroundColor: 'rgb(59 130 246 / 0.1)', color: 'rgb(29 78 216)' }}
                        onClick={() => setSelectedAppointment(appointment)}
                      >
                        <div className="truncate">
                          {format(new Date(appointment.appointment_date), 'HH:mm')}
                        </div>
                        <div className="truncate font-medium">
                          {appointment.title}
                        </div>
                        {appointment.client && (
                          <div className="truncate text-gray-600">
                            {appointment.client.full_name}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 p-4 border rounded-lg bg-gray-50">
            <h4 className="text-sm font-medium mb-2">Información:</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• Las citas mostradas son del módulo de Diseño</p>
              <p>• Solo se muestran las citas marcadas como visibles para Ventas</p>
              <p>• Haz clic en una cita para ver más detalles</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointment Detail Dialog */}
      <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalles de la Cita</DialogTitle>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">{selectedAppointment.title}</h4>
                <p className="text-sm text-gray-600 mt-1">
                  {format(new Date(selectedAppointment.appointment_date), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                </p>
              </div>

              {selectedAppointment.client && (
                <div>
                  <p className="text-sm font-medium">Cliente:</p>
                  <p className="text-sm text-gray-600">{selectedAppointment.client.full_name}</p>
                </div>
              )}

              {selectedAppointment.project && (
                <div>
                  <p className="text-sm font-medium">Proyecto:</p>
                  <p className="text-sm text-gray-600">{selectedAppointment.project.name}</p>
                </div>
              )}

              {selectedAppointment.description && (
                <div>
                  <p className="text-sm font-medium">Descripción:</p>
                  <p className="text-sm text-gray-600">{selectedAppointment.description}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium">Estado:</p>
                <Badge className={getStatusColor(selectedAppointment.status)}>
                  {getStatusLabel(selectedAppointment.status)}
                </Badge>
              </div>

              {selectedAppointment.attendees && selectedAppointment.attendees.length > 0 && (
                <div>
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Asistentes:
                  </p>
                  <div className="text-sm text-gray-600 mt-1">
                    {selectedAppointment.attendees.length} persona(s) programada(s)
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setInvitationDialogOpen(true)}
                  className="flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Gestionar Invitados
                </Button>
                <Button onClick={() => setSelectedAppointment(null)} className="flex-1">
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invitation Management Dialog */}
      {selectedAppointment && invitationDialogOpen && (
        <Dialog open={invitationDialogOpen} onOpenChange={setInvitationDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gestionar Invitados</DialogTitle>
            </DialogHeader>
            <AppointmentInvitationManager
              appointmentId={selectedAppointment.id}
              clientId={selectedAppointment.client_id || ''}
              attendees={selectedAppointment.attendees}
              onAttendeesUpdate={(updatedAttendees) => {
                setSelectedAppointment(prev => prev ? { ...prev, attendees: updatedAttendees } : null);
                fetchDesignAppointments();
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}