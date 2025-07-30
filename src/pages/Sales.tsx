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
import { Calendar, Phone, Mail, MessageSquare, Video, Plus, Filter, Edit2, Settings, Bell, AlertCircle, TrendingUp, Users, Target, DollarSign } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { DatePicker } from "@/components/DatePicker";
import { EditableCell } from "@/components/EditableCell";
import { CustomizableTable } from "@/components/CustomizableTable";
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
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [showCustomTable, setShowCustomTable] = useState(false);
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState("pipeline");
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
      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;

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

      setClients(clientsData || []);
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
      await createReminder({
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

  const createReminder = async (reminder: Omit<Reminder, 'id' | 'is_sent'>) => {
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
        client.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(client => client.status === statusFilter);
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
    return clients
      .filter(client => client.status !== 'completed')
      .reduce((total, client) => total + (client.budget || 0), 0);
  };

  const getMetrics = () => {
    const total = clients.length;
    const qualified = clients.filter(c => ['existing', 'active'].includes(c.status)).length;
    const won = clients.filter(c => c.status === 'completed').length;
    const conversionRate = total > 0 ? Math.round((won / total) * 100) : 0;
    
    return { total, qualified, won, conversionRate };
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
          <h1 className="text-3xl font-bold text-foreground">CRM de Ventas Arquitectura</h1>
          <p className="text-muted-foreground">Sistema avanzado de gestión de clientes y ventas</p>
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
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Agregar Nuevo Cliente</DialogTitle>
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

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Pipeline Total</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(getTotalPipeline())}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Clientes</p>
                <p className="text-2xl font-bold text-foreground">{metrics.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Calificados</p>
                <p className="text-2xl font-bold text-foreground">{metrics.qualified}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Ganados</p>
                <p className="text-2xl font-bold text-foreground">{metrics.won}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Conversión</p>
                <p className="text-2xl font-bold text-foreground">{metrics.conversionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notificaciones CRM */}
      <CRMNotifications />

      {/* Tabs de contenido */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline de Ventas</TabsTrigger>
          <TabsTrigger value="activities">Actividades</TabsTrigger>
          <TabsTrigger value="scoring">Lead Scoring</TabsTrigger>
          <TabsTrigger value="analytics">Análisis</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Buscar por nombre o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Button
                  variant="outline"
                  onClick={() => setShowCustomTable(!showCustomTable)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {showCustomTable ? 'Vista Estándar' : 'Vista Personalizable'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabla de Clientes */}
          <Card>
            <CardHeader>
              <CardTitle>Pipeline de Clientes ({filteredClients.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Proyecto</TableHead>
                    <TableHead>Estado</TableHead>
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
                          <p className="font-medium">{projectTypeConfig[client.project_type || 'other']}</p>
                          <p className="text-sm text-muted-foreground">{client.timeline_months} meses</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={client.status}
                          onValueChange={(value) => updateClientStatus(client.id, value as Client['status'])}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusConfig).map(([key, config]) => (
                              <SelectItem key={key} value={key}>{config.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedClient(client)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities">
          {selectedClient && (
            <CRMActivityTimeline 
              clientId={selectedClient.id}
            />
          )}
          {!selectedClient && (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">Selecciona un cliente para ver sus actividades</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="scoring">
          {selectedClient && (
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
            />
          )}
          {!selectedClient && (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">Selecciona un cliente para ver su scoring</p>
              </CardContent>
            </Card>
          )}
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
    </div>
  );
}