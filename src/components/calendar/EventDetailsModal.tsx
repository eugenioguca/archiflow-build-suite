import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarEvent } from "@/hooks/usePersonalCalendar";
import { QuickEventCreator } from "./QuickEventCreator";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Clock, MapPin, Bell, Edit, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface EventDetailsModalProps {
  event: CalendarEvent | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (eventData: any) => void;
  onDelete: () => void;
}

export function EventDetailsModal({ 
  event, 
  open, 
  onClose, 
  onUpdate, 
  onDelete 
}: EventDetailsModalProps) {
  const [showEditModal, setShowEditModal] = useState(false);

  if (!event) return null;

  const startDate = parseISO(event.start_date);
  const endDate = parseISO(event.end_date);

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleUpdate = (eventData: any) => {
    onUpdate(eventData);
    setShowEditModal(false);
  };

  const getAlertDescription = (alert: any) => {
    const timeText = `${alert.alert_value} ${
      alert.alert_type === "minutes" ? "minutos" :
      alert.alert_type === "hours" ? "horas" : "días"
    } antes`;
    
    const soundText = alert.sound_enabled ? 
      ` (con sonido ${alert.sound_type})` : " (sin sonido)";
    
    return timeText + soundText;
  };

  return (
    <>
      <Dialog open={open && !showEditModal} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded"
                style={{ backgroundColor: event.color }}
              />
              {event.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {event.description && (
              <div>
                <p className="text-sm text-muted-foreground">{event.description}</p>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(startDate, "EEEE, d MMMM yyyy", { locale: es })}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {event.all_day ? (
                    "Todo el día"
                  ) : (
                    `${format(startDate, "HH:mm")} - ${format(endDate, "HH:mm")}`
                  )}
                </span>
              </div>

              {event.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{event.location}</span>
                </div>
              )}

              {event.alerts && event.alerts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <span>Alertas</span>
                  </div>
                  <div className="pl-6 space-y-1">
                    {event.alerts.map((alert, index) => (
                      <div key={index} className="text-sm text-muted-foreground">
                        {getAlertDescription(alert)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
              >
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar evento?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. El evento "{event.title}" será eliminado permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={onDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <QuickEventCreator
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleUpdate}
        event={event}
      />
    </>
  );
}