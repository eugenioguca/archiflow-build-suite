import React from 'react';
import { usePersonalCalendar } from '@/hooks/usePersonalCalendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, User } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const ClientPortalEventInvitations = () => {
  const { receivedInvitations, respondToInvitation, isResponding } = usePersonalCalendar();

  const handleAccept = (invitationId: string) => {
    respondToInvitation({ invitationId, status: 'accepted' });
  };

  const handleDecline = (invitationId: string) => {
    respondToInvitation({ invitationId, status: 'declined' });
  };

  if (receivedInvitations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Invitaciones de Calendario</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No tienes invitaciones pendientes.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Invitaciones de Calendario</span>
            <Badge variant="secondary">{receivedInvitations.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {receivedInvitations.map((invitation) => (
            <Card key={invitation.id} className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold">{invitation.event?.title || 'Evento'}</h4>
                    {invitation.event?.description && (
                      <p className="text-sm text-muted-foreground">{invitation.event.description}</p>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {invitation.inviter && (
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>Invitado por: {invitation.inviter.full_name}</span>
                      </div>
                    )}
                    
                    {invitation.event?.start_date && (
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(invitation.event.start_date), 'PPP', { locale: es })}</span>
                      </div>
                    )}
                    
                    {invitation.event?.start_date && !invitation.event?.is_all_day && (
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{format(new Date(invitation.event.start_date), 'HH:mm')}</span>
                      </div>
                    )}
                    
                    {invitation.event?.location && (
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4" />
                        <span>{invitation.event.location}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleAccept(invitation.id)}
                      disabled={isResponding}
                      className="flex-1"
                    >
                      Aceptar
                    </Button>
                    <Button
                      onClick={() => handleDecline(invitation.id)}
                      disabled={isResponding}
                      variant="outline"
                      className="flex-1"
                    >
                      Declinar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};