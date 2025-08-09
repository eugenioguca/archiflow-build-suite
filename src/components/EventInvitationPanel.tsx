import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, Clock, MapPin, User, MessageSquare } from "lucide-react";
import { usePersonalCalendar } from "@/hooks/usePersonalCalendar";

interface EventInvitationPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  invitations: any[];
}

export const EventInvitationPanel = ({ isOpen, onOpenChange, invitations }: EventInvitationPanelProps) => {
  const [selectedInvitation, setSelectedInvitation] = useState<any>(null);
  const [responseMessage, setResponseMessage] = useState("");
  
  const { respondToInvitation } = usePersonalCalendar();

  const handleResponse = (invitationId: string, status: 'accepted' | 'declined') => {
    respondToInvitation({
      invitationId,
      status
    });
    
    setSelectedInvitation(null);
    setResponseMessage("");
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'meeting': return 'Reunión';
      case 'reminder': return 'Recordatorio';
      default: return 'Evento';
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'meeting': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'reminder': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5" />
            <span>Invitaciones Pendientes ({invitations.length})</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {invitations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tienes invitaciones pendientes
            </div>
          ) : (
            invitations.map((invitation) => (
              <Card key={invitation.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Header del evento */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-lg">{invitation.event.title}</h3>
                          <Badge className={getEventTypeColor(invitation.event.event_type)}>
                            {getEventTypeLabel(invitation.event.event_type)}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span className="text-sm">
                            Invitado por: {invitation.inviter?.full_name}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Información del evento */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {format(new Date(invitation.event.start_date), 'EEEE, dd \'de\' MMMM \'de\' yyyy', { locale: es })}
                          </span>
                        </div>
                        
                        {!invitation.event.is_all_day && (
                          <div className="flex items-center space-x-2 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {format(new Date(invitation.event.start_date), 'HH:mm')} - 
                              {format(new Date(invitation.event.end_date), 'HH:mm')}
                            </span>
                          </div>
                        )}
                        
                        {invitation.event.location && (
                          <div className="flex items-center space-x-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">{invitation.event.location}</span>
                          </div>
                        )}
                      </div>

                      {invitation.event.description && (
                        <div className="space-y-1">
                          <span className="text-sm font-medium">Descripción:</span>
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {invitation.event.description}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Botones de respuesta */}
                    {selectedInvitation?.id === invitation.id ? (
                      <div className="space-y-3 border-t pt-3">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <MessageSquare className="h-4 w-4" />
                            <span className="text-sm font-medium">Mensaje (opcional):</span>
                          </div>
                          <Textarea
                            placeholder="Agrega un mensaje con tu respuesta..."
                            value={responseMessage}
                            onChange={(e) => setResponseMessage(e.target.value)}
                            rows={2}
                            className="resize-none"
                          />
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleResponse(invitation.id, 'accepted')}
                            className="flex-1"
                          >
                            Aceptar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleResponse(invitation.id, 'declined')}
                            className="flex-1"
                          >
                            Declinar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedInvitation(null);
                              setResponseMessage("");
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex space-x-2 border-t pt-3">
                        <Button
                          size="sm"
                          onClick={() => setSelectedInvitation(invitation)}
                          className="flex-1"
                        >
                          Responder
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResponse(invitation.id, 'accepted')}
                          className="flex-1"
                        >
                          Aceptar rápido
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResponse(invitation.id, 'declined')}
                          className="flex-1"
                        >
                          Declinar
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};