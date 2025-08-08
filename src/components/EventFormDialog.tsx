import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Users, X, ChevronRight } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { usePersonalCalendar, PersonalEvent, TeamMember } from "@/hooks/usePersonalCalendar";
import { EventInviteManager } from "./EventInviteManager";
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

interface EventFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  event?: PersonalEvent | null;
  defaultDate?: Date | null;
}

export const EventFormDialog = ({ isOpen, onOpenChange, event, defaultDate }: EventFormDialogProps) => {
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

  const formatDateDisplay = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return "Hoy";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Mañana";
    } else {
      return format(date, "d 'de' MMMM 'de' yyyy", { locale: es });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "p-0 mx-auto ios-form-container overflow-hidden",
        showInvitePanel 
          ? "max-w-4xl w-[95vw] max-h-[95vh]" 
          : "max-w-sm w-full max-h-[95vh]"
      )}>
        <div className="flex flex-col h-full max-h-[95vh]">
          {/* iOS Header */}
          <div className="ios-form-header">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-blue-500 hover:bg-transparent p-0 h-auto font-normal"
            >
              Cancelar
            </Button>
            <h2 className="font-semibold text-lg">
              {event ? "Editar" : "Nuevo"}
            </h2>
            <Button
              variant="ghost"
              onClick={form.handleSubmit(onSubmit)}
              disabled={isCreating || isUpdating || isDeleting}
              className="text-blue-500 hover:bg-transparent p-0 h-auto font-semibold"
            >
              {event ? "Guardar" : "Agregar"}
            </Button>
          </div>

          {/* Main Content Area */}
          <div className={cn(
            "flex flex-1 overflow-hidden",
            showInvitePanel ? "flex-col md:flex-row" : "flex-col"
          )}>
            
            {/* Form Column */}
            <div className={cn(
              "flex-1 overflow-hidden",
              showInvitePanel ? "md:w-1/2" : "w-full"
            )}>
              <ScrollArea className="h-full px-4">
                <Form {...form}>
                  <form className="space-y-6 py-6">
                    
                    {/* Event Type Tabs */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-1">
                      <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
                        <button
                          type="button"
                          onClick={() => form.setValue('event_type', 'event')}
                          className={cn(
                            "ios-tab-button",
                            eventType === 'event' ? "active" : ""
                          )}
                        >
                          Evento
                        </button>
                        <button
                          type="button"
                          onClick={() => form.setValue('event_type', 'reminder')}
                          className={cn(
                            "ios-tab-button",
                            eventType === 'reminder' ? "active" : ""
                          )}
                        >
                          Recordatorio
                        </button>
                      </div>
                    </div>

                    {/* Title Field */}
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input 
                              placeholder="Título" 
                              className="ios-form-field text-lg font-medium"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Location Field */}
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input 
                              placeholder="Ubicación o Videollamada" 
                              className="ios-form-field"
                              {...field} 
                            />
                          </FormControl>
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
                          <div className="ios-toggle-container">
                            <span className="text-base">Todo el día</span>
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
                    <div className="space-y-2">
                      <div className="flex items-center justify-between ios-toggle-container">
                        <span className="text-base">Empieza</span>
                        <div className="flex items-center space-x-2">
                          <FormField
                            control={form.control}
                            name="start_date"
                            render={({ field }) => (
                              <FormItem>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant="ghost"
                                        className="h-auto p-0 font-normal text-blue-500 hover:bg-transparent"
                                      >
                                        {field.value ? formatDateDisplay(field.value) : "Fecha"}
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="end">
                                    <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={field.onChange}
                                      disabled={(date) =>
                                        date < new Date(new Date().setHours(0, 0, 0, 0))
                                      }
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
                                  <FormControl>
                                    <input
                                      type="time"
                                      {...field}
                                      className="bg-transparent text-blue-500 border-none outline-none"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* End Date/Time */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between ios-toggle-container">
                        <span className="text-base">Termina</span>
                        <div className="flex items-center space-x-2">
                          <FormField
                            control={form.control}
                            name="end_date"
                            render={({ field }) => (
                              <FormItem>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant="ghost"
                                        className="h-auto p-0 font-normal text-blue-500 hover:bg-transparent"
                                      >
                                        {field.value ? formatDateDisplay(field.value) : "Fecha"}
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="end">
                                    <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={field.onChange}
                                      disabled={(date) =>
                                        date < new Date(new Date().setHours(0, 0, 0, 0))
                                      }
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
                                  <FormControl>
                                    <input
                                      type="time"
                                      {...field}
                                      className="bg-transparent text-blue-500 border-none outline-none"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Spacer */}
                    <div className="ios-section-divider"></div>

                    {/* Invitees Section */}
                    <div className="space-y-2">
                      {/* Invitees */}
                      <div 
                        className="ios-toggle-container cursor-pointer"
                        onClick={() => setShowInvitePanel(!showInvitePanel)}
                      >
                        <span className="text-base">Invitados</span>
                        <div className="flex items-center text-gray-500">
                          <span>{invitedUsers.length > 0 ? `${invitedUsers.length} invitados` : "Ninguno"}</span>
                          <ChevronRight className={cn(
                            "w-4 h-4 ml-1 transition-transform",
                            showInvitePanel ? "rotate-90" : ""
                          )} />
                        </div>
                      </div>
                    </div>

                    {/* Selected Users Display - Show only when mobile and invite panel is open */}
                    {showInvitePanel && invitedUsers.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 space-y-3 md:hidden">
                        <div className="flex flex-wrap gap-2">
                          {invitedUsers.map((user) => (
                            <Badge key={user.profile_id} variant="secondary" className="text-xs">
                              {user.full_name}
                              <button
                                type="button"
                                onClick={() => handleRemoveUser(user.profile_id)}
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              placeholder="Notas"
                              className="ios-form-field min-h-[80px] resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Delete Button (if editing) */}
                    {event && (
                      <div className="pt-4">
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={handleDelete}
                          disabled={isCreating || isUpdating || isDeleting}
                          className="w-full ios-form-field bg-red-500 text-white hover:bg-red-600"
                        >
                          {isDeleting ? "Eliminando..." : "Eliminar evento"}
                        </Button>
                      </div>
                    )}

                    {/* Bottom spacing */}
                    <div className="h-8"></div>
                  </form>
                </Form>
              </ScrollArea>
            </div>

            {/* Invite Panel Column - Only show when panel is open */}
            {showInvitePanel && (
              <>
                {/* Separator for desktop */}
                <div className="hidden md:block w-px bg-border"></div>
                
                {/* Invite Panel */}
                <div className={cn(
                  "bg-white dark:bg-gray-800 overflow-hidden",
                  "flex-1 md:w-1/2 md:max-w-md"
                )}>
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">Invitar personas</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowInvitePanel(false)}
                        className="md:hidden"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {/* Selected users in desktop */}
                    {invitedUsers.length > 0 && (
                      <div className="hidden md:block mt-3">
                        <div className="flex flex-wrap gap-2">
                          {invitedUsers.map((user) => (
                            <Badge key={user.profile_id} variant="secondary" className="text-xs">
                              {user.full_name}
                              <button
                                type="button"
                                onClick={() => handleRemoveUser(user.profile_id)}
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
                  
                  <div className="flex-1 overflow-hidden">
                    <EventInviteManager
                      onUserSelect={handleUserSelect}
                      excludeUserIds={invitedUsers.map(u => u.profile_id)}
                      selectedUsers={invitedUsers}
                      onRemoveUser={handleRemoveUser}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};