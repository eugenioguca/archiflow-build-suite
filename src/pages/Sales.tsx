import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ClientNotesDialog } from "@/components/ClientNotesDialog";
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
  UserCheck
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Sales() {
  const [searchTerm, setSearchTerm] = useState("");
  const [clients, setClients] = useState<any[]>([]);
  const [closedClients, setClosedClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pipeline");
  const [notesDialog, setNotesDialog] = useState({ open: false, clientId: "", clientName: "" });
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch potential clients
      const { data: potentialClients, error: potentialError } = await supabase
        .from('clients')
        .select(`
          *,
          assigned_advisor: profiles!clients_assigned_advisor_id_fkey(id, full_name),
          created_by_profile: profiles!clients_profile_id_fkey(id, full_name)
        `)
        .eq('status', 'potential')
        .order('created_at', { ascending: false });

      if (potentialError) throw potentialError;

      // Fetch closed clients
      const { data: closedClientsData, error: closedError } = await supabase
        .from('clients')
        .select(`
          *,
          assigned_advisor: profiles!clients_assigned_advisor_id_fkey(id, full_name),
          created_by_profile: profiles!clients_profile_id_fkey(id, full_name)
        `)
        .in('status', ['active', 'completed'])
        .order('updated_at', { ascending: false });

      if (closedError) throw closedError;

      setClients(potentialClients || []);
      setClosedClients(closedClientsData || []);
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

  // Calculate metrics
  const totalPipelineValue = clients.reduce((sum, client) => sum + (client.budget || 0), 0);
  const potentialCount = clients.length;
  const closedCount = closedClients.length;
  const totalValue = totalPipelineValue + closedClients.reduce((sum, client) => sum + (client.budget || 0), 0);
  const conversionRate = (potentialCount + closedCount) > 0 ? Math.round((closedCount / (potentialCount + closedCount)) * 100) : 0;
  const averageValue = potentialCount > 0 ? Math.round(totalPipelineValue / potentialCount) : 0;

  // Closed clients metrics
  const closedRevenue = closedClients.reduce((sum, client) => sum + (client.budget || 0), 0);
  const closedAverageValue = closedCount > 0 ? Math.round(closedRevenue / closedCount) : 0;
  const averageClosingTime = 30; // Placeholder

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pipeline de Ventas</h1>
          <p className="text-muted-foreground">Gestión de clientes potenciales y métricas de conversión</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-background/60 backdrop-blur-xl border border-border/50">
          <TabsTrigger value="pipeline">Pipeline Potencial</TabsTrigger>
          <TabsTrigger value="closed">Clientes Cerrados</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-6">
        {/* Métricas del Pipeline */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50/80 to-white/60 backdrop-blur-xl border border-blue-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Pipeline Total</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl lg:text-2xl font-bold text-blue-900 break-words">
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
              <div className="text-xl lg:text-2xl font-bold text-green-900">{potentialCount}</div>
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
              <div className="text-xl lg:text-2xl font-bold text-orange-900">{conversionRate}%</div>
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
              <div className="text-lg lg:text-2xl font-bold text-purple-900 break-words">
                ${averageValue.toLocaleString('es-MX')}
              </div>
              <p className="text-xs text-purple-600 mt-1">
                Por oportunidad
              </p>
            </CardContent>
          </Card>
        </div>

          <div className="bg-background/60 backdrop-blur-xl border border-border/50 rounded-lg">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Pipeline de Clientes Potenciales ({clients.length})</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left p-3 font-medium">Cliente</th>
                      <th className="text-left p-3 font-medium">Proyecto</th>
                      <th className="text-left p-3 font-medium">Asesor</th>
                      <th className="text-left p-3 font-medium">Registrado por</th>
                      <th className="text-left p-3 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client) => (
                      <tr key={client.id} className="border-b border-border/30 hover:bg-muted/50">
                        <td className="p-3">
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">{client.full_name}</p>
                            <p className="text-sm text-muted-foreground">{client.email}</p>
                            <p className="text-xs text-muted-foreground">{client.phone}</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="space-y-1">
                            <p className="font-medium capitalize">{client.project_type || 'No especificado'}</p>
                            <p className="text-sm text-muted-foreground">
                              ${(client.budget || 0).toLocaleString('es-MX')}
                            </p>
                            <Badge variant={client.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                              {client.priority === 'high' ? 'Alta' : 
                               client.priority === 'medium' ? 'Media' : 'Baja'}
                            </Badge>
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
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {clients.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No hay clientes potenciales registrados
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="closed" className="space-y-6">
        {/* Métricas de Clientes Cerrados */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-emerald-50/80 to-white/60 backdrop-blur-xl border border-emerald-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700">Ingresos Generados</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg lg:text-2xl font-bold text-emerald-900 break-words">
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
              <div className="text-xl lg:text-2xl font-bold text-blue-900">{closedCount}</div>
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
              <div className="text-lg lg:text-2xl font-bold text-amber-900 break-words">
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
              <div className="text-xl lg:text-2xl font-bold text-indigo-900">
                {Math.round(averageClosingTime)} días
              </div>
              <p className="text-xs text-indigo-600 mt-1">
                Para cerrar venta
              </p>
            </CardContent>
          </Card>
        </div>

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
                          <span className="capitalize">{client.project_type || 'No especificado'}</span>
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
      </Tabs>

      <ClientNotesDialog
        open={notesDialog.open}
        onOpenChange={(open) => setNotesDialog(prev => ({ ...prev, open }))}
        clientId={notesDialog.clientId}
        clientName={notesDialog.clientName}
      />
    </div>
  );
}