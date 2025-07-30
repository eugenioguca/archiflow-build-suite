import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ClientNotesDialog } from "@/components/ClientNotesDialog";
import { CRMActivityTimeline } from "@/components/CRMActivityTimeline";
import { CRMLeadScoring } from "@/components/CRMLeadScoring";
import { EditableField } from "@/components/EditableField";
import { useForm } from "react-hook-form";
import { 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Eye, 
  Calendar, 
  Phone, 
  Mail, 
  MessageSquare,
  DollarSign,
  Target,
  Award,
  Search,
  Filter,
  AlertCircle,
  Bell,
  StickyNote,
  UserCheck,
  Plus,
  Video,
  Edit2,
  Settings
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DatePicker } from "@/components/DatePicker";

// Interfaces
interface Client {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  status: 'potential' | 'existing' | 'active' | 'completed';
  lead_source: 'website' | 'referral' | 'social_media' | 'event' | 'advertisement' | 'cold_call' | 'partner';
  project_type: 'residential' | 'commercial' | 'industrial' | 'renovation' | 'landscape' | 'interior_design';
  budget: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  lead_score: number;
  last_contact_date: string;
  next_contact_date: string;
  preferred_contact_method: 'email' | 'phone' | 'whatsapp' | 'video_call' | 'meeting' | 'site_visit';
  timeline_months: number;
  location_details: any;
  notes: string;
  assigned_advisor_id?: string;
  created_at?: string;
  created_by?: string;
  advisor_name?: string;
  assigned_advisor?: any;
  created_by_profile?: any;
}

interface Activity {
  id: string;
  title: string;
  activity_type: 'call' | 'email' | 'meeting' | 'follow_up' | 'site_visit' | 'proposal_sent' | 'contract_review' | 'negotiation';
  description: string;
  scheduled_date: string;
  is_completed: boolean;
  client_id: string;
  outcome?: string;
  next_action?: string;
  next_action_date?: string;
}

interface Reminder {
  id: string;
  client_id: string;
  title: string;
  message: string;
  reminder_date: string;
  is_sent: boolean;
}

const statusConfig = {
  potential: { label: "Potencial", color: "bg-gray-100 text-gray-700", progress: 10 },
  existing: { label: "Existente", color: "bg-blue-100 text-blue-700", progress: 40 },
  active: { label: "Activo", color: "bg-green-100 text-green-700", progress: 70 },
  completed: { label: "Completado", color: "bg-purple-100 text-purple-700", progress: 100 },
};

const projectTypeConfig = {
  residential: "Residencial",
  commercial: "Comercial", 
  industrial: "Industrial",
  renovation: "Renovación",
  landscape: "Paisajismo",
  interior_design: "Diseño Interior"
};

const leadSourceConfig = {
  website: "Sitio Web",
  referral: "Referencia",
  social_media: "Redes Sociales",
  event: "Evento",
  advertisement: "Publicidad",
  cold_call: "Llamada Fría",
  partner: "Socio"
};

