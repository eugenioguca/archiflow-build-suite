import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Calendar, Clock, Send, Plus, Brain, TrendingUp } from "lucide-react";
import { format, addDays, addWeeks, addMonths } from "date-fns";
import { es } from "date-fns/locale";

interface CRMReminder {
  id: string;
  client_id: string;
  title: string;
  message: string;
  reminder_date: string;
  is_sent: boolean;
  popup_shown: boolean;
  email_sent: boolean;
  activity_id?: string;
}

interface AIInsight {
  type: "follow_up" | "opportunity" | "risk" | "milestone";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  suggested_actions: string[];
}

interface SmartCRMProps {
  clientId: string;
  clientName: string;
  lastContactDate?: string;
  leadScore?: number;
  status: string;
}

export function SmartCRM({ clientId, clientName, lastContactDate, leadScore = 0, status }: SmartCRMProps) {
  const { toast } = useToast();
  const [reminders, setReminders] = useState<CRMReminder[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [reminderForm, setReminderForm] = useState({
    title: "",
    message: "",
    reminder_date: new Date().toISOString().slice(0, 16),
    email_notification: true
  });

  useEffect(() => {
    fetchReminders();
    generateAIInsights();
  }, [clientId]);

  const fetchReminders = async () => {
    try {
      const { data, error } = await supabase
        .from("crm_reminders")
        .select("*")
        .eq("client_id", clientId)
        .eq("is_sent", false)
        .order("reminder_date");

      if (error) throw error;
      setReminders(data || []);
    } catch (error: any) {
      console.error("Error fetching reminders:", error);
    }
  };

  const generateAIInsights = () => {
    const generatedInsights: AIInsight[] = [];

    // Follow-up insights based on last contact
    if (lastContactDate) {
      const daysSinceContact = Math.floor(
        (new Date().getTime() - new Date(lastContactDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceContact > 7) {
        generatedInsights.push({
          type: "follow_up",
          title: "Seguimiento Requerido",
          description: `Han pasado ${daysSinceContact} días desde el último contacto con ${clientName}`,
          priority: daysSinceContact > 14 ? "high" : "medium",
          suggested_actions: [
            "Llamar para conocer el estado actual del proyecto",
            "Enviar actualización de servicios disponibles",
            "Programar reunión de seguimiento"
          ]
        });
      }
    }

    // Lead score insights
    if (leadScore < 30) {
      generatedInsights.push({
        type: "risk",
        title: "Cliente en Riesgo",
        description: `El puntaje del lead es bajo (${leadScore}/100). Riesgo de pérdida del cliente.`,
        priority: "high",
        suggested_actions: [
          "Revisar necesidades específicas del cliente",
          "Ofrecer propuesta personalizada",
          "Asignar asesor especializado"
        ]
      });
    } else if (leadScore > 70) {
      generatedInsights.push({
        type: "opportunity",
        title: "Oportunidad de Cierre",
        description: `El cliente tiene un puntaje alto (${leadScore}/100). Excelente oportunidad de cierre.`,
        priority: "high",
        suggested_actions: [
          "Programar presentación de propuesta final",
          "Preparar contrato de servicios",
          "Ofrecer descuentos por pronto pago"
        ]
      });
    }

    // Status-based insights
    if (status === "potential") {
      generatedInsights.push({
        type: "milestone",
        title: "Cliente Potencial",
        description: "Cliente en fase inicial. Momento clave para establecer confianza.",
        priority: "medium",
        suggested_actions: [
          "Enviar portfolio de proyectos similares",
          "Programar visita a obra en curso",
          "Proporcionar referencias de clientes satisfechos"
        ]
      });
    }

    setInsights(generatedInsights);
  };

  const createReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Perfil no encontrado");

      const { error } = await supabase
        .from("crm_reminders")
        .insert([{
          client_id: clientId,
          user_id: profile.id,
          title: reminderForm.title,
          message: reminderForm.message,
          reminder_date: reminderForm.reminder_date,
          email_sent: false,
          popup_shown: false,
          is_sent: false
        }]);

      if (error) throw error;

      toast({
        title: "Recordatorio creado",
        description: "El recordatorio ha sido programado exitosamente"
      });

      setDialogOpen(false);
      setReminderForm({
        title: "",
        message: "",
        reminder_date: new Date().toISOString().slice(0, 16),
        email_notification: true
      });
      
      fetchReminders();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createQuickReminder = (days: number, title: string) => {
    const reminderDate = addDays(new Date(), days);
    setReminderForm({
      title,
      message: `Recordatorio programado para seguimiento con ${clientName}`,
      reminder_date: reminderDate.toISOString().slice(0, 16),
      email_notification: true
    });
    setDialogOpen(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "follow_up": return <Clock className="h-4 w-4" />;
      case "opportunity": return <TrendingUp className="h-4 w-4" />;
      case "risk": return <Bell className="h-4 w-4" />;
      case "milestone": return <Calendar className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Sugerencias Inteligentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insights.length > 0 ? (
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getInsightIcon(insight.type)}
                      <h4 className="font-medium">{insight.title}</h4>
                    </div>
                    <Badge className={getPriorityColor(insight.priority)}>
                      {insight.priority === "high" ? "Alta" : 
                       insight.priority === "medium" ? "Media" : "Baja"}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {insight.description}
                  </p>
                  
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium">Acciones Sugeridas:</h5>
                    <ul className="text-sm space-y-1">
                      {insight.suggested_actions.map((action, actionIndex) => (
                        <li key={actionIndex} className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Brain className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hay sugerencias disponibles en este momento</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => createQuickReminder(1, "Seguimiento 24h")}
            >
              Recordar en 1 día
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => createQuickReminder(3, "Seguimiento 3 días")}
            >
              Recordar en 3 días
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => createQuickReminder(7, "Seguimiento semanal")}
            >
              Recordar en 1 semana
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => createQuickReminder(30, "Seguimiento mensual")}
            >
              Recordar en 1 mes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reminders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Recordatorios Activos
            </CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Recordatorio
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Recordatorio</DialogTitle>
                </DialogHeader>
                
                <form onSubmit={createReminder} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título *</Label>
                    <Input
                      id="title"
                      value={reminderForm.title}
                      onChange={(e) => setReminderForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="ej. Llamar para seguimiento"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Mensaje</Label>
                    <Textarea
                      id="message"
                      value={reminderForm.message}
                      onChange={(e) => setReminderForm(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Detalles del recordatorio..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reminder_date">Fecha y Hora *</Label>
                    <Input
                      id="reminder_date"
                      type="datetime-local"
                      value={reminderForm.reminder_date}
                      onChange={(e) => setReminderForm(prev => ({ ...prev, reminder_date: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={reminderForm.email_notification}
                      onCheckedChange={(checked) => setReminderForm(prev => ({ ...prev, email_notification: checked }))}
                    />
                    <Label>Enviar notificación por email</Label>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Creando..." : "Crear Recordatorio"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {reminders.length > 0 ? (
            <div className="space-y-3">
              {reminders.map((reminder) => (
                <div key={reminder.id} className="border rounded-lg p-3 flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{reminder.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(reminder.reminder_date), "dd 'de' MMMM 'a las' HH:mm", { locale: es })}
                    </p>
                    {reminder.message && (
                      <p className="text-sm mt-1">{reminder.message}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hay recordatorios activos</p>
              <Button size="sm" className="mt-2" onClick={() => setDialogOpen(true)}>
                Crear Primer Recordatorio
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}