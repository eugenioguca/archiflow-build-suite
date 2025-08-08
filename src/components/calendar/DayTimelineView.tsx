import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, ArrowLeft, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PersonalEvent } from '@/hooks/usePersonalCalendar';
import { useIsMobile } from '@/hooks/use-mobile';
import { EventCard } from './EventCard';

interface DayTimelineViewProps {
  date: Date;
  events: PersonalEvent[];
  onEventClick: (event: PersonalEvent) => void;
  onCreateEvent: () => void;
  onBack: () => void;
}

export const DayTimelineView: React.FC<DayTimelineViewProps> = ({
  date,
  events,
  onEventClick,
  onCreateEvent,
  onBack
}) => {
  const isMobile = useIsMobile();

  // Generate time slots from 6 AM to 10 PM
  const timeSlots = Array.from({ length: 17 }, (_, i) => {
    const hour = i + 6;
    return {
      time: `${hour.toString().padStart(2, '0')}:00`,
      hour: hour,
      label: format(new Date().setHours(hour, 0, 0, 0), 'HH:mm')
    };
  });

  const getEventsForHour = (hour: number) => {
    return events.filter(event => {
      if (event.is_all_day) return hour === 6; // Show all-day events at 6 AM
      const eventStart = new Date(event.start_date);
      const eventEnd = new Date(event.end_date);
      return eventStart.getHours() <= hour && eventEnd.getHours() > hour;
    });
  };

  const isToday = date.toDateString() === new Date().toDateString();
  const isYesterday = date.toDateString() === new Date(Date.now() - 86400000).toDateString();
  const isTomorrow = date.toDateString() === new Date(Date.now() + 86400000).toDateString();

  const getDateDisplay = () => {
    if (isToday) return 'Hoy';
    if (isYesterday) return 'Ayer';
    if (isTomorrow) return 'Mañana';
    return format(date, "EEEE, d 'de' MMMM", { locale: es });
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
          <div>
            <h2 className="text-xl font-semibold">{getDateDisplay()}</h2>
            <p className="text-sm text-muted-foreground">
              {format(date, "d 'de' MMMM 'de' yyyy", { locale: es })}
            </p>
          </div>
        </div>
        <Button onClick={onCreateEvent} size={isMobile ? "sm" : "default"}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo evento
        </Button>
      </div>

      {/* Timeline */}
      <Card className="border-muted/20">
        <CardContent className="p-0">
          <ScrollArea className={isMobile ? "h-[70vh]" : "h-[600px]"}>
            <div className="relative">
              {timeSlots.map((slot, index) => {
                const hourEvents = getEventsForHour(slot.hour);
                const isCurrentHour = isToday && new Date().getHours() === slot.hour;
                
                return (
                  <div 
                    key={slot.time}
                    className="relative border-b border-muted/10 last:border-0"
                  >
                    <div className="flex">
                      {/* Time column */}
                      <div className="w-16 flex-shrink-0 p-3 text-right border-r border-muted/10">
                        <div className={`text-sm ${isCurrentHour ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                          {slot.label}
                        </div>
                      </div>
                      
                      {/* Events column */}
                      <div className="flex-1 min-h-[60px] p-3 relative">
                        {isCurrentHour && (
                          <div className="absolute left-0 top-1/2 w-full h-0.5 bg-primary/30 z-10" />
                        )}
                        
                        {hourEvents.length > 0 ? (
                          <div className="space-y-2">
                            {hourEvents.map((event) => (
                              <EventCard
                                key={event.id}
                                event={event}
                                onClick={onEventClick}
                                variant="compact"
                                className="hover:bg-muted/5"
                              />
                            ))}
                          </div>
                        ) : (
                          <div 
                            className="h-full min-h-[40px] flex items-center justify-center text-muted-foreground/50 hover:bg-muted/5 rounded cursor-pointer group transition-colors"
                            onClick={onCreateEvent}
                          >
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-xs">
                              <Plus className="h-3 w-3 mr-1" />
                              Crear evento
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};