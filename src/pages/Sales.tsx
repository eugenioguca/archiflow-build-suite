import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Phone, Mail, MessageSquare, Video, Plus, Filter, Edit2, Settings, Bell, AlertCircle, TrendingUp, Users, Target, DollarSign, Eye, Clock, CheckCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { DatePicker } from "@/components/DatePicker";
import { EditableCell } from "@/components/EditableCell";
import { CRMNotifications } from "@/components/CRMNotifications";
import { CRMActivityTimeline } from "@/components/CRMActivityTimeline";
import { CRMLeadScoring } from "@/components/CRMLeadScoring";
import { useForm } from "react-hook-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  advertising: "Publicidad",
  cold_outreach: "Contacto Directo",
  event: "Evento",
  other: "Otro"
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
  const { toast } = useToast();

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
          profiles!clients_assigned_advisor_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;

      // Separate potential clients from closed clients
      const allClients = (clientsData || []).map(client => ({
        ...client,
        advisor_name: client.profiles?.full_name || 'Sin asignar'
      }));
      
      const potentialClients = allClients.filter(client => client.status === 'potential');
      const closedClients = allClients.filter(client => ['existing', 'active', 'completed'].includes(client.status));

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
      setClosedClients(closedClients);
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
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('No authenticated user');

      const { data: newActivity, error } = await supabase
        .from('crm_activities')
        .insert([{
          ...activity,
          user_id: user.user.id
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
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('No authenticated user');

      const { data: newReminder, error } = await supabase
        .from('crm_reminders')
        .insert([{
          ...reminder,
          user_id: user.user.id,
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
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('No authenticated user');

      const { error } = await supabase
        .from('crm_reminders')
        .insert([{
          client_id: clientId,
          user_id: user.user.id,
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

  const getPendingReminders = () => {
    return reminders.filter(r => 
      new Date(r.reminder_date) <= new Date() && !r.is_sent
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const metrics = getMetrics();
  const pendingReminders = getPendingReminders();

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
            <Badge variant="destructive" className="animate-pulse">
              <Bell className="h-4 w-4 mr-1" />
              {pendingReminders.length} recordatorios
            </Badge>
          )}
          <Dialog open={isNewClientDialogOpen} onOpenChange={setIsNewClientDialogOpen}>
            <DialogTrigger asChild>
              <Button className="glassmorphic-bg enhanced-hover">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Cliente Potencial
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glassmorphic-bg">
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

      {/* Métricas de Pipeline Potencial */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="glassmorphic-bg enhanced-hover">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Pipeline Potencial</p>
                <p className="text-lg font-bold text-foreground break-words">
                  {formatCurrency(getTotalPipeline())}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glassmorphic-bg enhanced-hover">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Clientes Potenciales</p>
                <p className="text-2xl font-bold text-foreground">{metrics.totalPotential}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glassmorphic-bg enhanced-hover">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Clientes Cerrados</p>
                <p className="text-2xl font-bold text-foreground">{metrics.totalClosed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glassmorphic-bg enhanced-hover">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-purple-600" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Ingresos Cerrados</p>
                <p className="text-lg font-bold text-foreground break-words">
                  {formatCurrency(getClosedRevenue())}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glassmorphic-bg enhanced-hover">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-orange-600" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Tasa Conversión</p>
                <p className="text-2xl font-bold text-foreground">
                  {metrics.conversionRate}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notificaciones CRM */}
      <CRMNotifications />

      {/* Tabs de contenido */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="glassmorphic-bg">
          <TabsTrigger value="pipeline">Pipeline Potencial</TabsTrigger>
          <TabsTrigger value="closed">Clientes Cerrados</TabsTrigger>
          <TabsTrigger value="activities">Actividades</TabsTrigger>
          <TabsTrigger value="scoring">Lead Scoring</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-4">
          {/* Filtros */}
          <Card className="glassmorphic-bg">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Buscar por nombre, email o asesor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-48">
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
          <Card className="glassmorphic-bg">
            <CardHeader>
              <CardTitle>Pipeline de Clientes Potenciales ({filteredClients.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Proyecto</TableHead>
                    <TableHead>Asesor</TableHead>
                    <TableHead>Prioridad</TableHead>
                    <TableHead>Presupuesto</TableHead>
                    <TableHead>Lead Score</TableHead>
                    <TableHead>Próximo Contacto</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{client.full_name}</p>
                          <p className="text-sm text-muted-foreground">{client.email}</p>
                          <p className="text-sm text-muted-foreground">{client.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{projectTypeConfig[client.project_type || 'residential']}</p>
                          <p className="text-sm text-muted-foreground">{client.timeline_months} meses</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{client.advisor_name}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={client.priority === 'urgent' ? 'destructive' : 
                                      client.priority === 'high' ? 'default' : 'secondary'}>
                          {client.priority === 'urgent' ? 'Urgente' :
                           client.priority === 'high' ? 'Alta' :
                           client.priority === 'medium' ? 'Media' : 'Baja'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{formatCurrency(client.budget || 0)}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Progress value={client.lead_score} className="w-16 h-2" />
                          <span className="text-sm font-medium">{client.lead_score}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{client.next_contact_date}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedClient(client)}
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReminderClientId(client.id);
                              setShowReminderDialog(true);
                            }}
                            title="Crear recordatorio"
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                          <Select
                            value={client.status}
                            onValueChange={(value) => updateClientStatus(client.id, value as Client['status'])}
                          >
                            <SelectTrigger className="w-24 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="potential">Potencial</SelectItem>
                              <SelectItem value="existing">Cerrar</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="closed" className="space-y-4">
          <Card className="glassmorphic-bg">
            <CardHeader>
              <CardTitle>Clientes Cerrados ({closedClients.length})</CardTitle>
              <p className="text-sm text-muted-foreground">
                Clientes que han pasado de potenciales a existentes, activos o completados
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Proyecto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Asesor</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Fecha Cierre</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {closedClients.map((client) => (
                    <TableRow key={client.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{client.full_name}</p>
                          <p className="text-sm text-muted-foreground">{client.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{projectTypeConfig[client.project_type || 'residential']}</p>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[client.status].color}>
                          {statusConfig[client.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{client.advisor_name}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-green-600">{formatCurrency(client.budget || 0)}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{client.last_contact_date}</p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities">
          <Card className="glassmorphic-bg">
            <CardHeader>
              <CardTitle>Gestión de Actividades CRM</CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedClient ? `Actividades para: ${selectedClient.full_name}` : 'Selecciona un cliente desde la tabla para ver actividades específicas'}
              </p>
            </CardHeader>
            <CardContent>
              {selectedClient ? (
                <CRMActivityTimeline clientId={selectedClient.id} />
              ) : (
                <div className="space-y-4">
                  <p className="text-center text-muted-foreground py-8">
                    Haz clic en el botón "Ver detalles" de cualquier cliente en la tabla del Pipeline para gestionar sus actividades
                  </p>
                  {filteredClients.length > 0 && (
                    <div className="grid gap-4">
                      <h3 className="font-semibold">Clientes Disponibles:</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredClients.slice(0, 6).map((client) => (
                          <Card key={client.id} className="cursor-pointer hover:shadow-md transition-shadow glassmorphic-bg"
                                onClick={() => setSelectedClient(client)}>
                            <CardContent className="p-4">
                              <h4 className="font-medium">{client.full_name}</h4>
                              <p className="text-sm text-muted-foreground">{client.email}</p>
                              <Badge variant="outline" className="mt-2">
                                {statusConfig[client.status].label}
                              </Badge>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scoring">
          <Card className="glassmorphic-bg">
            <CardHeader>
              <CardTitle>Lead Scoring Inteligente</CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedClient ? `Análisis de scoring para: ${selectedClient.full_name}` : 'Análisis general de lead scoring'}
              </p>
            </CardHeader>
            <CardContent>
              {selectedClient ? (
                <CRMLeadScoring 
                  client={{
                    id: selectedClient.id,
                    lead_score: selectedClient.lead_score,
                    budget: selectedClient.budget,
                    project_type: selectedClient.project_type,
                    priority: selectedClient.priority,
                    last_contact_date: selectedClient.last_contact_date,
                    created_at: new Date().toISOString()
                  }}
                  onScoreUpdate={(newScore) => {
                    setClients(clients.map(c => 
                      c.id === selectedClient.id ? { ...c, lead_score: newScore } : c
                    ));
                  }}
                />
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="glassmorphic-bg">
                      <CardContent className="p-4 text-center">
                        <h3 className="text-2xl font-bold text-green-600">
                          {clients.filter(c => c.lead_score >= 80).length}
                        </h3>
                        <p className="text-sm text-muted-foreground">Leads Calientes (80+)</p>
                      </CardContent>
                    </Card>
                    <Card className="glassmorphic-bg">
                      <CardContent className="p-4 text-center">
                        <h3 className="text-2xl font-bold text-orange-600">
                          {clients.filter(c => c.lead_score >= 60 && c.lead_score < 80).length}
                        </h3>
                        <p className="text-sm text-muted-foreground">Leads Tibios (60-79)</p>
                      </CardContent>
                    </Card>
                    <Card className="glassmorphic-bg">
                      <CardContent className="p-4 text-center">
                        <h3 className="text-2xl font-bold text-blue-600">
                          {clients.filter(c => c.lead_score >= 40 && c.lead_score < 60).length}
                        </h3>
                        <p className="text-sm text-muted-foreground">Leads Fríos (40-59)</p>
                      </CardContent>
                    </Card>
                    <Card className="glassmorphic-bg">
                      <CardContent className="p-4 text-center">
                        <h3 className="text-2xl font-bold text-gray-600">
                          {clients.filter(c => c.lead_score < 40).length}
                        </h3>
                        <p className="text-sm text-muted-foreground">Leads Bajos (&lt;40)</p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-4">Top Leads por Scoring</h3>
                    <div className="space-y-2">
                      {clients
                        .sort((a, b) => b.lead_score - a.lead_score)
                        .slice(0, 5)
                        .map((client) => (
                          <div key={client.id} className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 glassmorphic-bg enhanced-hover"
                               onClick={() => setSelectedClient(client)}>
                            <div>
                              <p className="font-medium">{client.full_name}</p>
                              <p className="text-sm text-muted-foreground">{client.email}</p>
                            </div>
                            <div className="flex items-center space-x-3">
                              <Progress value={client.lead_score} className="w-20 h-2" />
                              <span className="font-bold text-lg">{client.lead_score}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Estado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(statusConfig).map(([status, config]) => {
                    const count = clients.filter(c => c.status === status).length;
                    const percentage = clients.length > 0 ? (count / clients.length) * 100 : 0;
                    return (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge className={config.color}>{config.label}</Badge>
                          <span className="text-sm">{count} clientes</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Progress value={percentage} className="w-20 h-2" />
                          <span className="text-sm font-medium">{percentage.toFixed(0)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fuentes de Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(leadSourceConfig).map(([source, label]) => {
                    const count = clients.filter(c => c.lead_source === source).length;
                    const percentage = clients.length > 0 ? (count / clients.length) * 100 : 0;
                    return (
                      <div key={source} className="flex items-center justify-between">
                        <span className="text-sm">{label}</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={percentage} className="w-20 h-2" />
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog para crear recordatorios */}
      <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <DialogContent className="glassmorphic-bg">
          <DialogHeader>
            <DialogTitle>Crear Recordatorio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Título</label>
              <Input placeholder="Título del recordatorio" id="reminder-title" />
            </div>
            <div>
              <label className="text-sm font-medium">Mensaje</label>
              <Textarea placeholder="Descripción del recordatorio" id="reminder-message" />
            </div>
            <div>
              <label className="text-sm font-medium">Fecha y Hora</label>
              <Input type="datetime-local" id="reminder-date" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowReminderDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={() => {
                const title = (document.getElementById('reminder-title') as HTMLInputElement)?.value;
                const message = (document.getElementById('reminder-message') as HTMLTextAreaElement)?.value;
                const date = (document.getElementById('reminder-date') as HTMLInputElement)?.value;
                
                if (title && message && date) {
                  createReminder(reminderClientId, title, message, new Date(date).toISOString());
                }
              }}>
                Crear Recordatorio
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}