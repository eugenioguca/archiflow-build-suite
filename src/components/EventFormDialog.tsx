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
import { ScrollArea } from "@/components/ui/scroll-area";
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
      <DialogContent className="max-w-md max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-lg font-semibold">
            {event ? 'Editar Evento' : 'Nuevo Evento'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh] px-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-6">
              {/* Título */}
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

              {/* Tipo de evento */}
              <FormField
                control={form.control}
                name="event_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
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

              {/* Todo el día */}
              <FormField
                control={form.control}
                name="is_all_day"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Todo el día</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          if (checked) {
                            form.setValue('start_time', '');
                            form.setValue('end_time', '');
                          }
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Fecha de inicio */}
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
                              "pl-3 text-left font-normal",
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
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hora de inicio - Solo si no es todo el día */}
              {!isAllDay && (
                <FormField
                  control={form.control}
                  name="start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de inicio</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Fecha de fin */}
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
                              "pl-3 text-left font-normal",
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
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hora de fin - Solo si no es todo el día */}
              {!isAllDay && (
                <FormField
                  control={form.control}
                  name="end_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de fin</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Ubicación */}
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ubicación</FormLabel>
                    <FormControl>
                      <Input placeholder="Ubicación del evento" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Descripción */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descripción del evento"
                        className="min-h-[80px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Invitar usuarios */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <FormLabel>Invitados</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowInvitePanel(!showInvitePanel)}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Invitar ({invitedUsers.length})
                  </Button>
                </div>

                {invitedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {invitedUsers.map((user) => (
                      <Badge key={user.profile_id} variant="secondary" className="text-xs">
                        {user.full_name}
                        <button
                          type="button"
                          onClick={() => setInvitedUsers(invitedUsers.filter(u => u.profile_id !== user.profile_id))}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {showInvitePanel && (
                  <div className="border rounded-lg p-3 bg-muted/50">
                    <EventQuickInvite 
                      onUserSelect={(user) => {
                        if (!invitedUsers.find(u => u.profile_id === user.profile_id)) {
                          setInvitedUsers([...invitedUsers, user]);
                        }
                      }}
                      excludeUserIds={invitedUsers.map(u => u.profile_id)}
                    />
                  </div>
                )}
              </div>

              {/* Botones de acción */}
              <div className="flex flex-col gap-2 pt-4">
                <Button 
                  type="submit" 
                  disabled={isCreating || isUpdating}
                  className="w-full"
                >
                  {isCreating || isUpdating ? 'Guardando...' : (event ? 'Actualizar' : 'Crear Evento')}
                </Button>
                
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => onOpenChange(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  
                  {event && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="flex-1"
                    >
                      {isDeleting ? 'Eliminando...' : 'Eliminar'}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};