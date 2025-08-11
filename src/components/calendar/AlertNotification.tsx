import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, X, Calendar, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useCalendarAlerts } from "@/hooks/useCalendarAlerts";

export function AlertNotification() {
  const { activeAlert, dismissAlert } = useCalendarAlerts();

  useEffect(() => {
    if (activeAlert) {
      // Auto-dismiss after 10 seconds
      const timer = setTimeout(() => {
        dismissAlert();
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [activeAlert, dismissAlert]);

  if (!activeAlert) return null;

  const eventDate = parseISO(activeAlert.event_start_date);

  return (
    <div className="fixed top-4 right-4 z-50 w-80 animate-slide-in-right">
      <Card className="border-primary shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <span className="font-medium text-sm">Recordatorio</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0"
              onClick={dismissAlert}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <h3 className="font-semibold mb-2">{activeAlert.event_title}</h3>
          
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{format(eventDate, "EEEE, d MMMM", { locale: es })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{format(eventDate, "HH:mm")}</span>
            </div>
          </div>
          
          <div className="flex justify-end mt-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={dismissAlert}
            >
              Entendido
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}