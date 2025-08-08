import React from 'react';
import { format } from 'date-fns';
import { Clock, MapPin } from 'lucide-react';
import { PersonalEvent } from '@/hooks/usePersonalCalendar';
import { cn } from '@/lib/utils';

interface EventCardProps {
  event: PersonalEvent;
  onClick: (event: PersonalEvent) => void;
  variant?: 'full' | 'compact' | 'minimal';
  className?: string;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onClick,
  variant = 'full',
  className
}) => {
  const getEventColor = (type: string) => {
    switch (type) {
      case 'event': return 'border-l-primary bg-primary/5';
      case 'meeting': return 'border-l-secondary bg-secondary/5';
      case 'reminder': return 'border-l-accent bg-accent/5';
      default: return 'border-l-muted bg-muted/5';
    }
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm');
  };

  const handleClick = () => {
    onClick(event);
  };

  if (variant === 'minimal') {
    return (
      <div
        onClick={handleClick}
        className={cn(
          "text-xs p-1 rounded cursor-pointer truncate hover:bg-opacity-80 transition-colors",
          getEventColor(event.event_type),
          className
        )}
        title={event.title}
      >
        {event.title}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        onClick={handleClick}
        className={cn(
          "p-2 rounded-lg border-l-2 cursor-pointer hover:bg-muted/5 transition-all duration-200 border-muted/20",
          getEventColor(event.event_type),
          className
        )}
      >
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm truncate flex-1">{event.title}</p>
          {!event.is_all_day && (
            <span className="text-xs text-muted-foreground ml-2">
              {formatTime(event.start_date)}
            </span>
          )}
        </div>
        
        {event.location && (
          <div className="flex items-center mt-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 mr-1" />
            <span className="truncate">{event.location}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        "p-3 rounded-lg border-l-4 cursor-pointer hover:bg-muted/5 transition-all duration-200 border-muted/20",
        getEventColor(event.event_type),
        className
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-foreground leading-tight flex-1">
          {event.title}
        </h3>
        {!event.is_all_day && (
          <div className="flex items-center text-xs text-muted-foreground ml-2">
            <Clock className="h-3 w-3 mr-1" />
            {formatTime(event.start_date)} - {formatTime(event.end_date)}
          </div>
        )}
      </div>

      {event.location && (
        <div className="flex items-center text-sm text-muted-foreground mb-2">
          <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
          <span className="truncate">{event.location}</span>
        </div>
      )}

      {event.description && (
        <p className="text-sm text-muted-foreground line-clamp-2">
          {event.description}
        </p>
      )}

      {event.invitations && event.invitations.length > 0 && (
        <div className="flex items-center mt-2 text-xs text-muted-foreground">
          <span>{event.invitations.length} invitado{event.invitations.length !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
};