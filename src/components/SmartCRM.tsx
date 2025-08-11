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

import { PaymentPlanManager } from "./PaymentPlanManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuickCalendarActions } from "./QuickCalendarActions";
import { SmartReminderPlugin } from "./SmartReminderPlugin";

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
  clientProject?: {
    id: string;
    project_name: string;
  };
}

export function SmartCRM({ clientId, clientName, lastContactDate, leadScore = 0, status, clientProject }: SmartCRMProps) {
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

  const generateAIInsights = async () => {
    const generatedInsights: AIInsight[] = [];

    try {
      // Get project data for this client
      const { data: projectData } = await supabase
        .from("client_projects")
        .select("created_at, last_contact_date, last_activity_date, sales_pipeline_stage")
        .eq("client_id", clientId)
        .single();

      // Get CRM activities for this client
      const { data: activitiesData } = await supabase
        .from("crm_activities")
        .select("created_at, is_completed, activity_type, scheduled_date")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(10);

      const now = new Date();
      const projectCreated = projectData?.created_at ? new Date(projectData.created_at) : null;
      const lastContact = projectData?.last_contact_date ? new Date(projectData.last_contact_date) : null;
      const lastActivity = projectData?.last_activity_date ? new Date(projectData.last_activity_date) : null;
      
      // Calculate time metrics
      const hoursSinceCreation = projectCreated ? Math.floor((now.getTime() - projectCreated.getTime()) / (1000 * 60 * 60)) : 0;
      const daysSinceCreation = Math.floor(hoursSinceCreation / 24);
      const daysSinceLastContact = lastContact ? Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24)) : 999;
      const daysSinceLastActivity = lastActivity ? Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)) : 999;

      // Check for activities and completion rates
      const totalActivities = activitiesData?.length || 0;
      const completedActivities = activitiesData?.filter(a => a.is_completed).length || 0;
      const pendingActivities = activitiesData?.filter(a => !a.is_completed && a.scheduled_date && new Date(a.scheduled_date) < now).length || 0;

      // 1. LEAD ABANDONMENT INSIGHTS
      if (hoursSinceCreation > 24 && !lastContact) {
        generatedInsights.push({
          type: "risk",
          title: "Lead Sin Contacto Inicial",
          description: `Han pasado ${hoursSinceCreation} horas desde que se generó el lead y no se ha realizado contacto inicial.`,
          priority: hoursSinceCreation > 48 ? "high" : "medium",
          suggested_actions: [
            "Realizar llamada de bienvenida inmediatamente",
            "Enviar email de presentación con portfolio",
            "Programar primera cita de consulta",
            "Asignar asesor específico para seguimiento"
          ]
        });
      }

      if (daysSinceLastContact > 3 && projectData?.sales_pipeline_stage !== "cliente_cerrado") {
        const priority = daysSinceLastContact > 7 ? "high" : daysSinceLastContact > 5 ? "medium" : "low";
        const severity = daysSinceLastContact > 14 ? "ABANDONADO" : 
                        daysSinceLastContact > 7 ? "FRÍO" : "TIBIO";
        
        generatedInsights.push({
          type: "follow_up",
          title: `Lead ${severity}`,
          description: `${daysSinceLastContact} días sin contacto. Riesgo de pérdida de oportunidad comercial.`,
          priority,
          suggested_actions: [
            daysSinceLastContact > 14 ? "Campaña de reactivación urgente" : "Llamada de seguimiento prioritaria",
            "Revisar historial de interacciones previas",
            "Enviar propuesta actualizada con ofertas especiales",
            "Programar reunión presencial si es posible"
          ]
        });
      }

      // 2. ACTIVITY-BASED INSIGHTS
      if (totalActivities === 0 && daysSinceCreation > 1) {
        generatedInsights.push({
          type: "risk",
          title: "Sin Actividades CRM Registradas",
          description: "No se han registrado actividades de seguimiento para este cliente.",
          priority: "high",
          suggested_actions: [
            "Crear plan de seguimiento estructurado",
            "Registrar primera actividad de contacto",
            "Establecer calendario de seguimientos",
            "Definir objetivos específicos del cliente"
          ]
        });
      }

      if (pendingActivities > 0) {
        generatedInsights.push({
          type: "follow_up",
          title: "Actividades Vencidas",
          description: `${pendingActivities} actividades programadas están vencidas y requieren atención.`,
          priority: "high",
          suggested_actions: [
            "Completar actividades pendientes inmediatamente",
            "Reprogramar actividades vencidas",
            "Contactar al cliente para explicar el retraso",
            "Actualizar cronograma de seguimiento"
          ]
        });
      }

      if (totalActivities > 0 && completedActivities / totalActivities < 0.5) {
        generatedInsights.push({
          type: "risk",
          title: "Baja Tasa de Completación",
          description: `Solo ${Math.round((completedActivities / totalActivities) * 100)}% de las actividades han sido completadas.`,
          priority: "medium",
          suggested_actions: [
            "Revisar carga de trabajo del asesor",
            "Simplificar procesos de seguimiento",
            "Establecer recordatorios automáticos",
            "Capacitación en gestión de tiempo"
          ]
        });
      }

      // 3. PIPELINE STAGNATION INSIGHTS
      const stageMap = {
        "nuevo_lead": { maxDays: 2, nextStage: "en_contacto" },
        "en_contacto": { maxDays: 7, nextStage: "cliente_cerrado" }
      };

      const currentStage = projectData?.sales_pipeline_stage;
      const stageInfo = currentStage ? stageMap[currentStage as keyof typeof stageMap] : null;
      
      if (stageInfo && daysSinceCreation > stageInfo.maxDays) {
        generatedInsights.push({
          type: "milestone",
          title: "Estancamiento en Pipeline",
          description: `El cliente lleva ${daysSinceCreation} días en la etapa "${currentStage}". Tiempo recomendado: ${stageInfo.maxDays} días.`,
          priority: daysSinceCreation > stageInfo.maxDays * 2 ? "high" : "medium",
          suggested_actions: [
            `Evaluar requisitos para avanzar a "${stageInfo.nextStage}"`,
            "Identificar obstáculos específicos",
            "Programar reunión de definición de siguiente paso",
            "Revisar propuesta de valor actual"
          ]
        });
      }

      // 4. OPPORTUNITY INSIGHTS
      if (currentStage === "en_contacto" && daysSinceLastContact <= 2 && totalActivities > 2) {
        generatedInsights.push({
          type: "opportunity",
          title: "Cliente Comprometido",
          description: "Cliente en contacto activo con múltiples interacciones. Buen momento para avanzar.",
          priority: "high",
          suggested_actions: [
            "Preparar propuesta detallada",
            "Programar reunión para presentar servicios",
            "Enviar portfolio de proyectos similares",
            "Solicitar reunión presencial o virtual"
          ]
        });
      }

      if (totalActivities > 3 && completedActivities / totalActivities > 0.8) {
        generatedInsights.push({
          type: "opportunity",
          title: "Cliente Bien Atendido",
          description: "Excelente seguimiento registrado. Cliente con alta probabilidad de conversión.",
          priority: "medium",
          suggested_actions: [
            "Mantener el nivel de atención actual",
            "Presentar propuesta premium",
            "Solicitar referencias a otros potenciales clientes",
            "Documenta las mejores prácticas aplicadas"
          ]
        });
      }

      // 5. TIME-CRITICAL INSIGHTS
      if (daysSinceCreation === 0) {
        generatedInsights.push({
          type: "milestone",
          title: "Lead Nuevo - Acción Inmediata",
          description: "Lead creado hoy. Primera impresión es crucial para el éxito.",
          priority: "high",
          suggested_actions: [
            "Contactar en las próximas 2 horas",
            "Enviar mensaje de bienvenida personalizado",
            "Hacer seguimiento inicial dentro de 24-48h",
            "Registrar fuente del lead y expectativas"
          ]
        });
      }

    } catch (error) {
      console.error("Error generating insights:", error);
      // Fallback insight if there's an error
      generatedInsights.push({
        type: "follow_up",
        title: "Revisar Cliente",
        description: "Se recomienda revisar el estado actual de este cliente y planificar próximos pasos.",
        priority: "medium",
        suggested_actions: [
          "Revisar historial de interacciones",
          "Contactar al cliente para actualizar información",
          "Planificar estrategia de seguimiento"
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

      {/* Quick Calendar Actions - Integración con Calendario */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Acciones Rápidas de Calendario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <QuickCalendarActions
            clientId={clientId}
            clientName={clientName}
            projectId={clientProject?.id}
            projectName={clientProject?.project_name}
            salesStage={status}
          />
        </CardContent>
      </Card>

      {/* Smart Reminder Plugin - Recordatorios del Calendario */}
      <SmartReminderPlugin 
        clientId={clientId}
        clientName={clientName}
        projectId={clientProject?.id}
        projectName={clientProject?.project_name}
      />

      {/* Project Management */}
      {clientProject && (
        <Card>
          <CardHeader>
            <CardTitle>Gestión de Proyectos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Planes de Pago</h4>
              <PaymentPlanManager 
                clientProjectId={clientProject.id}
                planType="design_payment"
                readOnly={false}
                compact={true}
              />
            </div>
          </CardContent>
        </Card>
      )}

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