import { CalendarWidget } from "@/components/calendar/CalendarWidget";
import { AlertNotification } from "@/components/calendar/AlertNotification";

export function CalendarWidgetDashboard() {
  return (
    <div className="space-y-4">
      <CalendarWidget />
      <AlertNotification />
    </div>
  );
}