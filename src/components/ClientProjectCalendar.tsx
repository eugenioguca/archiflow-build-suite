import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { EventDetailsModal } from "@/components/calendar/EventDetailsModal";
import { QuickEventCreator } from "@/components/calendar/QuickEventCreator";
import { ClientProjectCalendarEvent, useClientProjectCalendar } from "@/hooks/useClientProjectCalendar";
import { Plus } from "lucide-react";

interface ClientProjectCalendarProps {
  projectId: string | null;
  projectName?: string;
  canEdit?: boolean;
  userRole?: 'sales' | 'design' | 'client';
}

export const ClientProjectCalendar: React.FC<ClientProjectCalendarProps> = ({
  projectId,
  projectName,
  canEdit = false,
  userRole = 'client'
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [selectedEvent, setSelectedEvent] = useState<ClientProjectCalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { events, loading, createEvent, updateEvent, deleteEvent } = useClientProjectCalendar(projectId);

  const handleEventClick = (event: ClientProjectCalendarEvent) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleDateClick = (date: Date) => {
    if (canEdit) {
      setSelectedDate(date);
      setShowCreateModal(true);
    }
  };

  const handleCreateEvent = async (eventData: any) => {
    const success = await createEvent({
      ...eventData,
      event_type: getEventTypeByRole(userRole),
      created_by: '', // Will be set by the backend
    });
    
    if (success) {
      setShowCreateModal(false);
      setSelectedDate(null);
    }
  };

  const handleUpdateEvent = async (eventId: string, eventData: any) => {
    const success = await updateEvent(eventId, eventData);
    if (success) {
      setShowEventModal(false);
      setSelectedEvent(null);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    const success = await deleteEvent(eventId);
    if (success) {
      setShowEventModal(false);
      setSelectedEvent(null);
    }
  };

  const getEventTypeByRole = (role: string) => {
    switch (role) {
      case 'sales':
        return 'client_meeting';
      case 'design':
        return 'design_review';
      default:
        return 'meeting';
    }
  };

  const getPrePopulatedEventData = () => {
    const now = selectedDate || new Date();
    const oneHourLater = new Date(now);
    oneHourLater.setHours(oneHourLater.getHours() + 1);

    const baseTitle = userRole === 'sales' 
      ? `Reunión con cliente - ${projectName}`
      : `Revisión de diseño - ${projectName}`;

    return {
      title: baseTitle,
      description: userRole === 'sales' 
        ? 'Reunión comercial con el cliente'
        : 'Revisión de avances de diseño',
      start_date: now.toISOString().slice(0, 16),
      end_date: oneHourLater.toISOString().slice(0, 16),
      all_day: false,
      color: userRole === 'sales' ? '#3b82f6' : '#10b981',
      event_type: getEventTypeByRole(userRole)
    };
  };

  if (!projectId) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Selecciona un proyecto para ver su calendario</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            📅 Calendario - {projectName}
          </CardTitle>
          {canEdit && (
            <Button 
              onClick={() => {
                setSelectedDate(new Date());
                setShowCreateModal(true);
              }}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Evento
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <CalendarHeader
              currentDate={currentDate}
              view={view}
              onDateChange={setCurrentDate}
              onViewChange={setView}
            />
            
            <CalendarGrid
              currentDate={currentDate}
              view={view}
              events={events.map(event => ({
                id: event.id,
                title: event.title,
                description: event.description,
                start_date: event.start_date,
                end_date: event.end_date,
                all_day: event.all_day,
                location: event.location,
                color: event.color || '#3b82f6'
              }))}
              loading={loading}
              onEventClick={(event) => {
                const fullEvent = events.find(e => e.id === event.id);
                if (fullEvent) handleEventClick(fullEvent);
              }}
              onDateClick={handleDateClick}
            />
          </div>
        </CardContent>
      </Card>

      {selectedEvent && (
        <EventDetailsModal
          open={showEventModal}
          onClose={() => setShowEventModal(false)}
          event={{
            id: selectedEvent.id,
            title: selectedEvent.title,
            description: selectedEvent.description,
            start_date: selectedEvent.start_date,
            end_date: selectedEvent.end_date,
            all_day: selectedEvent.all_day,
            location: selectedEvent.location,
            color: selectedEvent.color || '#3b82f6'
          }}
          onUpdate={canEdit ? (eventData) => handleUpdateEvent(selectedEvent.id, eventData) : undefined}
          onDelete={canEdit ? () => handleDeleteEvent(selectedEvent.id) : undefined}
        />
      )}

      {canEdit && (
        <QuickEventCreator
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          prePopulatedData={getPrePopulatedEventData()}
          onSubmit={handleCreateEvent}
        />
      )}
    </div>
  );
};