import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { EventDetailsModal } from "@/components/calendar/EventDetailsModal";
import { QuickEventCreator } from "@/components/calendar/QuickEventCreator";
import { Button } from "@/components/ui/button";
import { Plus, Bug } from "lucide-react";
import { usePersonalCalendar } from "@/hooks/usePersonalCalendar";
import { CalendarDebugPanel } from "@/components/calendar/CalendarDebugPanel";
import { ensurePushSubscription, checkPushSubscriptionStatus } from "@/utils/pushNotifications";
import { useToast } from "@/hooks/use-toast";

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  
  const { events, loading, createEvent, updateEvent, deleteEvent } = usePersonalCalendar();
  const { toast } = useToast();

  // Setup push notifications on mount
  useEffect(() => {
    const setupPushNotifications = async () => {
      const status = await checkPushSubscriptionStatus();
      
      if (!status.isSupported) {
        console.log('Push notifications not supported');
        return;
      }

      if (!status.hasPermission || !status.isSubscribed) {
        // Will request permission when debug panel is opened or first interaction
        console.log('Push notifications need setup');
      }
    };

    setupPushNotifications();
  }, []);

  const handleDebugClick = async () => {
    setShowDebug(!showDebug);
    
    // Ensure push subscription when opening debug panel
    if (!showDebug) {
      const success = await ensurePushSubscription();
      if (success) {
        toast({
          title: "Push Notifications Enabled",
          description: "You will receive calendar reminders via push notifications",
        });
      } else {
        toast({
          title: "Push Notifications Setup",
          description: "Could not setup push notifications. Check console for details.",
          variant: "destructive",
        });
      }
    }
  };

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowCreateModal(true);
  };

  const handleCreateEvent = async (eventData: any) => {
    await createEvent(eventData);
    setShowCreateModal(false);
    setSelectedDate(null);
  };

  const handleUpdateEvent = async (eventData: any) => {
    await updateEvent(selectedEvent.id, eventData);
    setSelectedEvent(null);
  };

  const handleDeleteEvent = async () => {
    await deleteEvent(selectedEvent.id);
    setSelectedEvent(null);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Calendario</h1>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleDebugClick} 
              className="flex items-center gap-2"
            >
              <Bug className="h-4 w-4" />
              Debug
            </Button>
            <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Evento
            </Button>
          </div>
        </div>

        {showDebug && (
          <CalendarDebugPanel />
        )}

        <CalendarHeader
          currentDate={currentDate}
          view={view}
          onDateChange={setCurrentDate}
          onViewChange={setView}
        />

        <div className="border rounded-lg bg-card">
          <CalendarGrid
            currentDate={currentDate}
            view={view}
            events={events}
            loading={loading}
            onEventClick={handleEventClick}
            onDateClick={handleDateClick}
          />
        </div>

        <EventDetailsModal
          event={selectedEvent}
          open={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onUpdate={handleUpdateEvent}
          onDelete={handleDeleteEvent}
        />

        <QuickEventCreator
          open={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedDate(null);
          }}
          onSubmit={handleCreateEvent}
          initialDate={selectedDate}
        />
      </div>
    </Layout>
  );
}