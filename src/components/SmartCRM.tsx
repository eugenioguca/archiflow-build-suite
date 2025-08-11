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
import { CRMClientCalendar } from "./CRMClientCalendar";

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
    generateIntelligentInsights();
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

  // Funciones de análisis específicas
  const analyzePaymentStatus = async (projectId: string) => {
    const { data: paymentPlans } = await supabase
      .from("payment_plans")
      .select(`
        *,
        payment_installments (*)
      `)
      .eq("client_project_id", projectId)
      .eq("is_current_plan", true);

    return paymentPlans || [];
  };

  const analyzeProjectProgress = async (projectId: string, projectStatus: string) => {
    if (projectStatus === "design") {
      const { data: designPhases } = await supabase
        .from("design_phases")
        .select("*")
        .eq("project_id", projectId)
        .order("phase_order");
      return designPhases || [];
    } else if (projectStatus === "construction") {
      const { data: constructionPhases } = await supabase
        .from("construction_phases")
        .select("*")
        .eq("project_id", projectId)
        .order("phase_order");
      return constructionPhases || [];
    }
    return [];
  };

  const analyzeCommunication = async (projectId: string) => {
    // Chat system removed - no communication data to analyze
    return [];
  };

  const analyzeDocumentation = async (projectId: string) => {
    const { data: documents } = await supabase
      .from("documents")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    return documents || [];
  };

  const analyzeCalendarActivity = async (projectId: string) => {
    const { data: events } = await supabase
      .from("client_project_calendar_events")
      .select("*")
      .eq("client_project_id", projectId)
      .order("start_date", { ascending: false })
      .limit(5);

    return events || [];
  };

  const generateIntelligentInsights = async () => {
    const generatedInsights: AIInsight[] = [];

    try {
      // Get complete project data
      const { data: projectData } = await supabase
        .from("client_projects")
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();

      if (!projectData) {
        generatedInsights.push({
          type: "risk",
          title: "Sin Proyecto Asignado",
          description: "Este cliente no tiene un proyecto asociado.",
          priority: "high",
          suggested_actions: [
            "Crear proyecto para el cliente",
            "Definir alcance del servicio requerido",
            "Asignar asesor comercial"
          ]
        });
        setInsights(generatedInsights);
        return;
      }

      const now = new Date();
      const projectCreated = new Date(projectData.created_at);
      const daysSinceCreation = Math.floor((now.getTime() - projectCreated.getTime()) / (1000 * 60 * 60 * 24));

      // Analizar según la etapa actual del cliente
      const stage = projectData.sales_pipeline_stage;
      const projectStatus = projectData.status;

      // 1. ANÁLISIS PARA CLIENTES CERRADOS
      if (stage === "cliente_cerrado") {
        // Analizar pagos
        const paymentPlans = await analyzePaymentStatus(projectData.id);
        
        if (projectStatus === "potential") {
          // Cliente cerrado pero sin iniciar
          if (paymentPlans.length === 0) {
            generatedInsights.push({
              type: "milestone",
              title: "Crear Plan de Pago de Diseño",
              description: "Cliente cerrado sin plan de pago configurado.",
              priority: "high",
              suggested_actions: [
                "Configurar plan de pago de diseño",
                "Definir montos y fechas de exhibiciones",
                "Enviar plan de pago al cliente"
              ]
            });
          } else {
            // Verificar pagos de diseño
            const designPlan = paymentPlans.find(p => p.plan_type === "design_payment");
            if (designPlan) {
              const firstInstallment = designPlan.payment_installments?.find(i => i.installment_number === 1);
              if (firstInstallment?.status !== "paid") {
                const dueDate = new Date(firstInstallment?.due_date || "");
                const daysPastDue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                
                generatedInsights.push({
                  type: daysPastDue > 0 ? "risk" : "follow_up",
                  title: daysPastDue > 0 ? "Anticipo de Diseño Vencido" : "Pendiente Anticipo de Diseño",
                  description: `Primer anticipo de diseño ${daysPastDue > 0 ? `vencido hace ${daysPastDue} días` : "pendiente de pago"}.`,
                  priority: daysPastDue > 7 ? "high" : "medium",
                  suggested_actions: [
                    "Verificar comprobante de pago subido",
                    "Contactar cliente para seguimiento de pago",
                    "Enviar recordatorio de vencimiento"
                  ]
                });
              } else {
                generatedInsights.push({
                  type: "opportunity",
                  title: "Listo para Iniciar Diseño",
                  description: "Anticipo pagado. Cliente listo para comenzar etapa de diseño.",
                  priority: "high",
                  suggested_actions: [
                    "Programar reunión de inicio de diseño",
                    "Asignar project manager",
                    "Crear fases de diseño en sistema"
                  ]
                });
              }
            }
          }
        } else if (projectStatus === "design") {
          // Cliente en etapa de diseño
          const designPhases = await analyzeProjectProgress(projectData.id, "design");
          const paymentPlans = await analyzePaymentStatus(projectData.id);
          
          if (designPhases.length === 0) {
            generatedInsights.push({
              type: "milestone",
              title: "Crear Fases de Diseño",
              description: "Proyecto en diseño sin fases definidas.",
              priority: "high",
              suggested_actions: [
                "Crear fases de diseño (Zonificación, Volumetría, Acabados, Renders)",
                "Asignar tiempos estimados a cada fase",
                "Definir entregables por fase"
              ]
            });
          } else {
            // Analizar progreso de fases
            const pendingPhases = designPhases.filter(p => p.status === "pending");
            const inProgressPhases = designPhases.filter(p => p.status === "in_progress");
            // Check for delayed phases (simplified approach)
            const delayedPhases = designPhases.filter(p => {
              if (p.status === "in_progress") {
                const phaseCreated = new Date(p.created_at);
                const daysSinceCreated = Math.floor((now.getTime() - phaseCreated.getTime()) / (1000 * 60 * 60 * 24));
                return daysSinceCreated > 7; // Consider delayed if in progress for more than 7 days
              }
              return false;
            });

            if (delayedPhases.length > 0) {
              generatedInsights.push({
                type: "risk",
                title: `Fase de Diseño Retrasada`,
                description: `Fase "${delayedPhases[0].phase_name}" tiene retraso.`,
                priority: "high",
                suggested_actions: [
                  "Revisar progreso de la fase retrasada",
                  "Contactar project manager asignado",
                  "Informar al cliente sobre el status"
                ]
              });
            }

            if (inProgressPhases.length === 0 && pendingPhases.length > 0) {
              generatedInsights.push({
                type: "follow_up",
                title: "Iniciar Siguiente Fase de Diseño",
                description: `Fase "${pendingPhases[0].phase_name}" lista para iniciar.`,
                priority: "medium",
                suggested_actions: [
                  "Marcar fase como en progreso",
                  "Notificar al equipo de diseño",
                  "Programar reunión de kickoff"
                ]
              });
            }
          }

          // Verificar si hay plan de construcción listo
          const constructionPlan = paymentPlans.find(p => p.plan_type === "construction_payment");
          const completedDesignPhases = designPhases.filter(p => p.status === "completed");
          
          if (completedDesignPhases.length === designPhases.length && designPhases.length > 0) {
            if (!constructionPlan && projectData.construction_budget > 0) {
              generatedInsights.push({
                type: "opportunity",
                title: "Crear Plan de Pago de Construcción",
                description: "Diseño completado. Listo para configurar plan de construcción.",
                priority: "high",
                suggested_actions: [
                  "Configurar plan de pago de construcción",
                  "Definir calendario de exhibiciones",
                  "Presentar plan al cliente"
                ]
              });
            }
          }

        } else if (projectStatus === "construction") {
          // Cliente en construcción
          const constructionPhases = await analyzeProjectProgress(projectData.id, "construction");
          
          if (constructionPhases.length === 0) {
            generatedInsights.push({
              type: "milestone",
              title: "Definir Fases de Construcción",
              description: "Proyecto en construcción sin fases definidas.",
              priority: "high",
              suggested_actions: [
                "Crear cronograma de construcción",
                "Definir fases principales (Cimentación, Estructura, etc.)",
                "Asignar supervisor de obra"
              ]
            });
          } else {
            // Analizar progreso de construcción - analisis simplificado
            const recentlyCreatedPhases = constructionPhases.filter(p => {
              const phaseCreated = new Date(p.created_at);
              const daysSinceCreated = Math.floor((now.getTime() - phaseCreated.getTime()) / (1000 * 60 * 60 * 24));
              return daysSinceCreated > 14 && p.status === "pending";
            });
            
            if (recentlyCreatedPhases.length > 0 && daysSinceCreation > 30) {
              generatedInsights.push({
                type: "risk",
                title: "Fases de Construcción Pendientes",
                description: `${recentlyCreatedPhases.length} fase(s) de construcción sin iniciar después de 14+ días.`,
                priority: "high",
                suggested_actions: [
                  "Reunión urgente con supervisor de obra",
                  "Revisar cronograma y recursos",
                  "Comunicar status al cliente"
                ]
              });
            }
          }
        }

        // Chat system removed - no communication analysis needed

      } else {
        // 2. ANÁLISIS PARA LEADS (nuevo_lead, en_contacto)
        if (stage === "nuevo_lead" && daysSinceCreation > 1) {
          generatedInsights.push({
            type: "risk",
            title: "Lead Sin Seguimiento",
            description: `Lead creado hace ${daysSinceCreation} días sin avanzar.`,
            priority: daysSinceCreation > 3 ? "high" : "medium",
            suggested_actions: [
              "Contactar lead inmediatamente",
              "Programar primera cita",
              "Enviar presentación de servicios"
            ]
          });
        }

        if (stage === "en_contacto" && daysSinceCreation > 7) {
          generatedInsights.push({
            type: "follow_up",
            title: "Cerrar Proceso Comercial",
            description: `Cliente en contacto hace ${daysSinceCreation} días. Momento de cerrar.`,
            priority: daysSinceCreation > 14 ? "high" : "medium",
            suggested_actions: [
              "Presentar propuesta final",
              "Programar reunión de cierre",
              "Enviar contrato para firma"
            ]
          });
        }
      }

      // Analizar eventos de calendario pendientes
      const upcomingEvents = await analyzeCalendarActivity(projectData.id);
      const todayEvents = upcomingEvents.filter(e => {
        const eventDate = new Date(e.start_date);
        const today = new Date();
        return eventDate.toDateString() === today.toDateString();
      });

      if (todayEvents.length > 0) {
        generatedInsights.push({
          type: "milestone",
          title: "Eventos de Hoy",
          description: `${todayEvents.length} evento(s) programado(s) para hoy.`,
          priority: "medium",
          suggested_actions: [
            "Revisar agenda del día",
            "Confirmar asistencia con cliente",
            "Preparar materiales necesarios"
          ]
        });
      }

    } catch (error) {
      console.error("Error generating intelligent insights:", error);
      generatedInsights.push({
        type: "follow_up",
        title: "Revisar Cliente",
        description: "Error al analizar datos. Revisar información manualmente.",
        priority: "medium",
        suggested_actions: [
          "Verificar datos del proyecto",
          "Contactar soporte técnico si persiste"
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

    </div>
  );
}