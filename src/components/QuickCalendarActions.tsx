import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCRMCalendarIntegration } from "@/hooks/useCRMCalendarIntegration";
import { QuickEventCreator } from "./calendar/QuickEventCreator";
import { Calendar, Clock, CalendarPlus, Star } from "lucide-react";
import { addDays } from "date-fns";

interface QuickCalendarActionsProps {
  clientId: string;
  clientName: string;
  projectId?: string;
  projectName?: string;
  clientAddress?: string;
  salesStage?: string;
}

export const QuickCalendarActions = ({
  clientId,
  clientName,
  projectId,
  projectName,
  clientAddress,
  salesStage
}: QuickCalendarActionsProps) => {
  const { createQuickCRMReminder, getPrePopulatedEventData, loading } = useCRMCalendarIntegration();
  const [showCustomDialog, setShowCustomDialog] = useState(false);

  const crmData = {
    clientId,
    clientName,
    projectId,
    projectName,
    clientAddress,
    salesStage
  };

  const handleQuickReminder = async (days: number, title: string) => {
    await createQuickCRMReminder(crmData, {
      days,
      title: `${title} - ${clientName}`,
      description: `Seguimiento programado con ${clientName}`,
      alertType: "minutes",
      alertValue: 30
    });
  };

  const handleCustomEvent = (eventData: any) => {
    // El QuickEventCreator ya manejará la creación del evento
    setShowCustomDialog(false);
  };

  const prePopulatedData = getPrePopulatedEventData(crmData);

  return (
    <div className="space-y-4">
      {/* Acciones Rápidas Mejoradas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => handleQuickReminder(1, "Seguimiento Urgente")}
          disabled={loading}
          className="flex items-center gap-1"
        >
          <Clock className="h-3 w-3" />
          1 día
        </Button>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => handleQuickReminder(3, "Seguimiento Prioritario")}
          disabled={loading}
          className="flex items-center gap-1"
        >
          <Calendar className="h-3 w-3" />
          3 días
        </Button>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => handleQuickReminder(7, "Seguimiento Semanal")}
          disabled={loading}
          className="flex items-center gap-1"
        >
          <Calendar className="h-3 w-3" />
          1 semana
        </Button>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => handleQuickReminder(30, "Seguimiento Mensual")}
          disabled={loading}
          className="flex items-center gap-1"
        >
          <Calendar className="h-3 w-3" />
          1 mes
        </Button>
      </div>

      {/* Botón para evento personalizado */}
      <div className="flex justify-center">
        <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <CalendarPlus className="h-4 w-4" />
              Crear Recordatorio Personalizado
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                Crear Recordatorio para {clientName}
              </DialogTitle>
            </DialogHeader>
            
            <QuickEventCreator
              open={showCustomDialog}
              onClose={() => setShowCustomDialog(false)}
              onSubmit={handleCustomEvent}
              initialDate={new Date()}
              prePopulatedData={prePopulatedData}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};