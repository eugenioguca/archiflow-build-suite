import { CalendarEvent } from "@/hooks/usePersonalCalendar";
import { MonthView } from "./views/MonthView";
import { WeekView } from "./views/WeekView";
import { DayView } from "./views/DayView";
import { Skeleton } from "@/components/ui/skeleton";

interface CalendarGridProps {
  currentDate: Date;
  view: "month" | "week" | "day";
  events: CalendarEvent[];
  loading: boolean;
  onEventClick: (event: CalendarEvent) => void;
  onDateClick: (date: Date) => void;
}

export function CalendarGrid({ 
  currentDate, 
  view, 
  events, 
  loading, 
  onEventClick, 
  onDateClick 
}: CalendarGridProps) {
  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, j) => (
              <Skeleton key={j} className="h-24" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  const commonProps = {
    currentDate,
    events,
    onEventClick,
    onDateClick,
  };

  switch (view) {
    case "month":
      return <MonthView {...commonProps} />;
    case "week":
      return <WeekView {...commonProps} />;
    case "day":
      return <DayView {...commonProps} />;
    default:
      return <MonthView {...commonProps} />;
  }
}