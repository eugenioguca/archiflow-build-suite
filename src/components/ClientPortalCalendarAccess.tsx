import { useState } from "react";
import { Calendar, Clock, MapPin, Users, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePersonalCalendar } from "@/hooks/usePersonalCalendar";
import { EventFormDialog } from "./EventFormDialog";
import { format, isToday, isTomorrow } from "date-fns";
import { es } from "date-fns/locale";

interface ClientPortalCalendarAccessProps {
  clientId: string;
  projectId?: string;
}

export const ClientPortalCalendarAccess = ({ 
  clientId, 
  projectId 
}: ClientPortalCalendarAccessProps) => {
  const { events, receivedInvitations, isLoading } = usePersonalCalendar();
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);

  // Filter events related to the client's project
  const clientEvents = events.filter(event => {
    // For clients, show all their events and events they're invited to
    return true; // Clients see their own calendar
  });

  // Get upcoming events (next 7 days)
  const upcomingEvents = clientEvents
    .filter(event => {
      const eventDate = new Date(event.start_date);
      const now = new Date();
      const diffInDays = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diffInDays >= 0 && diffInDays <= 7;
    })
    .slice(0, 5);

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'meeting':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'reminder':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="h-full">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
              Mi Calendario
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setIsEventDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Crear
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {/* Invitaciones pendientes */}
          {receivedInvitations.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Invitaciones pendientes
              </h4>
              <div className="space-y-2">
                {receivedInvitations.slice(0, 3).map((invitation: any) => (
                  <div key={invitation.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{invitation.event?.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Por: {invitation.inviter?.full_name}
                        </p>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        Pendiente
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Próximos eventos */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">
              Próximos eventos
            </h4>
            
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No tienes eventos próximos</p>
                <p className="text-xs mt-1">¡Programa una reunión o crea un recordatorio!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${getEventTypeColor(event.event_type)}`}>
                        {event.event_type === 'meeting' ? (
                          <Users className="h-4 w-4" />
                        ) : (
                          <Calendar className="h-4 w-4" />
                        )}
                      </div>
                      
                      <div className="flex-1 space-y-1">
                        <h5 className="font-medium text-sm">{event.title}</h5>
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            {event.is_all_day 
                              ? format(new Date(event.start_date), "dd 'de' MMMM", { locale: es })
                              : getEventTimeDescription(event.start_date)
                            }
                          </span>
                        </div>
                        
                        {event.location && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{event.location}</span>
                          </div>
                        )}
                        
                        {event.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {event.description}
                          </p>
                        )}
                      </div>
                      
                      <Badge className={getEventTypeColor(event.event_type)}>
                        {event.event_type === 'meeting' ? 'Reunión' : 
                         event.event_type === 'reminder' ? 'Recordatorio' : 'Evento'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Link to full calendar */}
          <div className="mt-6 pt-4 border-t">
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

      <EventFormDialog
        isOpen={isEventDialogOpen}
        onOpenChange={setIsEventDialogOpen}
        event={null}
        defaultDate={new Date()}
      />
    </>
  );
};