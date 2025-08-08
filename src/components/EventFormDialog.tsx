import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Clock, MapPin, Bell, Users, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { usePersonalCalendar, PersonalEvent, TeamMember } from "@/hooks/usePersonalCalendar";
import { EventQuickInvite } from "./EventQuickInvite";
import { toast } from "@/hooks/use-toast";

const eventSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  description: z.string().optional(),
  location: z.string().optional(),
  start_date: z.date({
    required_error: "La fecha de inicio es requerida",
  }),
  start_time: z.string().optional(),
  end_date: z.date({
    required_error: "La fecha de fin es requerida",
  }),
  end_time: z.string().optional(),
  is_all_day: z.boolean().default(false),
  event_type: z.enum(['event', 'reminder', 'meeting']).default('event'),
});

type EventFormData = z.infer<typeof eventSchema>;

interface EventFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  event?: PersonalEvent | null;
  defaultDate?: Date | null;
}

const ALERT_OPTIONS = [
  { value: 0, label: 'Al momento del evento' },
  { value: 5, label: '5 minutos antes' },
  { value: 10, label: '10 minutos antes' },
  { value: 15, label: '15 minutos antes' },
  { value: 30, label: '30 minutos antes' },
  { value: 60, label: '1 hora antes' },
  { value: 120, label: '2 horas antes' },
  { value: 1440, label: '1 día antes' },
  { value: 2880, label: '2 días antes' },
  { value: 10080, label: '1 semana antes' },
];

export const EventFormDialog = ({ isOpen, onOpenChange, event, defaultDate }: EventFormDialogProps) => {
  const [selectedAlerts, setSelectedAlerts] = useState<number[]>([]);
  const [invitedUsers, setInvitedUsers] = useState<TeamMember[]>([]);
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  
  const { createEvent, updateEvent, deleteEvent, isCreating, isUpdating, isDeleting } = usePersonalCalendar();

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      is_all_day: false,
      event_type: 'event',
    },
  });

  const isAllDay = form.watch('is_all_day');

  useEffect(() => {
    if (event) {
      const startDate = new Date(event.start_date);
      const endDate = new Date(event.end_date);
      
      form.reset({
        title: event.title,
        description: event.description || "",
        location: event.location || "",
        start_date: startDate,
        start_time: event.is_all_day ? "" : format(startDate, 'HH:mm'),
        end_date: endDate,
        end_time: event.is_all_day ? "" : format(endDate, 'HH:mm'),
        is_all_day: event.is_all_day,
        event_type: event.event_type,
      });

      // Cargar alertas existentes
      if (event.alerts) {
        setSelectedAlerts(event.alerts.map(alert => alert.alert_minutes_before));
      }
    } else if (defaultDate) {
      form.reset({
        title: "",
        description: "",
        location: "",
        start_date: defaultDate,
        start_time: "09:00",
        end_date: defaultDate,
        end_time: "10:00",
        is_all_day: false,
        event_type: 'event',
      });
      setSelectedAlerts([]);
      setInvitedUsers([]);
    }
  }, [event, defaultDate, form]);

  const handleAddAlert = (minutes: number) => {
    if (!selectedAlerts.includes(minutes)) {
      setSelectedAlerts([...selectedAlerts, minutes]);
    }
  };

  const handleRemoveAlert = (minutes: number) => {
    setSelectedAlerts(selectedAlerts.filter(alert => alert !== minutes));
  };

  const handleAddInvitedUser = (user: TeamMember) => {
    if (!invitedUsers.find(u => u.profile_id === user.profile_id)) {
      setInvitedUsers([...invitedUsers, user]);
    }
  };

  const handleRemoveInvitedUser = (profileId: string) => {
    setInvitedUsers(invitedUsers.filter(u => u.profile_id !== profileId));
  };

  const onSubmit = async (data: EventFormData) => {
    try {
      const startDateTime = isAllDay 
        ? data.start_date
        : new Date(`${format(data.start_date, 'yyyy-MM-dd')}T${data.start_time}`);
      
      const endDateTime = isAllDay
        ? data.end_date
        : new Date(`${format(data.end_date, 'yyyy-MM-dd')}T${data.end_time}`);

      const eventData = {
        title: data.title,
        description: data.description,
        location: data.location,
        start_date: startDateTime.toISOString(),
        end_date: endDateTime.toISOString(),
        is_all_day: data.is_all_day,
        event_type: data.event_type,
        user_id: '', // Se asigna automáticamente en el hook
        created_by: '',
      };

      if (event) {
        updateEvent({ id: event.id, ...eventData });
      } else {
        createEvent(eventData);
      }

      // TODO: Implementar creación de alertas e invitaciones
      if (selectedAlerts.length > 0) {
        console.log('Alertas a crear:', selectedAlerts);
      }

      if (invitedUsers.length > 0) {
        console.log('Usuarios a invitar:', invitedUsers);
      }

      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar el evento.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = () => {
    if (event && window.confirm('¿Estás seguro de que quieres eliminar este evento?')) {
      deleteEvent(event.id);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {event ? 'Editar Evento' : 'Nuevo Evento'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Información básica */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título *</FormLabel>
                    <FormControl>
                      <Input placeholder="Título del evento" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="event_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Evento</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona el tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="event">Evento</SelectItem>
                        <SelectItem value="meeting">Reunión</SelectItem>
                        <SelectItem value="reminder">Recordatorio</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descripción del evento..."
                        className="resize-none"
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ubicación</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="Ubicación del evento"
                          className="pl-10"
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Fechas y horarios */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="is_all_day"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Evento de todo el día</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha de inicio *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: es })
                              ) : (
                                <span>Selecciona fecha</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha de fin *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: es })
                              ) : (
                                <span>Selecciona fecha</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {!isAllDay && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="start_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hora de inicio</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="time"
                              className="pl-10"
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="end_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hora de fin</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="time"
                              className="pl-10"
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {/* Alertas */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Bell className="h-4 w-4" />
                <span className="font-medium">Alertas</span>
              </div>
              
              <Select onValueChange={(value) => handleAddAlert(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Agregar alerta..." />
                </SelectTrigger>
                <SelectContent>
                  {ALERT_OPTIONS.map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value.toString()}
                      disabled={selectedAlerts.includes(option.value)}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedAlerts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedAlerts.map((minutes) => {
                    const alertOption = ALERT_OPTIONS.find(opt => opt.value === minutes);
                    return (
                      <Badge key={minutes} variant="secondary" className="flex items-center space-x-1">
                        <span>{alertOption?.label}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAlert(minutes)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Invitaciones */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">Invitar usuarios</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInvitePanel(!showInvitePanel)}
                >
                  {showInvitePanel ? 'Ocultar' : 'Invitar'}
                </Button>
              </div>

              {showInvitePanel && (
                <EventQuickInvite
                  onUserSelect={handleAddInvitedUser}
                  excludeUserIds={invitedUsers.map(u => u.profile_id)}
                />
              )}

              {invitedUsers.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Usuarios invitados:</span>
                  <div className="flex flex-wrap gap-2">
                    {invitedUsers.map((user) => (
                      <Badge key={user.profile_id} variant="outline" className="flex items-center space-x-1">
                        <span>{user.full_name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveInvitedUser(user.profile_id)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Botones de acción */}
            <div className="flex justify-between pt-4">
              <div>
                {event && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Eliminando...' : 'Eliminar'}
                  </Button>
                )}
              </div>
              
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating || isUpdating}
                >
                  {isCreating ? 'Creando...' : 
                   isUpdating ? 'Actualizando...' : 
                   event ? 'Actualizar' : 'Crear Evento'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};