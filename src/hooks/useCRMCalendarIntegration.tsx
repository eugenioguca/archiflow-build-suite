import { useState } from "react";
import { usePersonalCalendar } from "./usePersonalCalendar";
import { useToast } from "./use-toast";
import { addDays, addWeeks, addMonths } from "date-fns";

interface CRMEventData {
  clientId: string;
  clientName: string;
  projectId?: string;
  projectName?: string;
  clientAddress?: string;
  salesStage?: string;
}

interface QuickReminderOptions {
  days: number;
  title: string;
  description?: string;
  alertType?: "minutes" | "hours" | "days";
  alertValue?: number;
}

export const useCRMCalendarIntegration = () => {
  const { createEvent, events, loading, refreshEvents } = usePersonalCalendar();
  const { toast } = useToast();
  const [creatingEvent, setCreatingEvent] = useState(false);

  const createCRMEvent = async (
    crmData: CRMEventData,
    eventData: {
      title: string;
      description?: string;
      start_date: string;
      end_date: string;
      all_day?: boolean;
      location?: string;
      color?: string;
      alerts?: Array<{
        alert_type: "minutes" | "hours" | "days";
        alert_value: number;
        sound_enabled: boolean;
        sound_type: "professional" | "soft" | "loud" | "uh-oh" | "airport";
      }>;
    }
  ) => {
    setCreatingEvent(true);
    try {
      // Enriquecer el evento con información del CRM
      const enrichedEventData = {
        ...eventData,
        title: eventData.title || `Seguimiento - ${crmData.clientName}`,
        description: eventData.description || 
          `Cliente: ${crmData.clientName}\n` +
          (crmData.projectName ? `Proyecto: ${crmData.projectName}\n` : '') +
          (crmData.salesStage ? `Etapa: ${crmData.salesStage}\n` : '') +
          'Creado desde CRM de Ventas',
        location: eventData.location || crmData.clientAddress || '',
        color: eventData.color || '#3b82f6', // Azul para eventos de ventas
        alerts: eventData.alerts || [
          {
            alert_type: "minutes" as const,
            alert_value: 30,
            sound_enabled: true,
            sound_type: "professional" as const
          },
          {
            alert_type: "days" as const,
            alert_value: 1,
            sound_enabled: true,
            sound_type: "soft" as const
          }
        ]
      };

      await createEvent(enrichedEventData);
      
      toast({
        title: "Recordatorio creado en calendario",
        description: `Se ha programado: ${enrichedEventData.title}`,
      });

      return true;
    } catch (error: any) {
      console.error("Error creating CRM calendar event:", error);
      toast({
        title: "Error al crear recordatorio",
        description: error.message,
        variant: "destructive"
      });
      return false;
    } finally {
      setCreatingEvent(false);
    }
  };

  const createQuickCRMReminder = async (
    crmData: CRMEventData,
    options: QuickReminderOptions
  ) => {
    const reminderDate = addDays(new Date(), options.days);
    const endDate = new Date(reminderDate);
    endDate.setHours(reminderDate.getHours() + 1); // 1 hora de duración por defecto

    const eventData = {
      title: options.title,
      description: options.description || 
        `Seguimiento programado con ${crmData.clientName}\n` +
        (crmData.projectName ? `Proyecto: ${crmData.projectName}\n` : '') +
        'Recordatorio creado desde acciones rápidas del CRM',
      start_date: reminderDate.toISOString(),
      end_date: endDate.toISOString(),
      all_day: false,
      alerts: options.alertType && options.alertValue ? [
        {
          alert_type: options.alertType,
          alert_value: options.alertValue,
          sound_enabled: true,
          sound_type: "professional" as const
        }
      ] : undefined
    };

    return await createCRMEvent(crmData, eventData);
  };

  const getPrePopulatedEventData = (crmData: CRMEventData) => {
    const now = new Date();
    const oneHourLater = new Date(now);
    oneHourLater.setHours(oneHourLater.getHours() + 1);

    return {
      title: `Seguimiento - ${crmData.clientName}`,
      description: 
        `Cliente: ${crmData.clientName}\n` +
        (crmData.projectName ? `Proyecto: ${crmData.projectName}\n` : '') +
        (crmData.salesStage ? `Etapa de ventas: ${crmData.salesStage}\n` : '') +
        '\nDetalles del seguimiento:\n' +
        '- Revisar estado del proyecto\n' +
        '- Actualizar información del cliente\n' +
        '- Planificar próximos pasos',
      start_date: now.toISOString().slice(0, 16),
      end_date: oneHourLater.toISOString().slice(0, 16),
      location: crmData.clientAddress || '',
      color: '#3b82f6', // Azul para ventas
      all_day: false,
      alerts: [
        {
          alert_type: "minutes" as const,
          alert_value: 30,
          sound_enabled: true,
          sound_type: "professional" as const
        },
        {
          alert_type: "days" as const,
          alert_value: 1,
          sound_enabled: true,
          sound_type: "soft" as const
        }
      ]
    };
  };

  return {
    createCRMEvent,
    createQuickCRMReminder,
    getPrePopulatedEventData,
    events,
    loading: loading || creatingEvent,
    refreshEvents
  };
};