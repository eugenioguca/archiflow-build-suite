import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePersonalCalendar } from "@/hooks/usePersonalCalendar";
import { Bell, Calendar, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { es } from "date-fns/locale";

interface SmartReminderPluginProps {
  clientId: string;
  clientName: string;
  projectId?: string;
  projectName?: string;
  maxReminders?: number;
}

export const SmartReminderPlugin = ({
  clientId,
  clientName,
  projectId,
  projectName,
  maxReminders = 5
}: SmartReminderPluginProps) => {
  const { events, loading } = usePersonalCalendar();
  const [clientReminders, setClientReminders] = useState<any[]>([]);

  useEffect(() => {
    if (events && events.length > 0) {
      // Filtrar eventos que contienen el nombre del cliente en el título o descripción
      const filtered = events
        .filter(event => {
          const titleMatch = event.title?.toLowerCase().includes(clientName.toLowerCase());
          const descriptionMatch = event.description?.toLowerCase().includes(clientName.toLowerCase());
          const projectMatch = projectName ? 
            (event.title?.toLowerCase().includes(projectName.toLowerCase()) ||
             event.description?.toLowerCase().includes(projectName.toLowerCase())) : false;
          
          return titleMatch || descriptionMatch || projectMatch;
        })
        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
        .slice(0, maxReminders);

      setClientReminders(filtered);
    }
  }, [events, clientName, projectName, maxReminders]);

  const getPriorityLevel = (eventDate: string) => {
    const now = new Date();
    const event = new Date(eventDate);
    const diffHours = (event.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0) {
      return { 
        level: 'overdue', 
        color: 'bg-destructive/10 text-destructive border-destructive/20',
        icon: AlertTriangle,
        label: 'Vencido'
      };
    }
    if (diffHours < 24) {
      return { 
        level: 'urgent', 
        color: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800',
        icon: Clock,
        label: 'Urgente'
      };
    }
    if (diffHours < 72) {
      return { 
        level: 'high', 
        color: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800',
        icon: Bell,
        label: 'Próximo'
      };
    }
    return { 
      level: 'normal', 
      color: 'bg-primary/10 text-primary border-primary/20',
      icon: Calendar,
      label: 'Programado'
    };
  };

  const upcomingReminders = clientReminders.filter(r => 
    isAfter(new Date(r.start_date), new Date()) && 
    isBefore(new Date(r.start_date), addDays(new Date(), 7))
  );

  const overdueReminders = clientReminders.filter(r => 
    isBefore(new Date(r.start_date), new Date())
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-2/3"></div>
            <div className="space-y-2">
              {[1, 2].map(i => (
                <div key={i} className="h-8 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (clientReminders.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Recordatorios en Calendario
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center py-4">
            <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              No hay recordatorios programados para {clientName}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Recordatorios Activos ({clientReminders.length})
          </CardTitle>
          {(overdueReminders.length > 0 || upcomingReminders.length > 0) && (
            <div className="flex gap-1">
              {overdueReminders.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {overdueReminders.length} vencido{overdueReminders.length > 1 ? 's' : ''}
                </Badge>
              )}
              {upcomingReminders.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {upcomingReminders.length} próximo{upcomingReminders.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {clientReminders.map((reminder) => {
            const priority = getPriorityLevel(reminder.start_date);
            const IconComponent = priority.icon;
            
            return (
              <div
                key={reminder.id}
                className={`p-3 rounded-lg border ${priority.color} transition-all hover:shadow-sm`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <IconComponent className="h-3 w-3 flex-shrink-0" />
                      <span className="font-medium text-xs truncate">
                        {reminder.title}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {priority.label}
                      </Badge>
                    </div>
                    
                    <div className="text-xs opacity-75 mb-1">
                      {format(new Date(reminder.start_date), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </div>
                    
                    {reminder.description && (
                      <div className="text-xs opacity-60 line-clamp-2">
                        {reminder.description}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {clientReminders.length >= maxReminders && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Mostrando los {maxReminders} recordatorios más próximos
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};