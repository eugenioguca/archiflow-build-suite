import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SmartCRM } from "@/components/SmartCRM";
import { ClientProjectManager } from "@/components/ClientProjectManager";
import { RequiredDocumentsManager } from "@/components/RequiredDocumentsManager";
import { PaymentPlanBuilder } from "@/components/PaymentPlanBuilder";
import { PaymentPlansUnified } from "@/components/PaymentPlansUnified";
import { PaymentStatusIndicator } from "@/components/PaymentStatusIndicator";
import { SalesDesignCalendar } from "@/components/SalesDesignCalendar";
import { SalesExecutiveDashboard } from "@/components/SalesExecutiveDashboard";
import { ContractTemplateManager } from "@/components/ContractTemplateManager";
import { SalesAppointmentScheduler } from "@/components/SalesAppointmentScheduler";
import { TeamClientChat } from "@/components/TeamClientChat";
import { ModuleNotifications } from "@/components/ModuleNotifications";
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
  BarChart3,
  MoveRight,
  XCircle,
  Crown,
  Briefcase,
  Plus,
  Building,
  Home,
  MapPin,
  Euro
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Interfaces
interface ClientProject {
  id: string;
  client_id: string;
  project_name: string;
  project_description?: string;
  budget?: number;
  sales_pipeline_stage: 'nuevo_lead' | 'en_contacto' | 'lead_perdido' | 'cliente_cerrado';
  assigned_advisor_id?: string;
  last_contact_date?: string;
  next_contact_date?: string;
  probability_percentage?: number;
  service_type?: string;
  curp?: string;
  constancia_situacion_fiscal_uploaded?: boolean;
  constancia_situacion_fiscal_url?: string;
  created_at: string;
  updated_at: string;
  // Datos del cliente relacionado
  clients?: {
    id: string;
    full_name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  // Datos del asesor asignado
  assigned_advisor?: {
    id: string;
    full_name: string;
  };
}

const statusConfig = {
  nuevo_lead: { label: "Nuevo Lead", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300", progress: 5, icon: Clock },
  en_contacto: { label: "En Contacto", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300", progress: 50, icon: Users },
  lead_perdido: { label: "Lead Perdido", color: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300", progress: 0, icon: XCircle },
  cliente_cerrado: { label: "Cliente Cerrado", color: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300", progress: 100, icon: CheckCircle },
};

export default function Sales() {
  const [clientProjects, setClientProjects] = useState<ClientProject[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ClientProject[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [advisorFilter, setAdvisorFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<ClientProject | null>(null);
  const [activeTab, setActiveTab] = useState("list");
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
    fetchEmployees();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [clientProjects, searchTerm, statusFilter, advisorFilter]);

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
      const { data, error } = await supabase
        .from('client_projects')
        .select(`
          *,
          clients!client_projects_client_id_fkey (
            id,
            full_name,
            email,
            phone,
            address
          ),
          assigned_advisor:profiles!client_projects_assigned_advisor_id_fkey (
            id,
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClientProjects(data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del CRM",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterProjects = () => {
    let filtered = clientProjects;

    // Filtro por fase
    if (statusFilter !== 'all') {
      filtered = filtered.filter(project => project.sales_pipeline_stage === statusFilter);
    }

    // Filtro por asesor
    if (advisorFilter !== 'all') {
      filtered = filtered.filter(project => project.assigned_advisor_id === advisorFilter);
    }

    // Filtro por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.clients?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.clients?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.clients?.phone?.includes(searchTerm) ||
        project.project_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredProjects(filtered);
  };

  const updateProjectStage = async (projectId: string, newStage: ClientProject['sales_pipeline_stage']) => {
    try {
      const { error } = await supabase
        .from('client_projects')
        .update({ 
          sales_pipeline_stage: newStage,
          last_contact_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', projectId);

      if (error) throw error;

      await fetchData();

      toast({
        title: "Fase actualizada",
        description: `El proyecto se movió a ${statusConfig[newStage].label}`,
      });
    } catch (error) {
      console.error('Error updating stage:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la fase",
        variant: "destructive",
      });
    }
  };

  const assignAdvisor = async (projectId: string, advisorId: string | null) => {
    try {
      const { error } = await supabase
        .from('client_projects')
        .update({ 
          assigned_advisor_id: advisorId,
        })
        .eq('id', projectId);

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getPhaseStats = (phase: string) => {
    return clientProjects.filter(project => project.sales_pipeline_stage === phase).length;
  };

  const getProjectsByPhase = (phase: string) => {
    return filteredProjects.filter(project => project.sales_pipeline_stage === phase);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CRM - Pipeline de Ventas</h1>
          <p className="text-muted-foreground">Gestión completa del pipeline con 4 fases estratégicas</p>
        </div>
        <div className="flex items-center gap-2">
          <ModuleNotifications module="sales" />
          <Badge variant="outline" className="text-sm">
            {clientProjects.length} Proyectos Activos
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <Search className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Métricas por fase */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(statusConfig).map(([phase, config]) => {
          const Icon = config.icon;
          const count = getPhaseStats(phase);
          
          return (
            <Card key={phase} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{config.label}</p>
                    <p className="text-2xl font-bold">{count}</p>
                    <div className="flex items-center mt-2">
                      <Progress value={config.progress} className="w-16 h-2" />
                      <span className="text-xs text-muted-foreground ml-2">{config.progress}%</span>
                    </div>
                  </div>
                  <Icon className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filtros principales */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1 w-full relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, proyecto, email o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por fase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las fases</SelectItem>
                {Object.entries(statusConfig).map(([phase, config]) => (
                  <SelectItem key={phase} value={phase}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={advisorFilter} onValueChange={setAdvisorFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por asesor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los asesores</SelectItem>
                <SelectItem value="unassigned">Sin asignar</SelectItem>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs principales */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="list">Smart View</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline Kanban</TabsTrigger>
          <TabsTrigger value="payment-status">Estado Pagos</TabsTrigger>
          <TabsTrigger value="calendar">Calendario</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="contracts">Contratos</TabsTrigger>
          <TabsTrigger value="chat">Chat Cliente</TabsTrigger>
        </TabsList>

        {/* Pipeline Kanban */}
        <TabsContent value="pipeline">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {Object.entries(statusConfig).map(([phase, config]) => {
              const projects = getProjectsByPhase(phase);
              const Icon = config.icon;
              
              return (
                <div key={phase} className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      <h3 className="font-semibold">{config.label}</h3>
                    </div>
                    <Badge variant="secondary">{projects.length}</Badge>
                  </div>
                  
                  <div className="space-y-3 min-h-[400px]">
                    {projects.map((project) => (
                      <Card key={project.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">
                                {project.clients?.full_name}
                              </h4>
                              <p className="text-xs text-muted-foreground truncate">
                                {project.project_name}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedProject(project)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {project.assigned_advisor?.full_name || 'Sin asesor'}
                            </span>
                            {project.budget && (
                              <span className="font-medium">
                                ${project.budget.toLocaleString()}
                              </span>
                            )}
                          </div>
                          
                          {/* Indicadores de progreso */}
                          {project.sales_pipeline_stage !== 'nuevo_lead' && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  Docs
                                </span>
                                <div className="flex items-center gap-1">
                                  {project.curp && <div className="w-2 h-2 bg-green-500 rounded-full" />}
                                  {project.constancia_situacion_fiscal_uploaded && <div className="w-2 h-2 bg-green-500 rounded-full" />}
                                  {(!project.curp || !project.constancia_situacion_fiscal_uploaded) && (
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                                  )}
                                </div>
                              </div>
                              {['en_contacto', 'cliente_cerrado'].includes(project.sales_pipeline_stage) && (
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    Plan
                                  </span>
                                  <PaymentStatusIndicator 
                                    clientProjectId={project.id}
                                    size="sm"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Indicador de estado de pagos */}
                          {['en_contacto', 'cliente_cerrado'].includes(project.sales_pipeline_stage) && (
                            <div className="space-y-1">
                              <div className="text-xs text-muted-foreground mb-1">Estado de Pagos</div>
                              <PaymentStatusIndicator 
                                clientProjectId={project.id}
                                size="sm"
                              />
                            </div>
                          )}
                          
                          <div className="flex items-center gap-1">
                            <Select 
                              value={project.assigned_advisor_id || "unassigned"} 
                              onValueChange={(value) => assignAdvisor(project.id, value === "unassigned" ? null : value)}
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue placeholder="Asignar" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">Sin asignar</SelectItem>
                                {employees.map((employee) => (
                                  <SelectItem key={employee.id} value={employee.id}>
                                    {employee.full_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            {phase !== 'nuevo_lead' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const phases = Object.keys(statusConfig);
                                  const currentIndex = phases.indexOf(phase);
                                  const prevPhase = phases[Math.max(0, currentIndex - 1)];
                                  updateProjectStage(project.id, prevPhase as ClientProject['sales_pipeline_stage']);
                                }}
                                className="text-xs"
                              >
                                ← Anterior
                              </Button>
                            )}
                            
                            {phase !== 'cliente_cerrado' && phase !== 'lead_perdido' && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  const phases = Object.keys(statusConfig).filter(p => p !== 'lead_perdido');
                                  const currentIndex = phases.indexOf(phase);
                                  const nextPhase = phases[Math.min(phases.length - 1, currentIndex + 1)];
                                  updateProjectStage(project.id, nextPhase as ClientProject['sales_pipeline_stage']);
                                }}
                                className="text-xs ml-auto"
                              >
                                Siguiente →
                              </Button>
                            )}
                            
                            {(phase === 'nuevo_lead' || phase === 'en_contacto') && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => updateProjectStage(project.id, 'lead_perdido')}
                                className="text-xs"
                              >
                                Perdido
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                    
                    {projects.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        <Icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No hay proyectos en esta fase</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Vista Lista */}
        <TabsContent value="list">
          <div className="space-y-4">
            {filteredProjects.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium">No hay proyectos</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || statusFilter !== 'all' || advisorFilter !== 'all'
                      ? 'No se encontraron proyectos con los filtros aplicados'
                      : 'Los nuevos proyectos aparecerán aquí'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredProjects.map((project) => (
                <Card key={project.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{project.clients?.full_name}</h3>
                          <Badge className={statusConfig[project.sales_pipeline_stage].color}>
                            {statusConfig[project.sales_pipeline_stage].label}
                          </Badge>
                          {!project.assigned_advisor_id && (
                            <Badge variant="outline" className="text-orange-600">
                              Sin asesor asignado
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Proyecto</p>
                            <p className="font-medium">{project.project_name}</p>
                            <p className="text-sm text-muted-foreground">{project.service_type}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Contacto</p>
                            <div className="space-y-1">
                              <p className="text-sm font-medium">{project.clients?.phone}</p>
                              <p className="text-xs text-muted-foreground break-all leading-tight">
                                {project.clients?.email}
                              </p>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Asesor</p>
                            <p className="font-medium">
                              {project.assigned_advisor?.full_name || 'Sin asignar'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Presupuesto</p>
                            <p className="font-medium">
                              {project.budget ? `$${project.budget.toLocaleString()}` : 'No definido'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Prob: {project.probability_percentage || 0}%
                            </p>
                          </div>
                        </div>

                        {project.project_description && (
                          <div className="mb-4">
                            <p className="text-sm text-muted-foreground">Descripción</p>
                            <p className="text-sm">{project.project_description}</p>
                          </div>
                        )}
                      </div>

                          <div className="flex gap-2 ml-4">
                        <SalesAppointmentScheduler 
                          clientProject={{
                            id: project.id,
                            client_id: project.client_id,
                            project_name: project.project_name,
                            client: { full_name: project.clients?.full_name || '' }
                          }}
                          triggerButton={
                            <Button variant="outline" size="sm">
                              <CalendarLucide className="h-4 w-4 mr-2" />
                              Programar Cita
                            </Button>
                          }
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedProject(project)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver CRM
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Estado de Pagos - Nueva pestaña */}
        <TabsContent value="payment-status">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Estado de Planes de Pago
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Vista unificada del estado de pagos por cliente/proyecto (solo lectura para ventas)
              </p>
            </CardHeader>
            <CardContent>
              <PaymentPlansUnified 
                mode="sales"
                selectedClientId={advisorFilter !== 'all' ? advisorFilter : undefined}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendario de Diseño */}
        <TabsContent value="calendar">
          <SalesDesignCalendar showNotifications={true} />
        </TabsContent>

        {/* Dashboard Ejecutivo */}
        <TabsContent value="dashboard">
          <SalesExecutiveDashboard />
        </TabsContent>

        {/* Gestión de Contratos */}
        <TabsContent value="contracts">
          <ContractTemplateManager />
        </TabsContent>

        {/* Chat Cliente */}
        <TabsContent value="chat">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Chat con Clientes por Proyecto
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Selecciona un proyecto específico en la vista detallada para acceder al chat con el cliente.
              </p>
            </CardHeader>
            <CardContent className="p-8 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium">Chat específico por proyecto</h3>
              <p className="text-muted-foreground">
                Haz clic en "Ver CRM" de cualquier proyecto para acceder al chat del cliente de ese proyecto específico.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog CRM completo */}
      <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="max-w-[95vw] lg:max-w-7xl max-h-[90vh] h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-6 w-6 text-primary" />
              CRM Completo - {selectedProject?.clients?.full_name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedProject && (
            <Tabs defaultValue="crm" className="w-full flex flex-col flex-1 overflow-hidden">
              <TabsList className="grid grid-cols-5 w-full flex-shrink-0 mx-6">
                <TabsTrigger value="crm">CRM & Información</TabsTrigger>
                <TabsTrigger 
                  value="documents" 
                  disabled={selectedProject.sales_pipeline_stage === 'nuevo_lead'}
                  className={selectedProject.sales_pipeline_stage === 'nuevo_lead' ? 'opacity-50' : ''}
                >
                  Documentos Requeridos
                </TabsTrigger>
                <TabsTrigger 
                  value="payments"
                  disabled={!['en_contacto', 'cliente_cerrado'].includes(selectedProject.sales_pipeline_stage)}
                  className={!['en_contacto', 'cliente_cerrado'].includes(selectedProject.sales_pipeline_stage) ? 'opacity-50' : ''}
                >
                  Plan de Pagos
                </TabsTrigger>
                <TabsTrigger value="projects">Gestión de Proyectos</TabsTrigger>
                <TabsTrigger value="chat">Chat Cliente</TabsTrigger>
              </TabsList>

              <TabsContent value="crm" className="space-y-6 px-6 pb-6 overflow-y-auto flex-1">
                {/* Información básica y SmartCRM */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Briefcase className="h-5 w-5" />
                        Información del Proyecto
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Cliente</p>
                          <p className="font-medium">{selectedProject.clients?.full_name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Proyecto</p>
                          <p className="font-medium">{selectedProject.project_name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Fase Actual</p>
                          <Badge className={statusConfig[selectedProject.sales_pipeline_stage].color}>
                            {statusConfig[selectedProject.sales_pipeline_stage].label}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Asesor</p>
                          <p className="font-medium">
                            {selectedProject.assigned_advisor?.full_name || 'Sin asignar'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Presupuesto</p>
                          <p className="font-medium">
                            {selectedProject.budget ? `$${selectedProject.budget.toLocaleString()}` : 'No definido'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Probabilidad</p>
                          <div className="flex items-center gap-2">
                            <Progress value={selectedProject.probability_percentage || 0} className="flex-1" />
                            <span className="text-sm">{selectedProject.probability_percentage || 0}%</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm text-muted-foreground">Contacto</p>
                        <div className="flex items-center gap-4 mt-1">
                          <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            <span className="text-sm">{selectedProject.clients?.email}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            <span className="text-sm">{selectedProject.clients?.phone}</span>
                          </div>
                        </div>
                      </div>

                      {selectedProject.project_description && (
                        <div>
                          <p className="text-sm text-muted-foreground">Descripción</p>
                          <p className="text-sm">{selectedProject.project_description}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <SmartCRM
                    clientId={selectedProject.client_id}
                    clientName={selectedProject.clients?.full_name || ''}
                    lastContactDate={selectedProject.last_contact_date}
                    leadScore={selectedProject.probability_percentage || 0}
                    status={selectedProject.sales_pipeline_stage}
                    clientProject={{
                      id: selectedProject.id,
                      project_name: selectedProject.project_name
                    }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="documents" className="px-6 pb-6 overflow-y-auto flex-1">
                {selectedProject.sales_pipeline_stage !== 'nuevo_lead' ? (
                  <RequiredDocumentsManager
                    clientProjectId={selectedProject.id}
                    clientProject={selectedProject}
                    onDocumentUpdate={async () => {
                      // Refrescar datos
                      await fetchData();
                      
                      // Obtener los datos actualizados directamente de la base de datos
                      const { data: updatedProject } = await supabase
                        .from('client_projects')
                        .select(`
                          *,
                          clients!client_projects_client_id_fkey (
                            id,
                            full_name,
                            email,
                            phone,
                            address
                          ),
                          assigned_advisor:profiles!client_projects_assigned_advisor_id_fkey (
                            id,
                            full_name
                          )
                        `)
                        .eq('id', selectedProject.id)
                        .single();
                        
                      if (updatedProject) {
                        setSelectedProject(updatedProject);
                      }
                    }}
                  />
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-medium">Documentos no disponibles</h3>
                      <p className="text-muted-foreground">
                        Los documentos requeridos se activan cuando el cliente pasa a la fase "En Contacto"
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="payments" className="px-6 pb-6 overflow-y-auto flex-1">
                {['en_contacto', 'cliente_cerrado'].includes(selectedProject.sales_pipeline_stage) ? (
                  <div className="space-y-6">
                    {/* Plan Builder para crear/gestionar planes */}
                    <PaymentPlanBuilder
                      clientProjectId={selectedProject.id}
                      clientName={selectedProject.clients?.full_name || ''}
                      onPlanUpdate={() => fetchData()}
                    />
                    
                    {/* Vista unificada de estado de pagos */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          Estado Actual de Pagos
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <PaymentPlansUnified 
                          mode="sales"
                          selectedProjectId={selectedProject.id}
                        />
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-medium">Plan de pagos no disponible</h3>
                      <p className="text-muted-foreground">
                        El plan de pagos se activa cuando el cliente está en fase "En Contacto" o "Cliente Cerrado"
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="projects" className="px-6 pb-6 overflow-y-auto flex-1">
                <ClientProjectManager
                  clientId={selectedProject.client_id}
                  clientName={selectedProject.clients?.full_name || ''}
                  onProjectSelected={(projectId) => {
                    
                  }}
                />
              </TabsContent>

              <TabsContent value="chat" className="px-6 pb-6 overflow-y-auto flex-1">
                <TeamClientChat
                  projectId={selectedProject.id}
                  module="sales"
                  className="h-[600px]"
                />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}