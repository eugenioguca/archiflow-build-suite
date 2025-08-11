import React, { useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Calendar, Clock, MapPin, Users } from "lucide-react";
import { useClientProjectCalendarAlerts } from "@/hooks/useClientProjectCalendarAlerts";

export const ClientProjectAlertNotification = () => {
  const { activeAlert, dismissAlert } = useClientProjectCalendarAlerts();

  useEffect(() => {
    if (activeAlert) {
      const timer = setTimeout(() => {
        dismissAlert();
      }, 10000); // Auto dismiss after 10 seconds

      return () => clearTimeout(timer);
    }
  }, [activeAlert, dismissAlert]);

  if (!activeAlert) return null;

  const startDate = new Date(activeAlert.event_start_date);

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-full duration-300">
      <Card className="w-80 shadow-lg border-primary bg-card">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="font-semibold text-primary">Recordatorio de Proyecto</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissAlert}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-foreground">{activeAlert.event_title}</h4>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <Users className="h-3 w-3" />
                <span>{activeAlert.project_name}</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <span>Cliente: {activeAlert.client_name}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                {format(startDate, "EEEE, d 'de' MMMM", { locale: es })} a las{" "}
                {format(startDate, "HH:mm")}
              </span>
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button 
                onClick={dismissAlert} 
                variant="outline" 
                size="sm" 
                className="flex-1"
              >
                Entendido
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};