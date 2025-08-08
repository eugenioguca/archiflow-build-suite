import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Calendar, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PersonalEvent } from '@/hooks/usePersonalCalendar';
import { useIsMobile } from '@/hooks/use-mobile';

interface DayAgendaViewProps {
  date: Date;
  events: PersonalEvent[];
  onEventClick: (event: PersonalEvent) => void;
  onCreateEvent: () => void;
  onClose: () => void;
}

export const DayAgendaView: React.FC<DayAgendaViewProps> = ({
  date,
  events,
  onEventClick,
  onCreateEvent,
  onClose
}) => {
  const isMobile = useIsMobile();

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'event': return 'bg-primary/10 text-primary border-primary/20';
      case 'meeting': return 'bg-secondary/10 text-secondary border-secondary/20';
      case 'reminder': return 'bg-accent/10 text-accent border-accent/20';
      default: return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const formatTimeRange = (event: PersonalEvent) => {
    if (event.is_all_day) return 'Todo el día';
    
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);
    return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
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

  // Sort events by time
  const sortedEvents = [...events].sort((a, b) => {
    if (a.is_all_day && !b.is_all_day) return -1;
    if (!a.is_all_day && b.is_all_day) return 1;
    return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{getDateDisplay()}</h2>
          <p className="text-sm text-muted-foreground">
            {format(date, "d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onCreateEvent} size={isMobile ? "sm" : "default"}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo evento
          </Button>
          {isMobile && (
            <Button variant="outline" onClick={onClose} size="sm">
              ←
            </Button>
          )}
        </div>
      </div>

      {/* Events List */}
      <ScrollArea className={isMobile ? "h-[60vh]" : "h-96"}>
        <div className="space-y-3">
          {sortedEvents.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium text-muted-foreground mb-2">
                  No hay eventos programados
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Crea tu primer evento para este día
                </p>
                <Button onClick={onCreateEvent} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear evento
                </Button>
              </CardContent>
            </Card>
          ) : (
            sortedEvents.map((event) => (
              <Card 
                key={event.id} 
                className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
                onClick={() => onEventClick(event)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    {/* Event indicator */}
                    <div className={`w-1 h-12 rounded-full ${
                      event.event_type === 'event' ? 'bg-primary' :
                      event.event_type === 'meeting' ? 'bg-secondary' :
                      'bg-accent'
                    }`} />
                    
                    <div className="flex-1 min-w-0">
                      {/* Time and Type */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTimeRange(event)}
                        </div>
                        <Badge variant="outline" className={getEventTypeColor(event.event_type)}>
                          {event.event_type === 'event' ? 'Evento' :
                           event.event_type === 'meeting' ? 'Reunión' : 'Recordatorio'}
                        </Badge>
                      </div>

                      {/* Title */}
                      <h3 className="font-medium text-foreground mb-1 truncate">
                        {event.title}
                      </h3>

                      {/* Location */}
                      {event.location && (
                        <div className="flex items-center text-sm text-muted-foreground mb-2">
                          <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}

                      {/* Description preview */}
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
      </ScrollArea>
    </div>
  );
};