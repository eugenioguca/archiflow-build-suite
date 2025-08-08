import React from 'react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PersonalEvent } from '@/hooks/usePersonalCalendar';
import { useIsMobile } from '@/hooks/use-mobile';
import { EventCard } from './EventCard';

interface AgendaTimelineViewProps {
  currentDate: Date;
  events: PersonalEvent[];
  onEventClick: (event: PersonalEvent) => void;
  onCreateEvent: () => void;
  onNavigateWeek: (direction: 'prev' | 'next') => void;
  onBack: () => void;
}

export const AgendaTimelineView: React.FC<AgendaTimelineViewProps> = ({
  currentDate,
  events,
  onEventClick,
  onCreateEvent,
  onNavigateWeek,
  onBack
}) => {
  const isMobile = useIsMobile();
  
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getEventsForDay = (date: Date) => {
    return events.filter(event => 
      isSameDay(new Date(event.start_date), date)
    ).sort((a, b) => {
      if (a.is_all_day && !b.is_all_day) return -1;
      if (!a.is_all_day && b.is_all_day) return 1;
      return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            className="hover:bg-muted/10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onNavigateWeek('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold">
              {format(weekStart, "d 'de' MMMM", { locale: es })} - {format(addDays(weekStart, 6), "d 'de' MMMM 'de' yyyy", { locale: es })}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => onNavigateWeek('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button onClick={onCreateEvent} size={isMobile ? "sm" : "default"}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo evento
        </Button>
      </div>

      {/* Week Grid */}
      <ScrollArea className={isMobile ? "h-[70vh]" : "h-[600px]"}>
        <div className="space-y-4">
          {weekDays.map((day) => {
            const dayEvents = getEventsForDay(day);
            const isToday = isSameDay(day, new Date());
            
            return (
              <Card key={day.toString()} className="border-muted/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`font-medium ${isToday ? 'text-primary' : 'text-foreground'}`}>
                        {format(day, "EEEE", { locale: es })}
                      </h3>
                      <p className={`text-sm ${isToday ? 'text-primary/70' : 'text-muted-foreground'}`}>
                        {format(day, "d 'de' MMMM", { locale: es })}
                      </p>
                    </div>
                    {isToday && (
                      <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                        Hoy
                      </div>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  {dayEvents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm mb-2">Sin eventos programados</p>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={onCreateEvent}
                        className="text-xs hover:bg-muted/10"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Crear evento
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dayEvents.map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          onClick={onEventClick}
                          variant="full"
                          className="hover:bg-muted/5"
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};