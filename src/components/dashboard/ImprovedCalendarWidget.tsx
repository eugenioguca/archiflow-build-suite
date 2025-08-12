import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Clock, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePersonalCalendar } from '@/hooks/usePersonalCalendar';
import { QuickEventCreator } from '@/components/calendar/QuickEventCreator';

interface CalendarEvent {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  location?: string;
  all_day: boolean;
}

export function ImprovedCalendarWidget() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showQuickCreator, setShowQuickCreator] = useState(false);
  const { events, createEvent } = usePersonalCalendar();

  // Get current month events and upcoming events
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const upcomingEvents = events
    ?.filter(event => {
      const eventDate = new Date(event.start_date);
      const now = new Date();
      return eventDate > now;
    })
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
    .slice(0, 4) || [];

  // Generate calendar grid
  const generateCalendarDays = () => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const firstDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const hasEvents = events?.some(event => {
        const eventDate = new Date(event.start_date);
        return eventDate.toDateString() === date.toDateString();
      });
      
      days.push({
        day,
        date,
        hasEvents,
        isToday: date.toDateString() === new Date().toDateString()
      });
    }
    
    return days;
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const getMonthName = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(date);
  };

  const formatEventTime = (event: CalendarEvent) => {
    if (event.all_day) return 'Todo el día';
    
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);
    
    return `${start.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })} - ${end.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`;
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Mañana';
    } else {
      return new Intl.DateTimeFormat('es-ES', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      }).format(date);
    }
  };

  const calendarDays = generateCalendarDays();

  return (
    <>
      <Card className="glassmorphic-bg border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Mi Calendario
          </CardTitle>
          <Button
            onClick={() => setShowQuickCreator(true)}
            variant="outline"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Evento
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Mini Calendar */}
          <div className="space-y-3">
            {/* Month navigation */}
            <div className="flex items-center justify-between">
              <Button
                onClick={previousMonth}
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="font-semibold text-sm capitalize">
                {getMonthName(currentDate)}
              </h3>
              <Button
                onClick={nextMonth}
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {/* Week days */}
              {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((day, index) => (
                <div key={index} className="text-xs font-medium text-muted-foreground p-1">
                  {day}
                </div>
              ))}
              
              {/* Calendar days */}
              {calendarDays.map((day, index) => (
                <div
                  key={index}
                  className={`
                    text-xs p-1 h-8 flex items-center justify-center relative
                    ${!day ? '' : 
                      day.isToday 
                        ? 'bg-primary text-primary-foreground rounded-md font-semibold' 
                        : 'hover:bg-muted/50 rounded-md cursor-pointer'
                    }
                  `}
                >
                  {day && (
                    <>
                      {day.day}
                      {day.hasEvents && !day.isToday && (
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full"></div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Próximos Eventos</h3>
              {upcomingEvents.length > 4 && (
                <Button
                  onClick={() => window.location.href = '/calendar'}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                >
                  Ver todos
                </Button>
              )}
            </div>

            {upcomingEvents.length === 0 ? (
              <div className="text-center py-6">
                <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No hay eventos próximos</p>
                <Button
                  onClick={() => setShowQuickCreator(true)}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Crear evento
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start space-x-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatEventDate(event.start_date)}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatEventTime(event)}</span>
                        </div>
                      </div>
                      
                      {event.location && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {showQuickCreator && (
        <QuickEventCreator
          open={showQuickCreator}
          onOpenChange={setShowQuickCreator}
          onSubmit={(eventData) => createEvent(eventData as any)}
        />
      )}
    </>
  );
}