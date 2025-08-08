import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, MapPin } from "lucide-react";
import { usePersonalCalendar, PersonalEvent } from "@/hooks/usePersonalCalendar";
import { EventFormDialog } from "./EventFormDialog";
import { EventInvitationPanel } from "./EventInvitationPanel";
import { cn } from "@/lib/utils";

type CalendarView = 'month' | 'week' | 'day' | 'agenda';

export const PersonalCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<PersonalEvent | null>(null);
  const [showInvitations, setShowInvitations] = useState(false);

  const { events, receivedInvitations, isLoading } = usePersonalCalendar();

  // Obtener eventos para una fecha específica
  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventStart = new Date(event.start_date);
      const eventEnd = new Date(event.end_date);
      
      if (event.is_all_day) {
        return isSameDay(eventStart, date) || 
               (date >= eventStart && date <= eventEnd);
      }
      
      return isSameDay(eventStart, date);
    });
  };

  // Generar días del calendario
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Obtener color del evento según tipo
  const getEventColor = (event: PersonalEvent) => {
    if (event.event_type === 'reminder') return 'bg-purple-100 text-purple-800 border-purple-200';
    if (event.event_type === 'meeting') return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  // Navegación del calendario
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const dayEvents = getEventsForDate(date);
    if (dayEvents.length === 1) {
      setSelectedEvent(dayEvents[0]);
      setIsEventDialogOpen(true);
    } else if (dayEvents.length === 0) {
      setSelectedEvent(null);
      setIsEventDialogOpen(true);
    }
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setSelectedDate(new Date());
    setIsEventDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="w-full h-96">
        <CardContent className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header del calendario */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <CardTitle className="flex items-center space-x-2">
                <CalendarIcon className="h-5 w-5" />
                <span>Mi Calendario</span>
              </CardTitle>
              {receivedInvitations.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {receivedInvitations.length} invitación{receivedInvitations.length !== 1 ? 'es' : ''}
                </Badge>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {receivedInvitations.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInvitations(true)}
                >
                  Ver Invitaciones ({receivedInvitations.length})
                </Button>
              )}
              <Button
                onClick={handleCreateEvent}
                size="sm"
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Nuevo Evento</span>
              </Button>
            </div>
          </div>

          {/* Navegación y vistas */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <h2 className="text-xl font-semibold min-w-[200px] text-center">
                {format(currentDate, 'MMMM yyyy', { locale: es })}
              </h2>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex space-x-1">
              {(['month', 'week', 'day', 'agenda'] as CalendarView[]).map((viewOption) => (
                <Button
                  key={viewOption}
                  variant={view === viewOption ? "default" : "outline"}
                  size="sm"
                  onClick={() => setView(viewOption)}
                  className="capitalize"
                >
                  {viewOption === 'month' ? 'Mes' :
                   viewOption === 'week' ? 'Semana' :
                   viewOption === 'day' ? 'Día' : 'Agenda'}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="max-h-[800px] overflow-auto">
          {view === 'month' && (
            <div className="grid grid-cols-7 gap-px bg-border">
              {/* Encabezados de días */}
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
                <div
                  key={day}
                  className="bg-muted p-2 text-center text-sm font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}

              {/* Días del calendario */}
              {calendarDays.map((day) => {
                const dayEvents = getEventsForDate(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isCurrentDay = isToday(day);

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "bg-background p-2 min-h-[120px] cursor-pointer hover:bg-muted/50 transition-colors",
                      !isCurrentMonth && "text-muted-foreground bg-muted/20",
                      isCurrentDay && "bg-primary/10 border border-primary/20"
                    )}
                    onClick={() => handleDateClick(day)}
                  >
                    <div className="flex flex-col h-full">
                      <span className={cn(
                        "text-sm font-medium",
                        isCurrentDay && "text-primary font-bold"
                      )}>
                        {format(day, 'd')}
                      </span>
                      
                      <div className="flex-1 mt-1 space-y-1">
                        {dayEvents.slice(0, 3).map((event) => (
                          <div
                            key={event.id}
                            className={cn(
                              "text-xs p-1 rounded border truncate",
                              getEventColor(event)
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(event);
                              setIsEventDialogOpen(true);
                            }}
                          >
                            <div className="flex items-center space-x-1">
                              {!event.is_all_day && (
                                <Clock className="h-3 w-3 flex-shrink-0" />
                              )}
                              <span className="truncate">{event.title}</span>
                            </div>
                          </div>
                        ))}
                        
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{dayEvents.length - 3} más
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {view === 'week' && (
            <div className="space-y-4">
              <div className="text-center text-lg font-semibold">
                Semana del {format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'dd MMM', { locale: es })} - 
                {format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'dd MMM yyyy', { locale: es })}
              </div>
              
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }, (_, i) => {
                  const day = addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), i);
                  const dayEvents = getEventsForDate(day);
                  const isCurrentDay = isToday(day);

                  return (
                    <div key={i} className="space-y-2">
                      <div className={cn(
                        "text-center p-2 rounded-lg border",
                        isCurrentDay && "bg-primary text-primary-foreground font-bold"
                      )}>
                        <div className="text-sm font-medium">
                          {format(day, 'EEE', { locale: es })}
                        </div>
                        <div className="text-lg">
                          {format(day, 'd')}
                        </div>
                      </div>
                      
                      <div className="space-y-1 min-h-[300px]">
                        {dayEvents.map((event) => (
                          <div
                            key={event.id}
                            className={cn(
                              "text-xs p-2 rounded border cursor-pointer hover:shadow-md transition-shadow",
                              getEventColor(event)
                            )}
                            onClick={() => {
                              setSelectedEvent(event);
                              setIsEventDialogOpen(true);
                            }}
                          >
                            <div className="font-medium truncate">{event.title}</div>
                            {!event.is_all_day && (
                              <div className="flex items-center space-x-1 mt-1 text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>{format(new Date(event.start_date), 'HH:mm')}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {view === 'day' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {format(currentDate, 'dd', { locale: es })}
                </div>
                <div className="text-lg text-muted-foreground">
                  {format(currentDate, 'EEEE, MMMM yyyy', { locale: es })}
                </div>
              </div>
              
              <div className="space-y-3">
                {getEventsForDate(currentDate).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay eventos programados para este día</p>
                    <Button 
                      onClick={() => {
                        setSelectedDate(currentDate);
                        setSelectedEvent(null);
                        setIsEventDialogOpen(true);
                      }}
                      className="mt-4"
                      variant="outline"
                    >
                      Crear evento
                    </Button>
                  </div>
                ) : (
                  getEventsForDate(currentDate)
                    .sort((a, b) => {
                      if (a.is_all_day && !b.is_all_day) return -1;
                      if (!a.is_all_day && b.is_all_day) return 1;
                      return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
                    })
                    .map((event) => (
                      <Card
                        key={event.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => {
                          setSelectedEvent(event);
                          setIsEventDialogOpen(true);
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center space-x-2">
                                <h3 className="font-medium text-lg">{event.title}</h3>
                                <Badge className={getEventColor(event)}>
                                  {event.event_type === 'reminder' ? 'Recordatorio' :
                                   event.event_type === 'meeting' ? 'Reunión' : 'Evento'}
                                </Badge>
                              </div>
                              
                              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                {!event.is_all_day ? (
                                  <div className="flex items-center space-x-1">
                                    <Clock className="h-4 w-4" />
                                    <span>
                                      {format(new Date(event.start_date), 'HH:mm')} - 
                                      {format(new Date(event.end_date), 'HH:mm')}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="text-primary font-medium">Todo el día</div>
                                )}
                                
                                {event.location && (
                                  <div className="flex items-center space-x-1">
                                    <MapPin className="h-4 w-4" />
                                    <span className="truncate max-w-[200px]">{event.location}</span>
                                  </div>
                                )}
                              </div>
                              
                              {event.description && (
                                <p className="text-sm text-muted-foreground">
                                  {event.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                )}
              </div>
            </div>
          )}

          {view === 'agenda' && (
            <div className="space-y-4">
              {events.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No tienes eventos programados
                </div>
              ) : (
                events.map((event) => (
                  <Card
                    key={event.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      setSelectedEvent(event);
                      setIsEventDialogOpen(true);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium">{event.title}</h3>
                            <Badge className={getEventColor(event)}>
                              {event.event_type === 'reminder' ? 'Recordatorio' :
                               event.event_type === 'meeting' ? 'Reunión' : 'Evento'}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <CalendarIcon className="h-4 w-4" />
                              <span>
                                {format(new Date(event.start_date), 'dd/MM/yyyy', { locale: es })}
                              </span>
                            </div>
                            
                            {!event.is_all_day && (
                              <div className="flex items-center space-x-1">
                                <Clock className="h-4 w-4" />
                                <span>
                                  {format(new Date(event.start_date), 'HH:mm')} - 
                                  {format(new Date(event.end_date), 'HH:mm')}
                                </span>
                              </div>
                            )}
                            
                            {event.location && (
                              <div className="flex items-center space-x-1">
                                <MapPin className="h-4 w-4" />
                                <span className="truncate max-w-[200px]">{event.location}</span>
                              </div>
                            )}
                          </div>
                          
                          {event.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {event.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <EventFormDialog
        isOpen={isEventDialogOpen}
        onOpenChange={setIsEventDialogOpen}
        event={selectedEvent}
        defaultDate={selectedDate}
      />

      <EventInvitationPanel
        isOpen={showInvitations}
        onOpenChange={setShowInvitations}
        invitations={receivedInvitations}
      />
    </div>
  );
};