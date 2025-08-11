import { CalendarEvent } from "@/hooks/usePersonalCalendar";
import { 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  isSameDay, 
  parseISO,
  startOfDay,
  endOfDay
} from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDateClick: (date: Date) => void;
}

export function WeekView({ currentDate, events, onEventClick, onDateClick }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventStart = parseISO(event.start_date);
      return isSameDay(eventStart, day);
    });
  };

  const getEventPosition = (event: CalendarEvent) => {
    const eventStart = parseISO(event.start_date);
    const eventEnd = parseISO(event.end_date);
    
    const startHour = eventStart.getHours() + eventStart.getMinutes() / 60;
    const endHour = eventEnd.getHours() + eventEnd.getMinutes() / 60;
    const duration = endHour - startHour;

    return {
      top: `${(startHour / 24) * 100}%`,
      height: `${(duration / 24) * 100}%`,
    };
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with days */}
      <div className="grid grid-cols-8 border-b">
        <div className="p-4 border-r text-sm font-medium">Hora</div>
        {days.map(day => {
          const isToday = isSameDay(day, new Date());
          return (
            <div 
              key={day.toISOString()} 
              className={cn(
                "p-4 border-r text-center cursor-pointer hover:bg-muted/50",
                isToday && "bg-primary/10"
              )}
              onClick={() => onDateClick(day)}
            >
              <div className={cn(
                "text-sm font-medium",
                isToday && "text-primary"
              )}>
                {format(day, "EEE", { locale: es })}
              </div>
              <div className={cn(
                "text-lg",
                isToday && "font-bold text-primary"
              )}>
                {format(day, "d")}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="flex-1 grid grid-cols-8 relative overflow-y-auto max-h-96">
        {/* Time labels */}
        <div className="border-r">
          {hours.map(hour => (
            <div key={hour} className="h-16 border-b p-2 text-xs text-muted-foreground">
              {format(new Date().setHours(hour, 0), "HH:mm")}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map(day => (
          <div key={day.toISOString()} className="border-r relative">
            {hours.map(hour => (
              <div 
                key={hour} 
                className="h-16 border-b hover:bg-muted/30 cursor-pointer"
                onClick={() => {
                  const clickedDate = new Date(day);
                  clickedDate.setHours(hour, 0, 0, 0);
                  onDateClick(clickedDate);
                }}
              />
            ))}
            
            {/* Events for this day */}
            {getEventsForDay(day).map(event => {
              const position = getEventPosition(event);
              return (
                <div
                  key={event.id}
                  className="absolute left-1 right-1 p-1 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity z-10"
                  style={{
                    ...position,
                    backgroundColor: event.color + "E6",
                    color: "white",
                    minHeight: "20px"
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(event);
                  }}
                >
                  <div className="font-medium truncate">{event.title}</div>
                  <div className="text-xs opacity-90">
                    {format(parseISO(event.start_date), "HH:mm")} - {format(parseISO(event.end_date), "HH:mm")}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}