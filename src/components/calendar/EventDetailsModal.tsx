import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock, MapPin, Users, Edit, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PersonalEvent } from '@/hooks/usePersonalCalendar';
import { usePersonalCalendar } from '@/hooks/usePersonalCalendar';
import { useIsMobile } from '@/hooks/use-mobile';

interface EventDetailsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  event: PersonalEvent | null;
  onEdit: () => void;
}

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  isOpen,
  onOpenChange,
  event,
  onEdit
}) => {
  const { deleteEvent } = usePersonalCalendar();
  const isMobile = useIsMobile();

  if (!event) return null;

  const handleDelete = () => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este evento?')) {
      deleteEvent(event.id);
      onOpenChange(false);
    }
  };

  const getEventTypeDisplay = (type: string) => {
    switch (type) {
      case 'event': return 'Evento';
      case 'meeting': return 'Reunión';
      case 'reminder': return 'Recordatorio';
      default: return 'Evento';
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'event': return 'bg-primary text-primary-foreground';
      case 'meeting': return 'bg-secondary text-secondary-foreground';
      case 'reminder': return 'bg-accent text-accent-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatEventDate = (startDate: string, endDate: string, isAllDay: boolean) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isAllDay) {
      if (start.toDateString() === end.toDateString()) {
        return format(start, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
      } else {
        return `${format(start, "d 'de' MMMM", { locale: es })} - ${format(end, "d 'de' MMMM 'de' yyyy", { locale: es })}`;
      }
    } else {
      if (start.toDateString() === end.toDateString()) {
        return `${format(start, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })} • ${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
      } else {
        return `${format(start, "d 'de' MMM, HH:mm", { locale: es })} - ${format(end, "d 'de' MMM 'de' yyyy, HH:mm", { locale: es })}`;
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={`${isMobile ? 'w-[95vw] max-h-[90vh]' : 'max-w-md'} p-0`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-3">
                <Badge className={getEventTypeColor(event.event_type)}>
                  {getEventTypeDisplay(event.event_type)}
                </Badge>
                <DialogTitle className="text-xl font-semibold leading-tight">
                  {event.title}
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>

          {/* Content */}
          <ScrollArea className="flex-1 px-6">
            <div className="space-y-4 py-4">
              {/* Date and Time */}
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg mt-0.5">
                  {event.is_all_day ? (
                    <Calendar className="h-4 w-4 text-primary" />
                  ) : (
                    <Clock className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm text-muted-foreground">
                    {event.is_all_day ? 'Todo el día' : 'Fecha y hora'}
                  </p>
                  <p className="text-sm">
                    {formatEventDate(event.start_date, event.end_date, event.is_all_day)}
                  </p>
                </div>
              </div>

              {/* Location */}
              {event.location && (
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-secondary/10 rounded-lg mt-0.5">
                    <MapPin className="h-4 w-4 text-secondary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-muted-foreground">Ubicación</p>
                    <p className="text-sm">{event.location}</p>
                  </div>
                </div>
              )}

              {/* Description */}
              {event.description && (
                <div className="space-y-2">
                  <p className="font-medium text-sm text-muted-foreground">Descripción</p>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm whitespace-pre-wrap">{event.description}</p>
                  </div>
                </div>
              )}

              {/* Invitations */}
              {event.invitations && event.invitations.length > 0 && (
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-accent/10 rounded-lg mt-0.5">
                    <Users className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-muted-foreground">Invitados</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {event.invitations.map((invitation, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          Invitado {index + 1}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Actions */}
          <div className="flex items-center gap-2 p-6 pt-0">
            <Button
              onClick={onEdit}
              className="flex-1"
              size={isMobile ? "lg" : "default"}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button
              onClick={handleDelete}
              variant="outline"
              size={isMobile ? "lg" : "default"}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};