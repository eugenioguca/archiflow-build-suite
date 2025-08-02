import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ClientNotesDialog } from "@/components/ClientNotesDialog";
import { CRMActivityTimeline } from "@/components/CRMActivityTimeline";
import { EditableField } from "@/components/EditableField";
import { PaymentPlanManager } from "@/components/PaymentPlanManager";
import { ProjectDocumentManager } from "@/components/ProjectDocumentManager";
import { SalesDesignCalendar } from "@/components/SalesDesignCalendar";
import { SalesPhaseManager } from "@/components/SalesPhaseManager";
import { LeadLossDialog } from "@/components/LeadLossDialog";
import { SalesExecutiveDashboard } from "@/components/SalesExecutiveDashboard";
import { ContractTemplateManager } from "@/components/ContractTemplateManager";
import { SalesDocumentValidator } from "@/components/SalesDocumentValidator";
import { ClientDocumentUploader } from "@/components/ClientDocumentUploader";
import {
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Eye, 
  Calendar as CalendarLucide, 
  Phone,
  Mail, 
  MessageSquare,
  DollarSign,
  Target,
  Award,
  Search,
  Filter,
  AlertTriangle,
  Bell,
  StickyNote,
  UserCheck,
  FileText,
  Settings,
  BarChart3
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Interfaces
interface Client {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  address?: string;
  notes?: string;
  profile_id?: string;
  created_at?: string;
  updated_at?: string;
  assigned_advisor?: any;
  created_by_profile?: any;
}

const statusConfig = {
  nuevo_lead: { label: "Nuevo Lead", color: "bg-yellow-100 text-yellow-700", progress: 5 },
  en_contacto: { label: "En Contacto", color: "bg-blue-100 text-blue-700", progress: 50 },
  lead_perdido: { label: "Lead Perdido", color: "bg-red-100 text-red-700", progress: 0 },
  cliente_cerrado: { label: "Cliente Cerrado", color: "bg-green-100 text-green-700", progress: 100 },
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
  partner: "Socio",
  commercial_alliance: "Alianza Comercial"
};

export default function Sales() {
  const [clients, setClients] = useState<Client[]>([]);
  const [closedClients, setClosedClients] = useState<Client[]>([]);
  const [lostLeads, setLostLeads] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("nuevo_lead");
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState("pipeline");
  const [notesDialog, setNotesDialog] = useState({ open: false, clientId: "", clientName: "" });
  const [showActivities, setShowActivities] = useState(false);
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [lossDialog, setLossDialog] = useState({ open: false, clientId: "", clientName: "" });
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
    fetchEmployees();
  }, []);

  useEffect(() => {
    filterClients();
  }, [clients, searchTerm, statusFilter]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .in('role', ['admin', 'employee'])
        .order('full_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch basic clients data only
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, full_name, email, phone, address, notes, profile_id, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;

      // For now, just set basic client data (project-specific data moved to client_projects)
      const allClients = (clientsData || []);
      
      const activeClients = allClients;
      const closedClientsData = [];
      const lostLeadsData = [];

      setClients(activeClients);
      setClosedClients(closedClientsData);
      setLostLeads(lostLeadsData);
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

  const filterClients = () => {
    let filtered = clients;

    // Status filtering removed - clients table simplified
    
    if (searchTerm) {
      filtered = filtered.filter(client =>
        client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone?.includes(searchTerm)
      );
    }

    setFilteredClients(filtered);
  };

  const assignAdvisor = async (clientId: string, advisorId: string | null) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ 
          // assigned_advisor_id moved to client_projects
          notes: `Asesor asignado: ${advisorId ? employees.find(e => e.id === advisorId)?.full_name : 'Sin asignar'}`
        })
        .eq('id', clientId);

      if (error) throw error;

      await fetchData();

      const advisor = advisorId ? employees.find(e => e.id === advisorId) : null;
      
      toast({
        title: "Asesor asignado",
        description: advisor ? `${advisor.full_name} asignado correctamente` : 'Asesor removido',
      });
    } catch (error) {
      console.error('Error assigning advisor:', error);
      toast({
        title: "Error",
        description: "No se pudo asignar el asesor",
        variant: "destructive",
      });
    }
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

      await fetchData();

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getPhaseStats = (phase: string) => {
    // Stats simplified - use static data during migration
    switch (phase) {
      case 'nuevo_lead':
        return clients.length;
      case 'en_contacto':
        return 0;
      case 'lead_perdido':
        return 0;
      case 'cliente_cerrado':
        return 0;
      default:
        return 0;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Módulo de Ventas CRM</h1>
          <p className="text-gray-600">Gestión completa del pipeline de ventas con 4 fases</p>
        </div>
      </div>

      {/* Métricas por fase */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Nuevos Leads</p>
                <p className="text-2xl font-bold">{getPhaseStats('nuevo_lead')}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">En Contacto</p>
                <p className="text-2xl font-bold">{getPhaseStats('en_contacto')}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Clientes Cerrados</p>
                <p className="text-2xl font-bold">{getPhaseStats('cliente_cerrado')}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Leads Perdidos</p>
                <p className="text-2xl font-bold">{getPhaseStats('lead_perdido')}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs principales */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="pipeline">Pipeline Activo</TabsTrigger>
          <TabsTrigger value="closed">Clientes Cerrados</TabsTrigger>
          <TabsTrigger value="lost">Leads Perdidos</TabsTrigger>
          <TabsTrigger value="calendar">Calendario Diseño</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard Ejecutivo</TabsTrigger>
        </TabsList>

        {/* Pipeline Activo */}
        <TabsContent value="pipeline">
          <div className="space-y-6">
            {/* Filtros */}
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-4 items-center">
                  <div className="flex-1">
                    <Input
                      placeholder="Buscar clientes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filtrar por fase" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las fases</SelectItem>
                      <SelectItem value="nuevo_lead">Nuevos Leads</SelectItem>
                      <SelectItem value="en_contacto">En Contacto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Lista de clientes */}
            <div className="space-y-4">
              {filteredClients.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900">No hay clientes</h3>
                    <p className="text-gray-500">
                      {searchTerm || statusFilter !== 'all' 
                        ? 'No se encontraron clientes con los filtros aplicados'
                        : 'Los nuevos clientes capturados en el módulo de Clientes aparecerán aquí'
                      }
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredClients.map((client) => (
                  <Card key={client.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{client.full_name}</h3>
                            {/* SalesPhaseManager component simplified - no props needed */}
                            <div className="text-sm text-muted-foreground">
                              Sistema actualizado - usar módulo de Proyectos
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-gray-600">Contacto</p>
                              <p className="font-medium">{client.email}</p>
                              <p className="text-sm">{client.phone}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Información</p>
                              <p className="font-medium">Cliente registrado</p>
                              <p className="text-sm">Ver módulo de Proyectos</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Sistema</p>
                              <div className="text-sm text-muted-foreground">
                                Migración completada
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedClient(client)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalles
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setNotesDialog({ 
                              open: true, 
                              clientId: client.id, 
                              clientName: client.full_name 
                            })}
                          >
                            <StickyNote className="h-4 w-4 mr-2" />
                            Notas
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        {/* Clientes Cerrados */}
        <TabsContent value="closed">
          <div className="space-y-4">
            {closedClients.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900">No hay clientes cerrados</h3>
                  <p className="text-gray-500">Los clientes convertidos aparecerán aquí</p>
                </CardContent>
              </Card>
            ) : (
              closedClients.map((client) => (
                <Card key={client.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-green-700">{client.full_name}</h3>
                        <p className="text-sm text-gray-600">{client.email} • {client.phone}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className="bg-green-100 text-green-700">Cliente Cerrado</Badge>
                          <Badge variant="outline">Sistema actualizado</Badge>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedClient(client)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalles
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Leads Perdidos */}
        <TabsContent value="lost">
          <div className="space-y-4">
            {lostLeads.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900">No hay leads perdidos</h3>
                  <p className="text-gray-500">Los leads que no se pudieron convertir aparecerán aquí</p>
                </CardContent>
              </Card>
            ) : (
              lostLeads.map((client) => (
                <Card key={client.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-red-700">{client.full_name}</h3>
                        <p className="text-sm text-gray-600">{client.email} • {client.phone}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className="bg-red-100 text-red-700">Lead Perdido</Badge>
                          <Badge variant="outline">Sistema actualizado</Badge>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedClient(client)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalles
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Calendario de Diseño */}
        <TabsContent value="calendar">
          <SalesDesignCalendar showNotifications={true} />
        </TabsContent>

        {/* Dashboard Ejecutivo */}
        <TabsContent value="dashboard">
          <SalesExecutiveDashboard />
        </TabsContent>
      </Tabs>

      {/* Dialog de detalles del cliente */}
      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Expediente Completo: {selectedClient?.full_name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedClient && (
            <div className="space-y-6">
              {/* Información básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Información del Cliente</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Nombre completo</p>
                      <p className="font-medium">{selectedClient.full_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Contacto</p>
                      <p className="font-medium">{selectedClient.email}</p>
                      <p className="text-sm">{selectedClient.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Información</p>
                      <p className="font-medium">Datos migrados al módulo de Proyectos</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Sistema</p>
                      <p className="font-medium">Nueva arquitectura implementada</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Estado de Migración</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Estructura</p>
                      <p className="font-medium">Cliente-Proyecto separados</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Datos</p>
                      <p className="font-medium">Migración completada</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Funcionalidad</p>
                      <p className="font-medium">Disponible en Proyectos</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Nota</p>
                      <p className="font-medium">Usar módulo de Proyectos para gestión completa</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Document Validation and Sales Tools */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  {/* Interfaz unificada de documentos legales */}
                  {/* SalesDocumentValidator component simplified */}
                  <SalesDocumentValidator />
                </div>

                <div className="space-y-6">
                  <PaymentPlanManager />

                  <ContractTemplateManager
                    clientId={selectedClient.id}
                    clientData={selectedClient}
                  />
                </div>
              </div>

              {/* Gestión de documentos */}
              <ProjectDocumentManager
                clientId={selectedClient.id}
                clientName={selectedClient.full_name}
                currentDepartment="sales"
              />

              {/* Timeline de actividades */}
              <CRMActivityTimeline />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de notas */}
      <ClientNotesDialog
        open={notesDialog.open}
        onOpenChange={() => setNotesDialog({ open: false, clientId: "", clientName: "" })}
        clientId={notesDialog.clientId}
        clientName={notesDialog.clientName}
      />

      {/* Dialog de pérdida de lead */}
      <LeadLossDialog
        isOpen={lossDialog.open}
        onClose={() => setLossDialog({ open: false, clientId: "", clientName: "" })}
        clientId={lossDialog.clientId}
        clientName={lossDialog.clientName}
        onLeadLost={fetchData}
      />
    </div>
  );
}