export default function Sales() {
  const [clients, setClients] = useState<Client[]>([]);
  const [closedClients, setClosedClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("potential");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState("pipeline");
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [reminderClientId, setReminderClientId] = useState<string>("");
  const [notesDialog, setNotesDialog] = useState({ open: false, clientId: "", clientName: "" });
  const [showActivities, setShowActivities] = useState(false);
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<Client>({
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      status: "potential",
      lead_source: "website",
      project_type: "residential",
      budget: 0,
      priority: "medium",
      timeline_months: 6,
      preferred_contact_method: "email",
      notes: "",
    }
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterClients();
  }, [clients, searchTerm, statusFilter, priorityFilter]);

  const fetchData = async () => {
    try {
      // Fetch clients with advisor information
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select(`
          *,
          assigned_advisor: profiles!clients_assigned_advisor_id_fkey(id, full_name),
          created_by_profile: profiles!clients_profile_id_fkey(id, full_name)
        `)
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;

      // Separate potential clients from closed clients
      const allClients = (clientsData || []).map(client => ({
        ...client,
        advisor_name: client.assigned_advisor?.full_name || 'Sin asignar'
      }));
      
      const potentialClients = allClients.filter(client => client.status === 'potential');
      const closedClientsData = allClients.filter(client => ['existing', 'active', 'completed'].includes(client.status));

      // Fetch activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('crm_activities')
        .select('*')
        .order('created_at', { ascending: false });

      if (activitiesError) throw activitiesError;

      // Fetch reminders
      const { data: remindersData, error: remindersError } = await supabase
        .from('crm_reminders')
        .select('*')
        .eq('is_sent', false)
        .order('reminder_date', { ascending: true });

      if (remindersError) throw remindersError;

      setClients(potentialClients);
      setClosedClients(closedClientsData);
      setActivities(activitiesData || []);
      setReminders(remindersData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const createClient = async (data: Client) => {
    try {
      const { data: newClient, error } = await supabase
        .from('clients')
        .insert([{
          ...data,
          lead_score: calculateLeadScore(data),
          last_contact_date: new Date().toISOString().split('T')[0],
          next_contact_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }])
        .select()
        .single();

      if (error) throw error;

      setClients([newClient, ...clients]);
      setIsNewClientDialogOpen(false);
      form.reset();

      // Create initial activity
      await createActivity({
        title: "Cliente agregado al sistema",
        activity_type: "follow_up",
        description: `Nuevo cliente potencial agregado: ${data.full_name}`,
        scheduled_date: new Date().toISOString(),
        is_completed: true,
        client_id: newClient.id
      });

      // Create follow-up reminder
      await createReminderFromClient({
        client_id: newClient.id,
        title: `Seguimiento inicial - ${data.full_name}`,
        message: `Contactar a ${data.full_name} para primera reunión`,
        reminder_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });

      toast({
        title: "Cliente creado",
        description: "El nuevo cliente ha sido agregado exitosamente",
      });
    } catch (error) {
      console.error('Error creating client:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el cliente",
        variant: "destructive",
      });
    }
  };

  const createActivity = async (activity: Omit<Activity, 'id'>) => {
    try {
      if (!user?.id) throw new Error('No authenticated user');

      const { data: newActivity, error } = await supabase
        .from('crm_activities')
        .insert([{
          ...activity,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      setActivities([newActivity, ...activities]);
      return newActivity;
    } catch (error) {
      console.error('Error creating activity:', error);
      throw error;
    }
  };

  const createReminderFromClient = async (reminder: Omit<Reminder, 'id' | 'is_sent'>) => {
    try {
      if (!user?.id) throw new Error('No authenticated user');

      const { data: newReminder, error } = await supabase
        .from('crm_reminders')
        .insert([{
          ...reminder,
          user_id: user.id,
          is_sent: false
        }])
        .select()
        .single();

      if (error) throw error;

      setReminders([...reminders, newReminder]);
      return newReminder;
    } catch (error) {
      console.error('Error creating reminder:', error);
      throw error;
    }
  };

  const calculateLeadScore = (client: Partial<Client>): number => {
    let score = 0;
    
    // Budget score (40% weight)
    if (client.budget && client.budget > 2000000) score += 40;
    else if (client.budget && client.budget > 1000000) score += 30;
    else if (client.budget && client.budget > 500000) score += 20;
    else score += 10;

    // Project type score (20% weight)
    if (client.project_type === 'commercial') score += 20;
    else if (client.project_type === 'industrial') score += 18;
    else if (client.project_type === 'residential') score += 15;
    else score += 10;

    // Timeline score (20% weight)
    if (client.timeline_months && client.timeline_months <= 3) score += 20;
    else if (client.timeline_months && client.timeline_months <= 6) score += 15;
    else if (client.timeline_months && client.timeline_months <= 12) score += 10;
    else score += 5;

    // Lead source score (20% weight)
    if (client.lead_source === 'referral') score += 20;
    else if (client.lead_source === 'website') score += 15;
    else if (client.lead_source === 'social_media') score += 10;
    else score += 5;

    return Math.min(score, 100);
  };

  const updateClient = async (clientId: string, updates: Partial<Client>) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ 
          ...updates,
          last_contact_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', clientId);

      if (error) throw error;

      setClients(clients.map(client => 
        client.id === clientId 
          ? { ...client, ...updates, last_contact_date: new Date().toISOString().split('T')[0] }
          : client
      ));

      toast({
        title: "Cliente actualizado",
        description: "Los cambios se han guardado correctamente",
      });
    } catch (error) {
      console.error('Error updating client:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el cliente",
        variant: "destructive",
      });
    }
  };

  const updateClientStatus = async (clientId: string, newStatus: Client['status']) => {
    try {
      const config = statusConfig[newStatus];
      const { error } = await supabase
        .from('clients')
        .update({ 
          status: newStatus,
          last_contact_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', clientId);

      if (error) throw error;

      setClients(clients.map(client => 
        client.id === clientId 
          ? { ...client, status: newStatus, last_contact_date: new Date().toISOString().split('T')[0] }
          : client
      ));

      // Create activity for status change
      const client = clients.find(c => c.id === clientId);
      if (client) {
        await createActivity({
          title: `Estado cambiado a ${config.label}`,
          activity_type: "follow_up",
          description: `El estado del cliente ${client.full_name} cambió a ${config.label}`,
          scheduled_date: new Date().toISOString(),
          is_completed: true,
          client_id: clientId
        });
      }

      toast({
        title: "Estado actualizado",
        description: `Estado cambiado a ${config.label}`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive",
      });
    }
  };

  const filterClients = () => {
    let filtered = clients;

    if (searchTerm) {
      filtered = filtered.filter(client =>
        client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.advisor_name && client.advisor_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (priorityFilter !== "all") {
      filtered = filtered.filter(client => client.priority === priorityFilter);
    }

    setFilteredClients(filtered);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const getTotalPipeline = () => {
    return clients.reduce((total, client) => total + (client.budget || 0), 0);
  };

  const getClosedRevenue = () => {
    return closedClients.reduce((total, client) => total + (client.budget || 0), 0);
  };

  const getMetrics = () => {
    const totalPotential = clients.length;
    const totalClosed = closedClients.length;
    const totalAll = totalPotential + totalClosed;
    const won = closedClients.filter(c => c.status === 'completed').length;
    const conversionRate = totalAll > 0 ? Math.round((totalClosed / totalAll) * 100) : 0;
    
    return { totalPotential, totalClosed, won, conversionRate, totalAll };
  };

  const createReminder = async (clientId: string, title: string, message: string, reminderDate: string) => {
    try {
      if (!user?.id) throw new Error('No authenticated user');

      const { error } = await supabase
        .from('crm_reminders')
        .insert([{
          client_id: clientId,
          user_id: user.id,
          title,
          message,
          reminder_date: reminderDate,
          is_sent: false
        }]);

      if (error) throw error;

      toast({
        title: "Recordatorio creado",
        description: "El recordatorio ha sido programado exitosamente",
      });
      
      setShowReminderDialog(false);
      fetchData();
    } catch (error) {
      console.error('Error creating reminder:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el recordatorio",
        variant: "destructive",
      });
    }
  };

  const scheduleReminder = async (clientId: string, clientName: string) => {
    try {
      const reminderDate = new Date();
      reminderDate.setMinutes(reminderDate.getMinutes() + 15); // 15 minutos

      const { error } = await supabase
        .from('crm_reminders')
        .insert({
          client_id: clientId,
          user_id: user?.id,
          title: 'Recordatorio de seguimiento',
          message: `Realizar seguimiento con el cliente ${clientName}`,
          reminder_date: reminderDate.toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Recordatorio programado",
        description: `Se programó un recordatorio para ${clientName} en 15 minutos`,
      });
    } catch (error) {
      console.error('Error scheduling reminder:', error);
      toast({
        title: "Error",
        description: "No se pudo programar el recordatorio",
        variant: "destructive",
      });
    }
  };

  const viewClientDetails = (client: any) => {
    setNotesDialog({
      open: true,
      clientId: client.id,
      clientName: client.full_name
    });
  };

  const getPendingReminders = () => {
    return reminders.filter(r => 
      new Date(r.reminder_date) <= new Date() && !r.is_sent
    );
  };

  // Calculate metrics
  const totalPipelineValue = getTotalPipeline();
  const potentialCount = clients.length;
  const closedCount = closedClients.length;
  const conversionRate = (potentialCount + closedCount) > 0 ? Math.round((closedCount / (potentialCount + closedCount)) * 100) : 0;
  const averageValue = potentialCount > 0 ? Math.round(totalPipelineValue / potentialCount) : 0;
  const closedRevenue = getClosedRevenue();
  const closedAverageValue = closedCount > 0 ? Math.round(closedRevenue / closedCount) : 0;
  const averageClosingTime = 30; // Placeholder
  const metrics = getMetrics();
  const pendingReminders = getPendingReminders();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">CRM de Ventas</h1>
          <p className="text-muted-foreground">Pipeline de clientes potenciales y gestión de ventas</p>
        </div>
        <div className="flex gap-2">
          {pendingReminders.length > 0 && (
            <Badge 
              variant="destructive" 
              className="animate-pulse cursor-pointer hover:bg-red-700 transition-colors"
              onClick={() => setShowActivities(true)}
            >
              <Bell className="h-4 w-4 mr-1" />
              {pendingReminders.length} recordatorios
            </Badge>
          )}
          <Dialog open={isNewClientDialogOpen} onOpenChange={setIsNewClientDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-orange-600 hover:from-blue-700 hover:to-orange-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Cliente Potencial
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-xl border border-border/50">
              <DialogHeader>
                <DialogTitle>Agregar Nuevo Cliente Potencial</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(createClient)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre Completo</FormLabel>
                          <FormControl>
                            <Input placeholder="Nombre del cliente" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="cliente@email.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teléfono</FormLabel>
                          <FormControl>
                            <Input placeholder="+52 55 1234 5678" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="preferred_contact_method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Método de Contacto Preferido</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar método" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="phone">Teléfono</SelectItem>
                              <SelectItem value="whatsapp">WhatsApp</SelectItem>
                              <SelectItem value="video_call">Videollamada</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="project_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Proyecto</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Tipo de proyecto" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(projectTypeConfig).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lead_source"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fuente del Lead</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Fuente" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(leadSourceConfig).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prioridad</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Prioridad" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Baja</SelectItem>
                              <SelectItem value="medium">Media</SelectItem>
                              <SelectItem value="high">Alta</SelectItem>
                              <SelectItem value="urgent">Urgente</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="budget"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Presupuesto Estimado (MXN)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="500000" 
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="timeline_months"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timeline (meses)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="6" 
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notas</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Información adicional sobre el cliente y proyecto..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsNewClientDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit">
                      Crear Cliente
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-background/60 backdrop-blur-xl border border-border/50">
          <TabsTrigger value="pipeline">Pipeline Potencial</TabsTrigger>
          <TabsTrigger value="closed">Clientes Cerrados</TabsTrigger>
          <TabsTrigger value="activities">Actividades</TabsTrigger>
          <TabsTrigger value="scoring">Lead Scoring</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-6">
          {/* Métricas del Pipeline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-50/80 to-white/60 backdrop-blur-xl border border-blue-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-700">Pipeline Total</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-lg lg:text-2xl font-bold text-blue-900 break-words">
                  ${totalPipelineValue.toLocaleString('es-MX')}
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  En oportunidades potenciales
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50/80 to-white/60 backdrop-blur-xl border border-green-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-700">Clientes Potenciales</CardTitle>
                <Users className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-lg lg:text-2xl font-bold text-green-900">{potentialCount}</div>
                <p className="text-xs text-green-600 mt-1">
                  Activos en pipeline
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50/80 to-white/60 backdrop-blur-xl border border-orange-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-700">Tasa de Conversión</CardTitle>
                <TrendingUp className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-lg lg:text-2xl font-bold text-orange-900">{conversionRate}%</div>
                <p className="text-xs text-orange-600 mt-1">
                  Potenciales a cerrados
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50/80 to-white/60 backdrop-blur-xl border border-purple-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-700">Valor Promedio</CardTitle>
                <Target className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-base lg:text-2xl font-bold text-purple-900 break-words">
                  ${averageValue.toLocaleString('es-MX')}
                </div>
                <p className="text-xs text-purple-600 mt-1">
                  Por oportunidad
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <Card className="bg-background/60 backdrop-blur-xl border border-border/50">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Buscar por nombre, email o asesor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las prioridades</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="low">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tabla de Clientes Potenciales */}
          <div className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-lg">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Pipeline de Clientes Potenciales ({filteredClients.length})</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left p-3 font-medium">Cliente</th>
                      <th className="text-left p-3 font-medium">Proyecto</th>
                      <th className="text-left p-3 font-medium">Score</th>
                      <th className="text-left p-3 font-medium">Asesor</th>
                      <th className="text-left p-3 font-medium">Registrado por</th>
                      <th className="text-left p-3 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((client) => (
                      <tr key={client.id} className="border-b border-border/30 hover:bg-muted/50">
                         <td className="p-3">
                           <div className="space-y-1">
                             <EditableField
                                value={client.full_name || ''}
                                onSave={(value) => updateClient(client.id, { full_name: (value || '').toString() })}
                               className="font-medium text-foreground"
                             />
                             <EditableField
                               value={client.email || ''}
                               onSave={(value) => updateClient(client.id, { email: (value || '').toString() })}
                               type="email"
                               className="text-sm text-muted-foreground"
                             />
                             <EditableField
                               value={client.phone || ''}
                               onSave={(value) => updateClient(client.id, { phone: (value || '').toString() })}
                               type="phone"
                               className="text-xs text-muted-foreground"
                             />
                           </div>
                         </td>
                         <td className="p-3">
                           <div className="space-y-2">
                             <EditableField
                               value={client.project_type || 'residential'}
                               onSave={(value) => updateClient(client.id, { project_type: value as any })}
                               type="select"
                               options={[
                                 { value: 'residential', label: 'Residencial' },
                                 { value: 'commercial', label: 'Comercial' },
                                 { value: 'industrial', label: 'Industrial' },
                                 { value: 'renovation', label: 'Remodelación' },
                                 { value: 'landscape', label: 'Paisajismo' },
                                 { value: 'interior_design', label: 'Diseño Interior' }
                               ]}
                               className="font-medium capitalize"
                               displayTransform={(value) => projectTypeConfig[value as keyof typeof projectTypeConfig] || 'No especificado'}
                             />
                             <EditableField
                               value={client.budget || 0}
                               onSave={(value) => updateClient(client.id, { budget: Number(value) })}
                               type="number"
                               className="text-sm text-muted-foreground"
                               displayTransform={(value) => `$${Number(value).toLocaleString('es-MX')}`}
                             />
                             <EditableField
                               value={client.priority || 'medium'}
                               onSave={(value) => updateClient(client.id, { priority: value as any })}
                               type="select"
                               options={[
                                 { value: 'low', label: 'Baja' },
                                 { value: 'medium', label: 'Media' },
                                 { value: 'high', label: 'Alta' },
                                 { value: 'urgent', label: 'Urgente' }
                               ]}
                               className="text-xs"
                               displayTransform={(value) => {
                                 const label = value === 'urgent' ? 'Urgente' :
                                              value === 'high' ? 'Alta' :
                                              value === 'medium' ? 'Media' : 'Baja';
                                 return label;
                               }}
                             />
                           </div>
                         </td>
                         <td className="p-3">
                           <div className="flex items-center space-x-2">
                             <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-green-500 flex items-center justify-center text-foreground text-xs font-bold">
                               {client.lead_score || calculateLeadScore(client)}
                             </div>
                           </div>
                         </td>
                        <td className="p-3">
                          <span className="text-sm text-muted-foreground">
                            {client.assigned_advisor?.full_name || 'Sin asignar'}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {client.created_by_profile?.full_name || 'Sistema'}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => viewClientDetails(client)}
                              className="h-8 w-8 p-0"
                              title="Ver notas y detalles"
                            >
                              <StickyNote className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => scheduleReminder(client.id, client.full_name)}
                              className="h-8 w-8 p-0"
                              title="Programar recordatorio"
                            >
                              <Bell className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedClient(client);
                                setReminderClientId(client.id);
                                setShowReminderDialog(true);
                              }}
                              className="h-8 w-8 p-0"
                              title="Recordatorio personalizado"
                            >
                              <Calendar className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {filteredClients.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No hay clientes potenciales que coincidan con los filtros
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="closed" className="space-y-6">
          {/* Métricas de Clientes Cerrados */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-emerald-50/80 to-white/60 backdrop-blur-xl border border-emerald-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-emerald-700">Ingresos Generados</CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-base lg:text-2xl font-bold text-emerald-900 break-words">
                  ${closedRevenue.toLocaleString('es-MX')}
                </div>
                <p className="text-xs text-emerald-600 mt-1">
                  De clientes cerrados
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50/80 to-white/60 backdrop-blur-xl border border-blue-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-700">Clientes Cerrados</CardTitle>
                <CheckCircle className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-lg lg:text-2xl font-bold text-blue-900">{closedCount}</div>
                <p className="text-xs text-blue-600 mt-1">
                  Activos y completados
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50/80 to-white/60 backdrop-blur-xl border border-amber-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-amber-700">Ticket Promedio</CardTitle>
                <Award className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-base lg:text-2xl font-bold text-amber-900 break-words">
                  ${closedAverageValue.toLocaleString('es-MX')}
                </div>
                <p className="text-xs text-amber-600 mt-1">
                  Por cliente cerrado
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-indigo-50/80 to-white/60 backdrop-blur-xl border border-indigo-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-indigo-700">Tiempo Promedio</CardTitle>
                <Clock className="h-4 w-4 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-lg lg:text-2xl font-bold text-indigo-900">
                  {Math.round(averageClosingTime)} días
                </div>
                <p className="text-xs text-indigo-600 mt-1">
                  Para cerrar venta
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de Clientes Cerrados */}
          <div className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-lg">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Clientes Cerrados ({closedClients.length})</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left p-3 font-medium">Cliente</th>
                      <th className="text-left p-3 font-medium">Estado</th>
                      <th className="text-left p-3 font-medium">Valor del Proyecto</th>
                      <th className="text-left p-3 font-medium">Tipo</th>
                      <th className="text-left p-3 font-medium">Asesor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closedClients.map((client) => (
                      <tr key={client.id} className="border-b border-border/30 hover:bg-muted/50">
                        <td className="p-3">
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">{client.full_name}</p>
                            <p className="text-sm text-muted-foreground">{client.email}</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant={client.status === 'completed' ? 'default' : 'secondary'}>
                            {client.status === 'completed' ? 'Completado' : 'Activo'}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <span className="font-medium text-green-600">
                            ${(client.budget || 0).toLocaleString('es-MX')}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="capitalize">{projectTypeConfig[client.project_type] || 'No especificado'}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-sm text-muted-foreground">
                            {client.assigned_advisor?.full_name || 'Sin asignar'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {closedClients.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No hay clientes cerrados registrados
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="activities" className="space-y-6">
          <Card className="bg-background/60 backdrop-blur-xl border border-border/50">
            <CardHeader>
              <CardTitle>Timeline de Actividades y Recordatorios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Recordatorios Pendientes */}
                <div className="bg-yellow-50/50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-3">Recordatorios Pendientes ({pendingReminders.length})</h4>
                  {pendingReminders.length > 0 ? (
                    <div className="space-y-2">
                      {pendingReminders.map((reminder) => (
                        <div key={reminder.id} className="flex items-center justify-between bg-white p-3 rounded border">
                          <div>
                            <p className="font-medium text-gray-900">{reminder.title}</p>
                            <p className="text-sm text-gray-600">{reminder.message}</p>
                            <p className="text-xs text-gray-500">
                              {format(new Date(reminder.reminder_date), 'PPpp', { locale: es })}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={async () => {
                              try {
                                await supabase
                                  .from('crm_reminders')
                                  .update({ is_sent: true })
                                  .eq('id', reminder.id);
                                fetchData();
                                toast({
                                  title: "Recordatorio marcado como atendido",
                                  description: "El recordatorio ha sido procesado",
                                });
                              } catch (error) {
                                console.error('Error updating reminder:', error);
                              }
                            }}
                          >
                            Marcar como atendido
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-yellow-700">No hay recordatorios pendientes</p>
                  )}
                </div>

                {/* Activities Timeline for all clients */}
                <div className="space-y-6">
                  {filteredClients.map((client) => (
                    <div key={client.id} className="border border-border/50 rounded-lg p-4">
                      <h4 className="font-semibold mb-3 text-foreground">Actividades - {client.full_name}</h4>
                      <CRMActivityTimeline clientId={client.id} />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scoring" className="space-y-6">
          <div className="grid gap-6">
            {filteredClients.map((client) => (
              <CRMLeadScoring 
                key={client.id}
                client={{
                  id: client.id,
                  lead_score: client.lead_score || calculateLeadScore(client),
                  budget: client.budget || 0,
                  project_type: client.project_type || 'residential',
                  priority: client.priority || 'medium',
                  last_contact_date: client.last_contact_date || new Date().toISOString().split('T')[0],
                  created_at: client.created_at || new Date().toISOString()
                }}
                onScoreUpdate={(newScore) => {
                  updateClient(client.id, { lead_score: newScore });
                }}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog para recordatorios personalizados */}
      <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <DialogContent className="bg-background/95 backdrop-blur-xl border border-border/50">
          <DialogHeader>
            <DialogTitle>
              Crear Recordatorio - {selectedClient?.full_name}
            </DialogTitle>
          </DialogHeader>
          
          <ReminderForm 
            clientId={reminderClientId}
            clientName={selectedClient?.full_name || ""}
            onSave={createReminder}
            onCancel={() => setShowReminderDialog(false)}
          />
        </DialogContent>
      </Dialog>

      <ClientNotesDialog
        open={notesDialog.open}
        onOpenChange={(open) => setNotesDialog(prev => ({ ...prev, open }))}
        clientId={notesDialog.clientId}
        clientName={notesDialog.clientName}
      />

      {/* Dialog para actividades y recordatorios */}
      <Dialog open={showActivities} onOpenChange={setShowActivities}>
        <DialogContent className="max-w-6xl h-[80vh] overflow-y-auto bg-background/95 backdrop-blur-xl border border-border/50">
          <DialogHeader>
            <DialogTitle>Actividades y Recordatorios del Sistema</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Recordatorios Pendientes */}
            <div className="bg-yellow-50/50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Recordatorios Pendientes ({pendingReminders.length})
              </h4>
              {pendingReminders.length > 0 ? (
                <div className="space-y-3">
                  {pendingReminders.map((reminder) => (
                    <div key={reminder.id} className="flex items-center justify-between bg-white p-4 rounded border shadow-sm">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{reminder.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{reminder.message}</p>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(reminder.reminder_date), 'PPpp', { locale: es })}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              await supabase
                                .from('crm_reminders')
                                .update({ is_sent: true })
                                .eq('id', reminder.id);
                              fetchData();
                              toast({
                                title: "Recordatorio procesado",
                                description: "El recordatorio ha sido marcado como atendido",
                              });
                            } catch (error) {
                              console.error('Error updating reminder:', error);
                            }
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Marcar como atendido
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-yellow-700">
                  <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No hay recordatorios pendientes</p>
                </div>
              )}
            </div>

            {/* Actividades por Cliente */}
            <div className="space-y-6">
              <h4 className="font-semibold text-foreground text-lg">Actividades por Cliente</h4>
              {filteredClients.map((client) => (
                <div key={client.id} className="border border-border/50 rounded-lg p-4 bg-background/50">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="font-semibold text-foreground">
                      {client.full_name}
                      <span className="ml-2 text-sm text-muted-foreground">
                        (Score: {client.lead_score || calculateLeadScore(client)})
                      </span>
                    </h5>
                    <Badge variant="outline">
                      {statusConfig[client.status].label}
                    </Badge>
                  </div>
                  <CRMActivityTimeline clientId={client.id} />
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente para formulario de recordatorios
interface ReminderFormProps {
  clientId: string;
  clientName: string;
  onSave: (clientId: string, title: string, message: string, reminderDate: string) => void;
  onCancel: () => void;
}

function ReminderForm({ clientId, clientName, onSave, onCancel }: ReminderFormProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [reminderDate, setReminderDate] = useState<Date>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim() || !reminderDate) return;

    onSave(clientId, title, message, reminderDate.toISOString());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Título del Recordatorio</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Llamar para seguimiento"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Mensaje</label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`Recordatorio para el cliente ${clientName}...`}
          rows={3}
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Fecha y Hora</label>
        <input
          type="datetime-local"
          value={reminderDate ? reminderDate.toISOString().slice(0, 16) : ''}
          onChange={(e) => setReminderDate(new Date(e.target.value))}
          className="w-full px-3 py-2 border border-border/50 rounded-md bg-background"
          required
        />
      </div>
      
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          Crear Recordatorio
        </Button>
      </div>
    </form>
  );
}