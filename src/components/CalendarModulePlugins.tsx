import { useState } from "react";
import { Calendar, Users, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePersonalCalendar } from "@/hooks/usePersonalCalendar";

interface CalendarModulePluginsProps {
  context?: {
    clientId?: string;
    projectId?: string;
    module?: string;
  };
}

export const CalendarModulePlugins = ({ context }: CalendarModulePluginsProps) => {
  const { createEvent } = usePersonalCalendar();

  const handleQuickMeeting = () => {
    const defaultDate = new Date();
    defaultDate.setHours(defaultDate.getHours() + 1); // 1 hour from now
    
    const eventData = {
      user_id: '', // Will be set by the hook
      title: context?.module ? `Reunión - ${context.module}` : "Reunión rápida",
      description: context?.projectId ? "Reunión relacionada al proyecto" : "Reunión de trabajo",
      start_date: defaultDate.toISOString(),
      end_date: new Date(defaultDate.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour duration
      is_all_day: false,
      event_type: 'meeting' as const,
    };

    createEvent(eventData);
  };

  const handleQuickReminder = () => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 1); // Tomorrow
    
    const eventData = {
      user_id: '', // Will be set by the hook
      title: context?.module ? `Recordatorio - ${context.module}` : "Recordatorio",
      description: context?.projectId ? "Recordatorio relacionado al proyecto" : "Recordatorio de trabajo",
      start_date: defaultDate.toISOString(),
      end_date: defaultDate.toISOString(),
      is_all_day: true,
      event_type: 'reminder' as const,
    };

    createEvent(eventData);
  };

  const getContextIcon = () => {
    if (context?.module === 'clients') return <Users className="h-4 w-4" />;
    if (context?.module === 'projects') return <Building2 className="h-4 w-4" />;
    return <Calendar className="h-4 w-4" />;
  };

  const getContextTitle = () => {
    if (context?.module === 'clients') return "Acciones de Cliente";
    if (context?.module === 'projects') return "Acciones de Proyecto";
    return "Acciones Rápidas";
  };

  return (
    <>
      <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            {getContextIcon()}
            <h3 className="text-sm font-medium text-primary">
              {getContextTitle()}
            </h3>
          </div>
          
          <div className="grid grid-cols-2 gap-2">            
            <Button
              variant="outline"
              size="sm"
              onClick={handleQuickMeeting}
              className="w-full justify-start text-xs"
            >
              <Users className="h-3 w-3 mr-1" />
              Reunión
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleQuickReminder}
              className="w-full justify-start text-xs"
            >
              <Calendar className="h-3 w-3 mr-1" />
              Recordatorio
            </Button>
          </div>
        </CardContent>
      </Card>

    </>
  );
};