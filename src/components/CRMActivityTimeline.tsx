import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Phone, Mail, Calendar, MapPin, FileText, DollarSign, 
  MessageSquare, Video, Plus, Clock, CheckCircle, AlertCircle 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface Activity {
  id: string;
  activity_type: string;
  title: string;
  description: string;
  scheduled_date: string;
  completed_date: string | null;
  duration_minutes: number | null;
  outcome: string | null;
  next_action: string | null;
  next_action_date: string | null;
  contact_method: string;
  is_completed: boolean;
  created_at: string;
  user: {
    full_name: string;
  };
}

interface CRMActivityTimelineProps {
  clientId: string;
}

const activityIcons = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  proposal_sent: FileText,
  site_visit: MapPin,
  follow_up: MessageSquare,
  negotiation: DollarSign,
  contract_review: FileText,
};

const activityLabels = {
  call: 'Llamada',
  email: 'Email',
  meeting: 'Reunión',
  proposal_sent: 'Propuesta Enviada',
  site_visit: 'Visita de Obra',
  follow_up: 'Seguimiento',
  negotiation: 'Negociación',
  contract_review: 'Revisión de Contrato',
};

const contactMethodLabels = {
  phone: 'Teléfono',
  email: 'Email',
  whatsapp: 'WhatsApp',
  meeting: 'Reunión',
  site_visit: 'Visita',
  video_call: 'Videollamada',
};

export function CRMActivityTimeline({ clientId }: CRMActivityTimelineProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newActivity, setNewActivity] = useState({
    activity_type: 'call',
    title: '',
    description: '',
    scheduled_date: '',
    contact_method: 'phone',
    next_action: '',
    next_action_date: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchActivities();
  }, [clientId]);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_activities')
        .select(`
          *,
          user:profiles(full_name)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivities(data as any || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las actividades",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { error } = await supabase
        .from('crm_activities')
        .insert({
          client_id: clientId,
          user_id: user.id,
          activity_type: newActivity.activity_type as any,
          title: newActivity.title,
          description: newActivity.description,
          contact_method: newActivity.contact_method as any,
          next_action: newActivity.next_action,
          scheduled_date: newActivity.scheduled_date ? new Date(newActivity.scheduled_date).toISOString() : null,
          next_action_date: newActivity.next_action_date ? new Date(newActivity.next_action_date).toISOString() : null,
        });

      if (error) throw error;

      // Crear recordatorio si hay próxima acción
      if (newActivity.next_action && newActivity.next_action_date) {
        const { error: reminderError } = await supabase
          .from('crm_reminders')
          .insert({
            client_id: clientId,
            user_id: user.id,
            title: `Próxima acción: ${newActivity.next_action}`,
            message: newActivity.description || newActivity.title,
            reminder_date: new Date(newActivity.next_action_date).toISOString(),
          });

        if (reminderError) {
          console.error('Error creating reminder:', reminderError);
        }
      }

      setIsDialogOpen(false);
      setNewActivity({
        activity_type: 'call',
        title: '',
        description: '',
        scheduled_date: '',
        contact_method: 'phone',
        next_action: '',
        next_action_date: '',
      });
      
      fetchActivities();
      
      toast({
        title: "Actividad creada",
        description: "La actividad se ha registrado correctamente",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la actividad",
        variant: "destructive",
      });
    }
  };

  const markActivityCompleted = async (activityId: string) => {
    try {
      const { error } = await supabase
        .from('crm_activities')
        .update({ 
          is_completed: true,
          completed_date: new Date().toISOString()
        })
        .eq('id', activityId);

      if (error) throw error;
      
      fetchActivities();
      
      toast({
        title: "Actividad completada",
        description: "La actividad ha sido marcada como completada",
      });
    } catch (error) {
      console.error('Error completing activity:', error);
      toast({
        title: "Error",
        description: "No se pudo completar la actividad",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Timeline de Actividades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Timeline de Actividades</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Actividad
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Registrar Nueva Actividad</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateActivity} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="activity_type">Tipo de Actividad</Label>
                    <Select 
                      value={newActivity.activity_type} 
                      onValueChange={(value) => setNewActivity({ ...newActivity, activity_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(activityLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="contact_method">Método de Contacto</Label>
                    <Select 
                      value={newActivity.contact_method} 
                      onValueChange={(value) => setNewActivity({ ...newActivity, contact_method: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(contactMethodLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={newActivity.title}
                    onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                    placeholder="Ej: Llamada de seguimiento inicial"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={newActivity.description}
                    onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                    placeholder="Detalles de la actividad..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="scheduled_date">Fecha Programada</Label>
                    <Input
                      id="scheduled_date"
                      type="datetime-local"
                      value={newActivity.scheduled_date}
                      onChange={(e) => setNewActivity({ ...newActivity, scheduled_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="next_action_date">Próxima Acción</Label>
                    <Input
                      id="next_action_date"
                      type="datetime-local"
                      value={newActivity.next_action_date}
                      onChange={(e) => setNewActivity({ ...newActivity, next_action_date: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="next_action">Descripción de Próxima Acción</Label>
                  <Input
                    id="next_action"
                    value={newActivity.next_action}
                    onChange={(e) => setNewActivity({ ...newActivity, next_action: e.target.value })}
                    placeholder="Ej: Enviar propuesta detallada"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">Registrar Actividad</Button>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No hay actividades registradas. ¡Crea la primera!
            </p>
          ) : (
            activities.map((activity) => {
              const Icon = activityIcons[activity.activity_type as keyof typeof activityIcons] || MessageSquare;
              const timeAgo = formatDistanceToNow(new Date(activity.created_at), { 
                addSuffix: true, 
                locale: es 
              });
              
              return (
                <div key={activity.id} className="flex gap-4 p-4 border rounded-lg hover:bg-gray-50">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    activity.is_completed ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {activity.is_completed ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">{activity.title}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant={activity.is_completed ? "default" : "secondary"}>
                          {activityLabels[activity.activity_type as keyof typeof activityLabels]}
                        </Badge>
                        {!activity.is_completed && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => markActivityCompleted(activity.id)}
                          >
                            Completar
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {activity.description && (
                      <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>{activity.user?.full_name || 'Usuario desconocido'}</span>
                      <span>{timeAgo}</span>
                      <span>{contactMethodLabels[activity.contact_method as keyof typeof contactMethodLabels] || activity.contact_method}</span>
                      {activity.scheduled_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {activity.scheduled_date ? new Date(activity.scheduled_date).toLocaleDateString('es-MX') : 'Sin fecha'}
                        </span>
                      )}
                    </div>
                    
                    {activity.next_action && (
                      <div className="mt-2 p-2 bg-orange-50 border-l-2 border-orange-200 rounded">
                        <p className="text-sm text-orange-800">
                          <strong>Próxima acción:</strong> {activity.next_action}
                          {activity.next_action_date && (
                            <span className="block text-xs text-orange-600 mt-1">
                              {activity.next_action_date ? new Date(activity.next_action_date).toLocaleString('es-MX') : 'Sin fecha'}
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}