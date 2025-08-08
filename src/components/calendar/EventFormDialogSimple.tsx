import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { es } from 'date-fns/locale';
import { CalendarIcon, MapPin, AlignLeft, Users, ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
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
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { usePersonalCalendar, PersonalEvent, TeamMember } from "@/hooks/usePersonalCalendar";
import { EventInviteManager } from "../EventInviteManager";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

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

interface EventFormDialogSimpleProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  event?: PersonalEvent | null;
  defaultDate?: Date | null;
}

export const EventFormDialogSimple = ({ isOpen, onOpenChange, event, defaultDate }: EventFormDialogSimpleProps) => {
  const [invitedUsers, setInvitedUsers] = useState<TeamMember[]>([]);
  const [showInvitations, setShowInvitations] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  
  const { createEvent, updateEvent, deleteEvent, isCreating, isUpdating, isDeleting } = usePersonalCalendar();
  const isMobile = useIsMobile();

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
  const eventType = form.watch('event_type');

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
      setInvitedUsers([]);
      setShowDescription(!!event.description);
    } else if (defaultDate) {
      // Use current time or a reasonable default
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // Round to next 30-minute interval
      let startHour = currentHour;
      let startMinute = currentMinute < 30 ? 30 : 0;
      if (startMinute === 0 && currentMinute >= 30) {
        startHour = startHour + 1;
      }
      
      const startTime = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
      const endTime = `${(startHour + 1).toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
      
      form.reset({
        title: "",
        description: "",
        location: "",
        start_date: defaultDate,
        start_time: startTime,
        end_date: defaultDate,
        end_time: endTime,
        is_all_day: false,
        event_type: 'event',
      });
      setInvitedUsers([]);
      setShowDescription(false);
    } else {
      // Default when no date is provided
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      let startHour = currentHour;
      let startMinute = currentMinute < 30 ? 30 : 0;
      if (startMinute === 0 && currentMinute >= 30) {
        startHour = startHour + 1;
      }
      
      const startTime = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
      const endTime = `${(startHour + 1).toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
      
      form.reset({
        title: "",
        description: "",
        location: "",
        start_date: now,
        start_time: startTime,
        end_date: now,
        end_time: endTime,
        is_all_day: false,
        event_type: 'event',
      });
      setInvitedUsers([]);
      setShowDescription(false);
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
      };

      if (event) {
        updateEvent({ id: event.id, ...eventData });
      } else {
        createEvent(eventData);
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

  const handleUserSelect = (user: TeamMember) => {
    if (!invitedUsers.find(u => u.profile_id === user.profile_id)) {
      setInvitedUsers([...invitedUsers, user]);
    }
  };

  const handleRemoveUser = (userId: string) => {
    setInvitedUsers(invitedUsers.filter(u => u.profile_id !== userId));
  };

  const getEventTypeDisplay = (type: string) => {
    switch (type) {
      case 'event': return 'Evento';
      case 'meeting': return 'Reunión';
      case 'reminder': return 'Recordatorio';
      default: return 'Evento';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={`${isMobile ? 'w-[95vw] max-h-[85vh]' : 'max-w-2xl max-h-[80vh]'} p-0 flex flex-col overflow-hidden my-4`}>
        <div className="flex flex-col max-h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground px-4"
            >
              Cancelar
            </Button>
            <h2 className="font-semibold mx-4">
              {event ? "Editar evento" : "Nuevo evento"}
            </h2>
            <Button
              onClick={form.handleSubmit(onSubmit)}
              disabled={isCreating || isUpdating || isDeleting}
              size="sm"
              className="px-6"
            >
              {event ? "Guardar" : "Crear"}
            </Button>
          </div>

          {/* Form Content - Native Scroll */}
          <div className="flex-1 overflow-y-auto min-h-0 max-h-full">
            <div className="p-6 space-y-6 pb-8">
              <Form {...form}>
                <form className="space-y-6">
                  
                  {/* Event Type Selection */}
                  <div className="space-y-3">
                    <FormLabel>Tipo de evento</FormLabel>
                    <div className="grid grid-cols-3 gap-2">
                      {(['event', 'meeting', 'reminder'] as const).map((type) => (
                        <Button
                          key={type}
                          type="button"
                          variant={eventType === type ? "default" : "outline"}
                          size="sm"
                          onClick={() => form.setValue('event_type', type)}
                          className="text-xs"
                        >
                          {getEventTypeDisplay(type)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input 
                            placeholder="Título del evento" 
                            className="text-lg font-medium border-0 border-b-2 border-muted/20 rounded-none px-0 py-3 focus-visible:ring-0 focus-visible:border-primary bg-transparent"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Location */}
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <FormControl>
                            <Input 
                              placeholder="Agregar ubicación" 
                              className="border-0 border-b border-muted/10 rounded-none px-0 py-2 focus-visible:ring-0 focus-visible:border-primary bg-transparent"
                              {...field} 
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* All Day Toggle */}
                  <FormField
                    control={form.control}
                    name="is_all_day"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Todo el día</FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </div>
                      </FormItem>
                    )}
                  />

                  {/* Start Date/Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="start_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Inicio</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className="w-full justify-start text-left font-normal border-muted/20 bg-muted/5 hover:bg-muted/10"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? format(field.value, "d MMM", { locale: es }) : "Fecha"}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {!isAllDay && (
                      <FormField
                        control={form.control}
                        name="start_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hora</FormLabel>
                            <FormControl>
                              <Input
                                type="time"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {/* End Date/Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="end_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fin</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className="w-full justify-start text-left font-normal border-muted/20 bg-muted/5 hover:bg-muted/10"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? format(field.value, "d MMM", { locale: es }) : "Fecha"}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {!isAllDay && (
                      <FormField
                        control={form.control}
                        name="end_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hora</FormLabel>
                            <FormControl>
                              <Input
                                type="time"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {/* Description - Collapsible */}
                  <Collapsible open={showDescription} onOpenChange={setShowDescription}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-start p-0 h-auto font-normal">
                        <AlignLeft className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-muted-foreground">Agregar descripción</span>
                        <ChevronDown className={cn("h-4 w-4 ml-auto transition-transform", showDescription && "rotate-180")} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea 
                                placeholder="Descripción del evento..." 
                                className="min-h-[80px]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Invitations - Collapsible */}
                  <Collapsible open={showInvitations} onOpenChange={setShowInvitations}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-start p-0 h-auto font-normal">
                        <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Invitar personas {invitedUsers.length > 0 && `(${invitedUsers.length})`}
                        </span>
                        <ChevronDown className={cn("h-4 w-4 ml-auto transition-transform", showInvitations && "rotate-180")} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-4">
                      <div className="space-y-4">
                        {/* Selected Users */}
                        {invitedUsers.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Invitados:</p>
                            <div className="flex flex-wrap gap-2">
                              {invitedUsers.map((user) => (
                                <Badge key={user.profile_id} variant="secondary" className="flex items-center gap-1">
                                  {user.full_name}
                                  <button onClick={() => handleRemoveUser(user.profile_id)}>
                                    ×
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Event Invite Manager Container */}
                        <div className="border rounded-lg p-3 bg-muted/5 max-h-48 overflow-y-auto">
                          <EventInviteManager
                            onUserSelect={handleUserSelect}
                            excludeUserIds={invitedUsers.map(u => u.profile_id)}
                            selectedUsers={invitedUsers}
                            onRemoveUser={handleRemoveUser}
                          />
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Delete Button for existing events */}
                  {event && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleDelete}
                      className="w-full"
                      disabled={isDeleting}
                    >
                      Eliminar evento
                    </Button>
                  )}
                </form>
              </Form>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};