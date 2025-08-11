import { CalendarEvent } from "@/hooks/usePersonalCalendar";
import { format, isSameDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDateClick: (date: Date) => void;
}

export function DayView({ currentDate, events, onEventClick, onDateClick }: DayViewProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  const dayEvents = events.filter(event => {
    const eventStart = parseISO(event.start_date);
    return isSameDay(eventStart, currentDate);
  });

  const getEventPosition = (event: CalendarEvent) => {
    const eventStart = parseISO(event.start_date);
    const eventEnd = parseISO(event.end_date);
    
    const startHour = eventStart.getHours() + eventStart.getMinutes() / 60;
    const endHour = eventEnd.getHours() + eventEnd.getMinutes() / 60;
    const duration = endHour - startHour;

    return {
      top: `${(startHour / 24) * 100}%`,
      height: `${Math.max(duration / 24 * 100, 2)}%`,
    };
  };

  const isToday = isSameDay(currentDate, new Date());

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4 bg-card">
        <h3 className={cn(
          "text-lg font-semibold",
          isToday && "text-primary"
        )}>
          {format(currentDate, "EEEE, d MMMM yyyy", { locale: es })}
        </h3>
        <p className="text-sm text-muted-foreground">
          {dayEvents.length} evento{dayEvents.length !== 1 ? 's' : ''} programado{dayEvents.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Time grid */}
      <div className="flex-1 relative overflow-y-auto max-h-96">
        <div className="flex">
          {/* Time labels */}
          <div className="w-20 border-r bg-muted/10">
            {hours.map(hour => (
              <div key={hour} className="h-16 border-b p-2 text-xs text-muted-foreground">
                {format(new Date().setHours(hour, 0), "HH:mm")}
              </div>
            ))}
          </div>

          {/* Day column */}
          <div className="flex-1 relative">
            {hours.map(hour => (
              <div 
                key={hour} 
                className="h-16 border-b hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => {
                  const clickedDate = new Date(currentDate);
                  clickedDate.setHours(hour, 0, 0, 0);
                  onDateClick(clickedDate);
                }}
              />
            ))}
            
            {/* Events */}
            {dayEvents.map(event => {
              const position = getEventPosition(event);
              return (
                <div
                  key={event.id}
                  className="absolute left-2 right-2 p-2 rounded cursor-pointer hover:opacity-80 transition-opacity z-10 shadow-sm"
                  style={{
                    ...position,
                    backgroundColor: event.color + "E6",
                    color: "white",
                    minHeight: "32px"
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(event);
                  }}
                >
                  <div className="font-medium">{event.title}</div>
                  <div className="text-sm opacity-90">
                    {format(parseISO(event.start_date), "HH:mm")} - {format(parseISO(event.end_date), "HH:mm")}
                  </div>
                  {event.location && (
                    <div className="text-xs opacity-80">{event.location}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}