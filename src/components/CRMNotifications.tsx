import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Bell, X, Clock, AlertTriangle, CheckCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface Reminder {
  id: string;
  title: string;
  message: string;
  reminder_date: string;
  popup_shown: boolean;
  client: {
    full_name: string;
    project_type: string;
  };
}

interface NotificationPopupProps {
  reminder: Reminder;
  onClose: () => void;
  onSnooze: (minutes: number) => void;
  onComplete: () => void;
}

export function NotificationPopup({ reminder, onClose, onSnooze, onComplete }: NotificationPopupProps) {
  const timeAgo = formatDistanceToNow(new Date(reminder.reminder_date), { 
    addSuffix: true, 
    locale: es 
  });

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-full">
      <Card className="w-96 shadow-lg border-l-4 border-l-orange-500 bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-sm font-medium">Recordatorio CRM</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div>
              <p className="font-medium text-gray-900">{reminder.client.full_name}</p>
              <Badge variant="outline" className="text-xs">
                {reminder.client.project_type}
              </Badge>
            </div>
            
            <p className="text-sm text-gray-700">{reminder.message}</p>
            
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              <span>{timeAgo}</span>
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => onSnooze(15)}>
                15 min
              </Button>
              <Button size="sm" variant="outline" onClick={() => onSnooze(60)}>
                1 hora
              </Button>
              <Button size="sm" onClick={onComplete} className="flex-1">
                <CheckCircle className="h-3 w-3 mr-1" />
                Completar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function CRMNotifications() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [activeReminder, setActiveReminder] = useState<Reminder | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPendingReminders();
    const interval = setInterval(fetchPendingReminders, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchPendingReminders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('crm_reminders')
        .select(`
          id,
          title,
          message,
          reminder_date,
          popup_shown,
          client:clients(full_name, project_type, assigned_advisor_id)
        `)
        .eq('popup_shown', false)
        .lte('reminder_date', new Date().toISOString())
        .eq('user_id', user.id)
        .order('reminder_date', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setReminders(data);
        if (!activeReminder) {
          setActiveReminder(data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching reminders:', error);
    }
  };

  const markAsShown = async (reminderId: string) => {
    try {
      const { error } = await supabase
        .from('crm_reminders')
        .update({ popup_shown: true })
        .eq('id', reminderId);

      if (error) throw error;
      
      setReminders(prev => prev.filter(r => r.id !== reminderId));
      setActiveReminder(null);
      
      // Show next reminder if any
      const nextReminder = reminders.find(r => r.id !== reminderId);
      if (nextReminder) {
        setTimeout(() => setActiveReminder(nextReminder), 1000);
      }
    } catch (error) {
      console.error('Error marking reminder as shown:', error);
    }
  };

  const snoozeReminder = async (reminderId: string, minutes: number) => {
    try {
      const newReminderDate = new Date();
      newReminderDate.setMinutes(newReminderDate.getMinutes() + minutes);

      const { error } = await supabase
        .from('crm_reminders')
        .update({ 
          reminder_date: newReminderDate.toISOString(),
          popup_shown: false 
        })
        .eq('id', reminderId);

      if (error) throw error;

      markAsShown(reminderId);
      
      toast({
        title: "Recordatorio pospuesto",
        description: `Se mostrará en ${minutes} minutos`,
      });
    } catch (error) {
      console.error('Error snoozing reminder:', error);
      toast({
        title: "Error",
        description: "No se pudo posponer el recordatorio",
        variant: "destructive",
      });
    }
  };

  const completeReminder = async (reminderId: string) => {
    try {
      const { error } = await supabase
        .from('crm_reminders')
        .update({ popup_shown: true, is_sent: true })
        .eq('id', reminderId);

      if (error) throw error;

      markAsShown(reminderId);
      
      toast({
        title: "Recordatorio completado",
        description: "El recordatorio ha sido marcado como completado",
      });
    } catch (error) {
      console.error('Error completing reminder:', error);
    }
  };

  if (!activeReminder) return null;

  return (
    <NotificationPopup
      reminder={activeReminder}
      onClose={() => markAsShown(activeReminder.id)}
      onSnooze={(minutes) => snoozeReminder(activeReminder.id, minutes)}
      onComplete={() => completeReminder(activeReminder.id)}
    />
  );
}