import React, { useState, useMemo } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { usePersonalCalendar, PersonalEvent } from '@/hooks/usePersonalCalendar';
import { EventFormDialogSimple } from './calendar/EventFormDialogSimple';
import { EventDetailsModal } from './calendar/EventDetailsModal';
import { DayAgendaView } from './calendar/DayAgendaView';
import { DayTimelineView } from './calendar/DayTimelineView';
import { AgendaTimelineView } from './calendar/AgendaTimelineView';
import { EventCard } from './calendar/EventCard';
import { NotificationBadge } from './calendar/NotificationBadge';
import { EventInvitationPanel } from './EventInvitationPanel';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCalendarNotifications } from '@/hooks/useCalendarNotifications';
import { useEventAlerts } from '@/hooks/useEventAlerts';

type CalendarView = 'month' | 'week' | 'day' | 'agenda';

export const PersonalCalendarImproved: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<PersonalEvent | null>(null);
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(false);
  const [showInvitations, setShowInvitations] = useState(false);
  const [showDayAgenda, setShowDayAgenda] = useState(false);
  const [showDayTimeline, setShowDayTimeline] = useState(false);
  const [showAgendaTimeline, setShowAgendaTimeline] = useState(false);
  const [selectedAgendaDate, setSelectedAgendaDate] = useState<Date | null>(null);

  const { events, receivedInvitations, isLoading, error } = usePersonalCalendar();
  const isMobile = useIsMobile();
  
  // Initialize notifications and alerts
  useCalendarNotifications();
  useEventAlerts();

  // Get events for a specific date
  const getEventsForDate = (date: Date): PersonalEvent[] => {
    if (!events) return [];
    return events.filter(event => {
      const eventStart = new Date(event.start_date);
      const eventEnd = new Date(event.end_date);
      return date >= new Date(eventStart.toDateString()) && date <= new Date(eventEnd.toDateString());
    });
  };

  // Generate calendar days for month view
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // Generate week days for week view
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  // Get upcoming events for agenda view
  const upcomingEvents = useMemo(() => {
    if (!events) return [];
    const now = new Date();
    return events
      .filter(event => new Date(event.start_date) >= now)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      .slice(0, 20);
  }, [events]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
  };

  const handleDateClick = (date: Date) => {
    if (view === 'month' || view === 'week') {
      // Show day timeline view
      setSelectedAgendaDate(date);
      setShowDayTimeline(true);
    } else if (view === 'day') {
      // Create event for this day
      setSelectedDate(date);
      setSelectedEvent(null);
      setIsEventDialogOpen(true);
    } else {
      // Agenda view - create event
      setSelectedDate(date);
      setSelectedEvent(null);
      setIsEventDialogOpen(true);
    }
  };

  const handleEventClick = (event: PersonalEvent) => {
    setSelectedEvent(event);
    setIsEventDetailsOpen(true);
  };

  const handleEditEvent = () => {
    setIsEventDetailsOpen(false);
    setIsEventDialogOpen(true);
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setIsEventDialogOpen(true);
  };

  const getEventColor = (event: PersonalEvent): string => {
    switch (event.event_type) {
      case 'event': return 'bg-primary text-primary-foreground';
      case 'meeting': return 'bg-secondary text-secondary-foreground';
      case 'reminder': return 'bg-accent text-accent-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando calendario...</p>
        </div>
      </div>
    );
  }

  // Show day timeline view
  if (showDayTimeline && selectedAgendaDate) {
    return (
      <div className="space-y-4">
        <DayTimelineView
          date={selectedAgendaDate}
          events={getEventsForDate(selectedAgendaDate)}
          onEventClick={handleEventClick}
          onCreateEvent={() => {
            setSelectedDate(selectedAgendaDate);
            setSelectedEvent(null);
            setIsEventDialogOpen(true);
          }}
          onBack={() => setShowDayTimeline(false)}
        />
        
        <EventFormDialogSimple
          isOpen={isEventDialogOpen}
          onOpenChange={setIsEventDialogOpen}
          event={selectedEvent}
          defaultDate={selectedAgendaDate}
        />
        
        <EventDetailsModal
          isOpen={isEventDetailsOpen}
          onOpenChange={setIsEventDetailsOpen}
          event={selectedEvent}
          onEdit={handleEditEvent}
        />
      </div>
    );
  }

  // Show agenda timeline view
  if (showAgendaTimeline) {
    return (
      <div className="space-y-4">
        <AgendaTimelineView
          currentDate={currentDate}
          events={events || []}
          onEventClick={handleEventClick}
          onCreateEvent={handleCreateEvent}
          onNavigateWeek={(direction) => {
            setCurrentDate(direction === 'next' ? addDays(currentDate, 7) : addDays(currentDate, -7));
          }}
          onBack={() => setShowAgendaTimeline(false)}
        />
        
        <EventFormDialogSimple
          isOpen={isEventDialogOpen}
          onOpenChange={setIsEventDialogOpen}
          event={selectedEvent}
          defaultDate={selectedDate}
        />
        
        <EventDetailsModal
          isOpen={isEventDetailsOpen}
          onOpenChange={setIsEventDetailsOpen}
          event={selectedEvent}
          onEdit={handleEditEvent}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col space-y-4">
            {/* Title and Main Actions */}
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold">
                Mi Calendario
              </CardTitle>
               <div className="flex items-center space-x-2">
                 {/* Notification Badge */}
                 <NotificationBadge />
                 
                 <Button onClick={handleCreateEvent} size={isMobile ? "sm" : "default"}>
                   <Plus className="h-4 w-4 mr-2" />
                   Nuevo evento
                 </Button>
                {receivedInvitations && receivedInvitations.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setShowInvitations(!showInvitations)}
                    size={isMobile ? "sm" : "default"}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    {receivedInvitations.length}
                  </Button>
                )}
              </div>
            </div>

            {/* Navigation and View Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <h2 className="text-lg font-medium min-w-[200px] text-center">
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

              {/* View Selector */}
              <div className="flex items-center space-x-1 bg-muted rounded-lg p-1">
                {(['month', 'week', 'day', 'agenda'] as CalendarView[]).map((viewType) => (
                  <Button
                    key={viewType}
                    variant={view === viewType ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setView(viewType)}
                    className="text-xs px-3"
                  >
                    {viewType === 'month' ? 'Mes' :
                     viewType === 'week' ? 'Semana' :
                     viewType === 'day' ? 'Día' : 'Agenda'}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Invitations Panel */}
          {showInvitations && receivedInvitations && receivedInvitations.length > 0 && (
            <div className="mb-6">
              <EventInvitationPanel 
                isOpen={showInvitations}
                onOpenChange={setShowInvitations}
                invitations={receivedInvitations}
              />
            </div>
          )}

          {/* Calendar Views */}
          {view === 'month' && (
            <div className="space-y-4">
              {/* Week Days Header */}
              <div className="grid grid-cols-7 gap-1">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day) => {
                  const dayEvents = getEventsForDate(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isDayToday = isToday(day);

                  return (
                    <div
                      key={day.toString()}
                      onClick={() => handleDateClick(day)}
                      className={cn(
                        "min-h-[80px] p-2 border rounded-lg cursor-pointer transition-all duration-200 hover:bg-muted/50",
                        !isCurrentMonth && "text-muted-foreground bg-muted/20",
                        isDayToday && "bg-primary/10 border-primary",
                        "hover:scale-[1.02]"
                      )}
                    >
                      <div className={cn(
                        "text-sm font-medium mb-1",
                        isDayToday && "text-primary font-semibold"
                      )}>
                        {format(day, 'd')}
                      </div>
                      
                      <div className="space-y-1">
                        {dayEvents.slice(0, isMobile ? 2 : 3).map((event) => (
                          <EventCard
                            key={event.id}
                            event={event}
                            onClick={handleEventClick}
                            variant="minimal"
                            className="text-xs"
                          />
                        ))}
                        {dayEvents.length > (isMobile ? 2 : 3) && (
                          <div className="text-xs text-muted-foreground">
                            +{dayEvents.length - (isMobile ? 2 : 3)} más
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {view === 'week' && (
            <div className="space-y-4">
              {/* Week Header */}
              <div className="grid grid-cols-8 gap-2">
                <div className="p-2"></div> {/* Time column header */}
                {weekDays.map((day) => (
                  <div key={day.toString()} className="p-2 text-center">
                    <div className={cn(
                      "text-sm font-medium",
                      isToday(day) && "text-primary font-semibold"
                    )}>
                      {format(day, 'EEE', { locale: es })}
                    </div>
                    <div className={cn(
                      "text-lg",
                      isToday(day) && "text-primary font-bold"
                    )}>
                      {format(day, 'd')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Week Grid */}
              <ScrollArea className="h-96">
                <div className="grid grid-cols-8 gap-2">
                  {/* Time slots */}
                  <div className="space-y-16">
                    {Array.from({ length: 12 }, (_, i) => (
                      <div key={i} className="text-xs text-muted-foreground text-right pr-2">
                        {String(8 + i).padStart(2, '0')}:00
                      </div>
                    ))}
                  </div>

                  {/* Day columns */}
                  {weekDays.map((day) => {
                    const dayEvents = getEventsForDate(day);
                    return (
                      <div
                        key={day.toString()}
                        onClick={() => handleDateClick(day)}
                        className="space-y-1 min-h-[600px] border-l border-muted cursor-pointer hover:bg-muted/20 p-1"
                      >
                        {dayEvents.map((event) => (
                          <EventCard
                            key={event.id}
                            event={event}
                            onClick={handleEventClick}
                            variant="compact"
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          {view === 'day' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">
                  {format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                </h3>
                <Button
                  onClick={() => {
                    setSelectedAgendaDate(currentDate);
                    setShowDayTimeline(true);
                  }}
                  variant="outline"
                  size="sm"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Vista por horas
                </Button>
              </div>
              
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {getEventsForDate(currentDate).map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onClick={handleEventClick}
                      variant="full"
                    />
                  ))}
                  {getEventsForDate(currentDate).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay eventos para este día</p>
                      <Button onClick={handleCreateEvent} variant="outline" className="mt-4">
                        <Plus className="h-4 w-4 mr-2" />
                        Crear evento
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {view === 'agenda' && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <Button
                  onClick={() => setShowAgendaTimeline(true)}
                  variant="outline"
                  className="mb-4"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Ver agenda por horas
                </Button>
              </div>
              
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {upcomingEvents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay eventos próximos</p>
                      <Button onClick={handleCreateEvent} variant="outline" className="mt-4">
                        <Plus className="h-4 w-4 mr-2" />
                        Crear evento
                      </Button>
                    </div>
                  ) : (
                    upcomingEvents.map((event) => {
                      const eventDate = new Date(event.start_date);
                      return (
                        <div key={event.id} className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">
                            {format(eventDate, "EEEE, d 'de' MMMM", { locale: es })}
                          </div>
                          <EventCard
                            event={event}
                            onClick={handleEventClick}
                            variant="full"
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <EventFormDialogSimple
        isOpen={isEventDialogOpen}
        onOpenChange={setIsEventDialogOpen}
        event={selectedEvent}
        defaultDate={selectedDate}
      />

      <EventDetailsModal
        isOpen={isEventDetailsOpen}
        onOpenChange={setIsEventDetailsOpen}
        event={selectedEvent}
        onEdit={handleEditEvent}
      />
    </div>
  );
};