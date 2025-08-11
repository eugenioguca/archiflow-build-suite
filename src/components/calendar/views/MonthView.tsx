import { CalendarEvent } from "@/hooks/usePersonalCalendar";
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  isSameMonth, 
  isSameDay, 
  parseISO 
} from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDateClick: (date: Date) => void;
}

export function MonthView({ currentDate, events, onEventClick, onDateClick }: MonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventStart = parseISO(event.start_date);
      return isSameDay(eventStart, day);
    });
  };

  return (
    <div className="p-4">
      {/* Week headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map(day => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-24 p-2 border border-border cursor-pointer hover:bg-muted/50 transition-colors",
                !isCurrentMonth && "bg-muted/20 text-muted-foreground",
                isToday && "bg-primary/10 border-primary"
              )}
              onClick={() => onDateClick(day)}
            >
              <div className={cn(
                "text-sm mb-1",
                isToday && "font-bold text-primary"
              )}>
                {format(day, "d")}
              </div>
              
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: event.color + "20", color: event.color }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{dayEvents.length - 3} más
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}