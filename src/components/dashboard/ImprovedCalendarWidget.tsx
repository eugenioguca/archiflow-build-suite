import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Plus, Clock, MapPin, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
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
  const navigate = useNavigate();
  const [showQuickCreator, setShowQuickCreator] = useState(false);
  const [viewMode, setViewMode] = useState<'upcoming' | 'month'>('month');
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
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()) || [];

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
      <Card className="glassmorphic-bg border-0 shadow-lg overflow-hidden h-[600px] w-full">
        <CardHeader className="pb-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-primary" />
              Calendario
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={viewMode} onValueChange={(value: 'upcoming' | 'month') => setViewMode(value)}>
                <SelectTrigger className="w-[100px] h-8 text-xs">
                  <Filter className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Mes</SelectItem>
                  <SelectItem value="upcoming">Próximos</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => setShowQuickCreator(true)}
                variant="default"
                size="sm"
                className="h-8 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Crear
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="h-[calc(100%-88px)] flex flex-col px-4 pb-4">
          {viewMode === 'month' ? (
            /* Enhanced Month Calendar with Upcoming Events */
            <div className="flex-1 flex flex-col min-h-0 space-y-3">
              {/* Month navigation */}
              <div className="flex items-center justify-between px-2 flex-shrink-0">
                <Button
                  onClick={previousMonth}
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="font-semibold text-base capitalize">
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
              <div className="h-[280px] flex flex-col min-h-0 flex-shrink-0">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {/* Week days */}
                  {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day, index) => (
                    <div key={index} className="text-xs font-semibold text-muted-foreground p-1 text-center">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1 flex-1 min-h-0">
                  {/* Calendar days */}
                  {calendarDays.map((day, index) => (
                    <div
                      key={index}
                      className={`
                        text-sm p-1 min-h-[32px] flex flex-col items-center justify-start relative border border-muted/30 rounded-lg
                        ${!day ? 'bg-muted/10' : 
                          day.isToday 
                            ? 'bg-primary text-primary-foreground font-semibold shadow-md' 
                            : 'hover:bg-muted/30 cursor-pointer transition-colors bg-background'
                        }
                      `}
                    >
                      {day && (
                        <>
                          <span className="text-xs font-medium">{day.day}</span>
                          {day.hasEvents && (
                            <div className="flex flex-wrap gap-0.5 mt-0.5">
                              <div className={`w-1 h-1 rounded-full ${day.isToday ? 'bg-primary-foreground' : 'bg-primary'}`}></div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming Events Section - Always visible in month view */}
              <div className="border-t border-muted/30 pt-3 h-[150px] flex flex-col flex-shrink-0">
                <div className="flex items-center justify-between mb-2 flex-shrink-0">
                  <h4 className="text-sm font-semibold text-foreground">Próximos Eventos</h4>
                  <Button
                    onClick={() => setViewMode('upcoming')}
                    variant="ghost"
                    size="sm"
                    className="text-xs h-6 px-2 text-muted-foreground hover:text-foreground"
                  >
                    Ver todos
                  </Button>
                </div>

                {upcomingEvents.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-xs text-muted-foreground">No hay eventos próximos</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-0" style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--muted)) transparent' }}>
                    {upcomingEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start space-x-2 p-2 rounded-md bg-muted/20 hover:bg-muted/40 transition-colors border border-muted/20 flex-shrink-0"
                      >
                        <div className="flex-shrink-0 mt-1">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate text-foreground">{event.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span className="truncate">{formatEventDate(event.start_date)}</span>
                            <span>•</span>
                            <span className="truncate">{formatEventTime(event)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Enhanced Upcoming Events Full View */
            <div className="flex-1 flex flex-col min-h-0 space-y-3">
              <div className="flex flex-col space-y-2 flex-shrink-0">
                <h3 className="font-semibold text-base">Próximos Eventos</h3>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setViewMode('month')}
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                  >
                    Volver al mes
                  </Button>
                  <Button
                    onClick={() => navigate('/calendar')}
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                  >
                    Ver calendario completo
                  </Button>
                </div>
              </div>

              {upcomingEvents.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No hay eventos próximos</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Crea tu primer evento</p>
                </div>
              ) : (
                <div 
                  className="flex-1 overflow-y-auto space-y-2 pr-2 min-h-0" 
                  style={{ 
                    scrollbarWidth: 'thin', 
                    scrollbarColor: 'hsl(var(--muted)) transparent',
                    maxHeight: '100%'
                  }}
                >
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start space-x-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-all duration-200 border border-muted/30 hover:border-muted/50 flex-shrink-0"
                    >
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-3 h-3 bg-primary rounded-full shadow-sm"></div>
                      </div>
                      
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm font-semibold truncate text-foreground">{event.title}</p>
                        
                        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{formatEventDate(event.start_date)}</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{formatEventTime(event)}</span>
                          </div>
                          
                          {event.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {showQuickCreator && (
        <QuickEventCreator
          open={showQuickCreator}
          onClose={() => setShowQuickCreator(false)}
          onSubmit={(eventData) => createEvent(eventData as any)}
        />
      )}
    </>
  );
}