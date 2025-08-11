import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, ChevronRight } from "lucide-react";
import { usePersonalCalendar } from "@/hooks/usePersonalCalendar";
import { QuickEventCreator } from "./QuickEventCreator";
import { format, parseISO, isToday, isTomorrow, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

export function CalendarWidget() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { events, createEvent } = usePersonalCalendar();
  const navigate = useNavigate();

  // Get upcoming events (next 7 days)
  const upcomingEvents = events
    .filter(event => {
      const eventDate = parseISO(event.start_date);
      const today = new Date();
      const weekFromNow = addDays(today, 7);
      return eventDate >= today && eventDate <= weekFromNow;
    })
    .slice(0, 5);

  const handleCreateEvent = async (eventData: any) => {
    await createEvent(eventData);
    setShowCreateModal(false);
  };

  const getEventTimeText = (event: any) => {
    const eventDate = parseISO(event.start_date);
    
    if (isToday(eventDate)) {
      return event.all_day ? "Hoy" : `Hoy, ${format(eventDate, "HH:mm")}`;
    } else if (isTomorrow(eventDate)) {
      return event.all_day ? "Mañana" : `Mañana, ${format(eventDate, "HH:mm")}`;
    } else {
      return event.all_day ? 
        format(eventDate, "EEE d MMM", { locale: es }) :
        format(eventDate, "EEE d MMM, HH:mm", { locale: es });
    }
  };

  return (
    <>
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendario
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate("/calendar")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {upcomingEvents.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-4">
                No tienes eventos próximos
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Crear evento
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map(event => (
                <div 
                  key={event.id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate("/calendar")}
                >
                  <div 
                    className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                    style={{ backgroundColor: event.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {getEventTimeText(event)}
                    </p>
                    {event.location && (
                      <p className="text-xs text-muted-foreground truncate">
                        📍 {event.location}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              
              {events.length > 5 && (
                <div className="text-center pt-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate("/calendar")}
                  >
                    Ver todos los eventos
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <QuickEventCreator
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateEvent}
      />
    </>
  );
}