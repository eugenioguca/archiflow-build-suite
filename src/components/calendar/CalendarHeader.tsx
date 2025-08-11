import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from "date-fns";
import { es } from "date-fns/locale";

interface CalendarHeaderProps {
  currentDate: Date;
  view: "month" | "week" | "day";
  onDateChange: (date: Date) => void;
  onViewChange: (view: "month" | "week" | "day") => void;
}

export function CalendarHeader({ currentDate, view, onDateChange, onViewChange }: CalendarHeaderProps) {
  const handlePrevious = () => {
    if (view === "month") {
      onDateChange(subMonths(currentDate, 1));
    } else if (view === "week") {
      onDateChange(subWeeks(currentDate, 1));
    } else {
      onDateChange(subDays(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (view === "month") {
      onDateChange(addMonths(currentDate, 1));
    } else if (view === "week") {
      onDateChange(addWeeks(currentDate, 1));
    } else {
      onDateChange(addDays(currentDate, 1));
    }
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const getDisplayText = () => {
    if (view === "month") {
      return format(currentDate, "MMMM yyyy", { locale: es });
    } else if (view === "week") {
      return `Semana del ${format(currentDate, "d MMM", { locale: es })}`;
    } else {
      return format(currentDate, "EEEE, d MMMM yyyy", { locale: es });
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border-b bg-card">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={handleToday}>
          <CalendarIcon className="h-4 w-4 mr-2" />
          Hoy
        </Button>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <h2 className="text-lg font-semibold text-foreground capitalize">
          {getDisplayText()}
        </h2>
      </div>

      <Select value={view} onValueChange={(value: "month" | "week" | "day") => onViewChange(value)}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="month">Mes</SelectItem>
          <SelectItem value="week">Semana</SelectItem>
          <SelectItem value="day">Día</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}