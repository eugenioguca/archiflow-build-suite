import { useEffect, useState } from "react";
import { Bell, Calendar, Clock, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePersonalCalendar } from "@/hooks/usePersonalCalendar";
import { format, isToday, isTomorrow } from "date-fns";
import { es } from "date-fns/locale";

export const CalendarNotificationSystem = () => {
  const { events } = usePersonalCalendar();
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);

  useEffect(() => {
    const now = new Date();
    const upcoming = events.filter(event => {
      const eventDate = new Date(event.start_date);
      const diffInHours = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      return diffInHours >= 0 && diffInHours <= 24; // Next 24 hours
    });
    
    setUpcomingEvents(upcoming);
  }, [events]);

  const getEventTimeDescription = (startDate: string) => {
    const date = new Date(startDate);
    if (isToday(date)) {
      return `Hoy a las ${format(date, 'HH:mm')}`;
    } else if (isTomorrow(date)) {
      return `Mañana a las ${format(date, 'HH:mm')}`;
    } else {
      return format(date, "dd 'de' MMMM 'a las' HH:mm", { locale: es });
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'meeting':
        return <Users className="h-4 w-4" />;
      case 'reminder':
        return <Bell className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'meeting':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'reminder':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  if (upcomingEvents.length === 0) return null;

  return (
    <Card className="border-0 shadow-lg glassmorphic-bg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
        <CardTitle className="flex items-center gap-3 text-lg">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Bell className="h-5 w-5 text-blue-600" />
          </div>
          Notificaciones del Calendario
          <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">
            {upcomingEvents.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">

        {/* Eventos próximos */}
        {upcomingEvents.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Próximos eventos ({upcomingEvents.length})
            </h4>
            {upcomingEvents.map((event) => (
              <div key={event.id} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-lg ${getEventTypeColor(event.event_type)}`}>
                    {getEventTypeIcon(event.event_type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{event.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        {getEventTimeDescription(event.start_date)}
                      </p>
                    </div>
                    {event.location && (
                      <p className="text-xs text-muted-foreground mt-1">
                        📍 {event.location}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-2 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => window.location.href = '/calendar'}
          >
            Ver calendario completo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};