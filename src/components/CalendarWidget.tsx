import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Clock, MapPin } from "lucide-react";
import { usePersonalCalendar } from "@/hooks/usePersonalCalendar";

export const CalendarWidget = () => {
  const { events, isLoading } = usePersonalCalendar();

  // Obtener próximos 3 eventos
  const upcomingEvents = events
    .filter(event => new Date(event.start_date) >= new Date())
    .slice(0, 3);

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'meeting': return 'bg-blue-100 text-blue-800';
      case 'reminder': return 'bg-purple-100 text-purple-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center space-x-2">
            <CalendarIcon className="h-4 w-4" />
            <span>Próximos Eventos</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center space-x-2">
          <CalendarIcon className="h-4 w-4" />
          <span>Próximos Eventos</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcomingEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tienes eventos próximos</p>
        ) : (
          upcomingEvents.map((event) => (
            <div key={event.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate">{event.title}</span>
                <Badge className={getEventColor(event.event_type)} variant="secondary">
                  {event.event_type === 'meeting' ? 'M' : 
                   event.event_type === 'reminder' ? 'R' : 'E'}
                </Badge>
              </div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <CalendarIcon className="h-3 w-3" />
                <span>{format(new Date(event.start_date), 'dd/MM', { locale: es })}</span>
                {!event.is_all_day && (
                  <>
                    <Clock className="h-3 w-3" />
                    <span>{format(new Date(event.start_date), 'HH:mm')}</span>
                  </>
                )}
                {event.location && (
                  <>
                    <MapPin className="h-3 w-3" />
                    <span className="truncate max-w-[80px]">{event.location}</span>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};