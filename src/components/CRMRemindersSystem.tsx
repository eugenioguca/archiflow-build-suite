import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Bell,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Mail,
  Phone,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Edit,
  Users
} from "lucide-react";
import { format, addDays, addWeeks, addMonths, isAfter, isBefore, startOfDay } from "date-fns";
import { es } from "date-fns/locale";

interface CRMReminder {
  id: string;
  title: string;
  message: string;
  reminder_date: string;
  client_id: string;
  user_id: string;
  activity_id?: string;
  is_sent: boolean;
  email_sent: boolean;
  popup_shown: boolean;
  created_at: string;
  // Datos relacionados
  clients?: {
    full_name: string;
    email?: string;
    phone?: string;
  };
}

interface CRMRemindersSystemProps {
  clientId?: string;
  clientName?: string;
}

export const CRMRemindersSystem = ({ clientId, clientName }: CRMRemindersSystemProps) => {
  const [reminders, setReminders] = useState<CRMReminder[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingReminder, setEditingReminder] = useState<CRMReminder | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);
  const [newReminder, setNewReminder] = useState({
    title: '',
    message: '',
    reminder_date: '',
    client_id: clientId || '',
    email_notification: true
  });
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchReminders();
  }, [clientId]);

  const fetchReminders = async () => {
    try {
      let query = supabase
        .from('crm_reminders')
        .select(`
          *,
          clients!crm_reminders_client_id_fkey (
            full_name,
            email,
            phone
          )
        `)
        .order('reminder_date', { ascending: true });

      // Si se proporciona clientId, filtrar por ese cliente
      if (clientId) {
        query = query.eq('client_id', clientId);
      } else {
        // Si no, mostrar solo los del usuario actual
        query = query.eq('user_id', user?.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReminders(data || []);
    } catch (error) {
      console.error('Error fetching reminders:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los recordatorios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createReminder = async () => {
    try {
      if (!newReminder.title || !newReminder.reminder_date || !newReminder.client_id) {
        toast({
          title: "Error",
          description: "Por favor completa todos los campos obligatorios",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('crm_reminders')
        .insert({
          ...newReminder,
          user_id: user?.id,
          is_sent: false,
          email_sent: false,
          popup_shown: false
        });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Recordatorio creado exitosamente",
      });

      setShowCreateDialog(false);
      setNewReminder({
        title: '',
        message: '',
        reminder_date: '',
        client_id: clientId || '',
        email_notification: true
      });
      fetchReminders();
    } catch (error) {
      console.error('Error creating reminder:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el recordatorio",
        variant: "destructive",
      });
    }
  };

  const updateReminder = async (reminderId: string, updates: Partial<CRMReminder>) => {
    try {
      const { error } = await supabase
        .from('crm_reminders')
        .update(updates)
        .eq('id', reminderId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Recordatorio actualizado",
      });

      fetchReminders();
    } catch (error) {
      console.error('Error updating reminder:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el recordatorio",
        variant: "destructive",
      });
    }
  };

  const deleteReminder = async (reminderId: string) => {
    try {
      const { error } = await supabase
        .from('crm_reminders')
        .delete()
        .eq('id', reminderId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Recordatorio eliminado",
      });

      fetchReminders();
    } catch (error) {
      console.error('Error deleting reminder:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el recordatorio",
        variant: "destructive",
      });
    }
  };

  const createQuickReminder = async (days: number, type: string) => {
    const targetDate = addDays(new Date(), days);
    
    const quickReminder = {
      title: `Seguimiento ${type}`,
      message: `Realizar seguimiento ${type} con ${clientName}`,
      reminder_date: targetDate.toISOString(),
      client_id: clientId || '',
      email_notification: true
    };

    setNewReminder(quickReminder);
    await createReminder();
  };

  const getPriorityLevel = (reminderDate: string) => {
    const now = new Date();
    const reminder = new Date(reminderDate);
    const diffHours = (reminder.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0) return { level: 'overdue', color: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300' };
    if (diffHours < 24) return { level: 'urgent', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300' };
    if (diffHours < 72) return { level: 'high', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300' };
    return { level: 'normal', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' };
  };

  const upcomingReminders = reminders.filter(r => 
    isAfter(new Date(r.reminder_date), new Date()) && 
    isBefore(new Date(r.reminder_date), addDays(new Date(), 7))
  );

  const overdueReminders = reminders.filter(r => 
    isBefore(new Date(r.reminder_date), new Date()) && !r.is_sent
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con acciones rápidas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle>Sistema de Recordatorios CRM</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {clientId && (
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => createQuickReminder(1, 'urgente')}
                  >
                    +1 día
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => createQuickReminder(3, 'prioritario')}
                  >
                    +3 días
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => createQuickReminder(7, 'semanal')}
                  >
                    +1 semana
                  </Button>
                </div>
              )}
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Recordatorio
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Crear Recordatorio</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Título *</label>
                      <Input
                        value={newReminder.title}
                        onChange={(e) => setNewReminder({...newReminder, title: e.target.value})}
                        placeholder="Ej: Llamar para seguimiento"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Mensaje</label>
                      <Textarea
                        value={newReminder.message}
                        onChange={(e) => setNewReminder({...newReminder, message: e.target.value})}
                        placeholder="Detalles del recordatorio..."
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Fecha y Hora *</label>
                      <Input
                        type="datetime-local"
                        value={newReminder.reminder_date}
                        onChange={(e) => setNewReminder({...newReminder, reminder_date: e.target.value})}
                      />
                    </div>
                    {!clientId && (
                      <div>
                        <label className="text-sm font-medium">Cliente *</label>
                        <Input
                          value={newReminder.client_id}
                          onChange={(e) => setNewReminder({...newReminder, client_id: e.target.value})}
                          placeholder="ID del cliente"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newReminder.email_notification}
                        onChange={(e) => setNewReminder({...newReminder, email_notification: e.target.checked})}
                      />
                      <label className="text-sm">Enviar notificación por email</label>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={createReminder} className="flex-1">
                        Crear
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowCreateDialog(false)}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Alertas de recordatorios vencidos y próximos */}
      {(overdueReminders.length > 0 || upcomingReminders.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {overdueReminders.length > 0 && (
            <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <h3 className="font-semibold text-red-800 dark:text-red-200">
                    Recordatorios Vencidos ({overdueReminders.length})
                  </h3>
                </div>
                <div className="space-y-1">
                  {overdueReminders.slice(0, 3).map((reminder) => (
                    <div key={reminder.id} className="text-sm text-red-700 dark:text-red-300">
                      • {reminder.title} - {reminder.clients?.full_name}
                    </div>
                  ))}
                  {overdueReminders.length > 3 && (
                    <div className="text-sm text-red-600 dark:text-red-400">
                      y {overdueReminders.length - 3} más...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {upcomingReminders.length > 0 && (
            <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-800 dark:text-blue-200">
                    Próximos 7 días ({upcomingReminders.length})
                  </h3>
                </div>
                <div className="space-y-1">
                  {upcomingReminders.slice(0, 3).map((reminder) => (
                    <div key={reminder.id} className="text-sm text-blue-700 dark:text-blue-300">
                      • {reminder.title} - {format(new Date(reminder.reminder_date), 'dd/MM', { locale: es })}
                    </div>
                  ))}
                  {upcomingReminders.length > 3 && (
                    <div className="text-sm text-blue-600 dark:text-blue-400">
                      y {upcomingReminders.length - 3} más...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Lista de recordatorios */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Todos los Recordatorios ({reminders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reminders.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium">No hay recordatorios</h3>
              <p className="text-muted-foreground">
                {clientId 
                  ? 'Crea recordatorios para dar seguimiento a este cliente'
                  : 'Crea recordatorios para organizar tu seguimiento de clientes'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reminders.map((reminder) => {
                const priority = getPriorityLevel(reminder.reminder_date);
                
                return (
                  <div
                    key={reminder.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{reminder.title}</h4>
                        <Badge className={priority.color}>
                          {priority.level === 'overdue' && 'Vencido'}
                          {priority.level === 'urgent' && 'Urgente'}
                          {priority.level === 'high' && 'Prioritario'}
                          {priority.level === 'normal' && 'Normal'}
                        </Badge>
                        {reminder.is_sent && (
                          <Badge variant="outline">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Enviado
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-muted-foreground mb-2">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="h-4 w-4" />
                            {format(new Date(reminder.reminder_date), 'dd/MM/yyyy HH:mm', { locale: es })}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {reminder.clients?.full_name}
                          </div>
                        </div>
                      </div>
                      
                      {reminder.message && (
                        <p className="text-sm">{reminder.message}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateReminder(reminder.id, { is_sent: !reminder.is_sent })}
                      >
                        {reminder.is_sent ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Clock className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingReminder(reminder)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteReminder(reminder.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};