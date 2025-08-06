import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MobileDialog, MobileDialogContent, MobileDialogHeader, MobileDialogTitle } from '@/components/ui/mobile-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { 
  Building2, 
  Calendar, 
  DollarSign, 
  FileText, 
  Camera, 
  User,
  Phone,
  Mail,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageCircle,
  Home,
  Eye,
  Download,
  Maximize2,
  LogOut
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Import our new professional components
import { ProjectProgressCard } from '@/components/ProjectProgressCard';
import { PaymentHistoryPanel } from '@/components/PaymentHistoryPanel';
import { PaymentPlanViewer } from '@/components/PaymentPlanViewer';
import { PaymentPlansViewer } from '@/components/PaymentPlansViewer';
import { DocumentsPanel } from '@/components/DocumentsPanel';
import { ProgressPhotosCarousel } from '@/components/ProgressPhotosCarousel';
import { ClientPortalChat } from '@/components/ClientPortalChat';
import { SuperiorClientPortalChat } from '@/components/SuperiorClientPortalChat';
import { RealtimeNotificationSystem } from '@/components/RealtimeNotificationSystem';
import { ClientDocumentUploader } from '@/components/ClientDocumentUploader';
import { ClientFiscalDocuments } from '@/components/ClientFiscalDocuments';
import { DesignDocumentsViewer } from '@/components/DesignDocumentsViewer';
import { ClientProjectTimeline } from '@/components/ClientProjectTimeline';
import { ClientNotificationsPanel } from '@/components/ClientNotificationsPanel';
import { ClientProgressPhotosViewer } from '@/components/ClientProgressPhotosViewer';
import { ClientDocumentHub } from '@/components/ClientDocumentHub';
import { ClientInvoiceViewer } from '@/components/ClientInvoiceViewer';
import { ClientPaymentProofUploader } from '@/components/ClientPaymentProofUploader';
import ClientLayout from '@/components/ClientLayout';

interface ClientProject {
  id: string;
  project_name: string;
  project_description?: string | null;
  status: string;
  sales_pipeline_stage?: string;
  budget?: number | null;
  construction_budget?: number | null;
  overall_progress_percentage?: number | null;
  estimated_completion_date?: string | null;
  construction_start_date?: string | null;
  project_location?: string | null;
  service_type?: string | null;
  timeline_months?: number | null;
  client_id: string;
}

interface ProjectPhase {
  id: string;
  phase_name: string;
  status: string;
  estimated_completion_date?: string | null;
  actual_completion_date?: string | null;
  phase_order: number;
}

interface Payment {
  id: string;
  amount_paid: number;
  payment_date: string;
  payment_method?: string | null;
  reference_number?: string | null;
  notes?: string | null;
  status?: string;
}

interface ProjectDocument {
  id: string;
  name: string;
  file_path: string;
  file_type?: string | null;
  file_size?: number | null;
  description?: string | null;
  created_at: string;
  uploader_name?: string | null;
  category?: string;
}

interface ProgressPhoto {
  id: string;
  photo_url: string;
  description?: string | null;
  phase_name?: string | null;
  created_at: string;
  photographer_name?: string | null;
}

const ClientPortal: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [clientName, setClientName] = useState<string>('');
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [project, setProject] = useState<ClientProject | null>(null);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatExpanded, setChatExpanded] = useState(false);

  useEffect(() => {
    if (user) {
      fetchClientProjects();
    }
  }, [user]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectData(selectedProjectId);
    }
  }, [selectedProjectId]);

  const fetchClientProjects = async () => {
    if (!user) return;

    try {
      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      // Get client data
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id, full_name, email, phone, address')
        .eq('profile_id', profileData.id)
        .single();

      if (clientError) throw clientError;
      setClientName(clientData.full_name);

      // Get all client projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('client_projects')
        .select('*')
        .eq('client_id', clientData.id)
        .order('project_name', { ascending: true });

      if (projectsError) throw projectsError;
      
      setProjects(projectsData || []);
      
      // Auto-select first project if available
      if (projectsData && projectsData.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projectsData[0].id);
      }

    } catch (error) {
      console.error('Error fetching client projects:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los proyectos del cliente"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectData = async (projectId: string) => {
    if (!user || !projectId) return;

    try {
      // Get selected project data
      const selectedProj = projects.find(p => p.id === projectId);
      if (!selectedProj) return;
      
      setProject(selectedProj);

      // Get user profile and client data for queries
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profileData) return;

      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('profile_id', profileData.id)
        .single();

      if (!clientData) return;

      // Get project phases
      const { data: phasesData } = await supabase
        .from('design_phases')
        .select('*')
        .eq('project_id', projectId)
        .order('phase_order', { ascending: true });
      
      setPhases(phasesData || []);

      // Get payments for this project specifically
      const { data: paymentsData } = await supabase
        .from('client_payments')
        .select('*')
        .eq('client_id', clientData.id)
        .order('payment_date', { ascending: false });

      if (paymentsData) {
        setPayments(paymentsData.map(payment => ({
          ...payment,
          status: 'paid'
        })));
      }

      // Get documents for this project
      const { data: documentsData } = await supabase
        .from('documents')
        .select(`
          id,
          name,
          file_path,
          file_type,
          file_size,
          description,
          created_at,
          uploaded_by
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (documentsData) {
        const processedDocs = documentsData.map(doc => ({
          ...doc,
          uploader_name: 'Sistema',
          category: 'general'
        }));
        setDocuments(processedDocs);
      }

      // Skip progress photos for now
      setPhotos([]);

    } catch (error) {
      console.error('Error fetching project data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los datos del proyecto"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      planning: { label: 'Planeación', variant: 'secondary' as const, icon: Clock },
      construction: { label: 'Construcción', variant: 'default' as const, icon: Building2 },
      completed: { label: 'Completado', variant: 'default' as const, icon: CheckCircle },
      paused: { label: 'Pausado', variant: 'destructive' as const, icon: AlertCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      variant: 'outline' as const,
      icon: Clock
    };

    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount || amount === 0) return '$0.00 MXN';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (projects.length === 0 && !loading) {
    return (
      <div className="container mx-auto py-8">
        {/* Emergency Logout Button */}
        <div className="flex justify-end mb-4">
          <Button 
            variant="outline" 
            onClick={() => {
              supabase.auth.signOut();
              window.location.href = '/auth';
            }}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
        
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">No hay proyectos asignados</h2>
            <p className="text-muted-foreground">
              Actualmente no tienes proyectos asignados. Contacta con el administrador.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!selectedProjectId || !project) {
    return (
      <div className="container mx-auto py-8">
        {/* Emergency Logout Button */}
        <div className="flex justify-end mb-4">
          <Button 
            variant="outline" 
            onClick={() => {
              supabase.auth.signOut();
              window.location.href = '/auth';
            }}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
        
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Selecciona un proyecto</h2>
            <p className="text-muted-foreground">
              Selecciona un proyecto desde el selector en la parte superior para ver su información.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ClientLayout
      clientName={clientName}
      projects={projects}
      selectedProjectId={selectedProjectId}
      onProjectChange={setSelectedProjectId}
    >
      {/* Emergency Logout Button */}
      <div className="flex justify-end mb-4">
        <Button 
          variant="outline" 
          onClick={() => {
            supabase.auth.signOut();
            window.location.href = '/auth';
          }}
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
      
      {/* Header del Proyecto */}
      <div className={`bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg ${isMobile ? 'p-4' : 'p-6'}`}>
        <div className={`${isMobile ? 'space-y-4' : 'flex items-start justify-between'}`}>
          <div className="space-y-2">
            <h1 className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold`}>{project.project_name}</h1>
            <p className={`${isMobile ? 'text-sm' : 'text-lg'} text-muted-foreground`}>{project.project_description}</p>
            <div className={`${isMobile ? 'flex flex-col gap-2' : 'flex items-center gap-4'} mt-4`}>
              {getStatusBadge(project.status)}
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className={isMobile ? 'truncate' : ''}>{project.project_location || 'Ubicación no especificada'}</span>
              </div>
            </div>
          </div>
          <div className={`${isMobile ? 'border-t pt-4' : 'text-right'}`}>
            <div className={`${isMobile ? 'flex items-center justify-between' : 'text-right'}`}>
              <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-primary`}>
                {project.overall_progress_percentage || 0}%
              </div>
              <div className={`text-sm text-muted-foreground ${isMobile ? 'order-first' : ''}`}>Progreso</div>
            </div>
            <Progress value={project.overall_progress_percentage || 0} className={`${isMobile ? 'w-full mt-2' : 'w-32 mt-2'}`} />
          </div>
        </div>
      </div>

      {/* Información General */}
      <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-1 md:grid-cols-3 gap-6'}`}>
        <Card>
          <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${isMobile ? 'pb-2 px-4 pt-4' : 'pb-3'}`}>
            <CardTitle className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>Presupuesto Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className={isMobile ? 'px-4 pb-4' : undefined}>
            <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold`}>{formatCurrency(project.budget)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${isMobile ? 'pb-2 px-4 pt-4' : 'pb-3'}`}>
            <CardTitle className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>Fecha de Inicio</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className={isMobile ? 'px-4 pb-4' : undefined}>
            <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold`}>
              {project.construction_start_date ? 
                format(new Date(project.construction_start_date), 'dd MMM yyyy', { locale: es }) :
                'No definida'
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${isMobile ? 'pb-2 px-4 pt-4' : 'pb-3'}`}>
            <CardTitle className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>Finalización Estimada</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className={isMobile ? 'px-4 pb-4' : undefined}>
            <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold`}>
              {project.estimated_completion_date ? 
                format(new Date(project.estimated_completion_date), 'dd MMM yyyy', { locale: es }) :
                'No definida'
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs con información detallada */}
      <Tabs defaultValue="resumen" className="space-y-6">
        {isMobile ? (
          <ScrollArea className="w-full">
            <TabsList className="flex w-max p-1 h-auto">
              <TabsTrigger value="resumen" className="flex items-center gap-2 px-4 py-2">
                <Home className="h-4 w-4" />
                <span>Resumen</span>
              </TabsTrigger>
              <TabsTrigger value="pagos" className="flex items-center gap-2 px-4 py-2">
                <DollarSign className="h-4 w-4" />
                <span>Pagos</span>
              </TabsTrigger>
              <TabsTrigger value="documentos" className="flex items-center gap-2 px-4 py-2">
                <FileText className="h-4 w-4" />
                <span>Documentos</span>
              </TabsTrigger>
              <TabsTrigger value="fotos" className="flex items-center gap-2 px-4 py-2">
                <Camera className="h-4 w-4" />
                <span>Fotos</span>
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex items-center gap-2 px-4 py-2">
                <MessageCircle className="h-4 w-4" />
                <span>Chat</span>
              </TabsTrigger>
            </TabsList>
          </ScrollArea>
        ) : (
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="resumen" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Resumen
            </TabsTrigger>
            <TabsTrigger value="pagos" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Pagos
            </TabsTrigger>
            <TabsTrigger value="documentos" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documentos
            </TabsTrigger>
            <TabsTrigger value="fotos" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Fotos de Avance
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Chat
            </TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="resumen" className="space-y-6">
          {/* Timeline del proyecto y notificaciones */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PaymentPlansViewer 
              projectId={selectedProjectId} 
              clientId={project.client_id}
            />
            <ClientProjectTimeline 
              projectId={selectedProjectId} 
              projectStatus={project.status}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ClientNotificationsPanel 
              clientId={project.client_id} 
              projectId={selectedProjectId}
            />
            <DesignDocumentsViewer 
              projectId={selectedProjectId}
              clientId={project.client_id}
            />
          </div>

          <div className="space-y-6">
            <ClientProgressPhotosViewer projectId={selectedProjectId} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ClientDocumentHub 
              clientId={project.client_id} 
              projectId={selectedProjectId}
              compact={isMobile}
            />
            <SuperiorClientPortalChat
              clientId={project.client_id}
              projectId={selectedProjectId}
            />
          </div>
          
          {/* Información adicional */}
          <div className={`${isMobile ? 'space-y-6' : 'grid grid-cols-1 lg:grid-cols-2 gap-6'}`}>
            <PaymentHistoryPanel payments={payments} compact={isMobile} />
            <Card>
              <CardHeader className={isMobile ? 'p-4' : undefined}>
                <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : ''}`}>
                  <Clock className="h-5 w-5" />
                  Fases del Proyecto
                </CardTitle>
              </CardHeader>
              <CardContent className={isMobile ? 'p-4 pt-0' : undefined}>
                <div className={`space-y-3 ${isMobile ? 'space-y-2' : ''}`}>
                  {phases.length === 0 ? (
                    <div className={`text-center py-6 text-muted-foreground ${isMobile ? 'py-4' : ''}`}>
                      <Clock className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} mx-auto mb-2 text-muted-foreground/50`} />
                      <p className={`font-medium ${isMobile ? 'text-sm' : ''}`}>Fases del proyecto</p>
                      <p className={`text-sm ${isMobile ? 'text-xs' : ''}`}>Las fases se mostrarán aquí cuando sean definidas por el equipo</p>
                    </div>
                  ) : (
                    phases.slice(0, 4).map((phase) => (
                      <div key={phase.id} className={`${isMobile ? 'flex flex-col space-y-2 p-3' : 'flex items-center justify-between p-3'} border rounded-lg`}>
                        <div className={isMobile ? 'flex-1' : ''}>
                          <p className={`font-medium ${isMobile ? 'text-sm' : ''}`}>{phase.phase_name}</p>
                          <p className={`text-sm text-muted-foreground ${isMobile ? 'text-xs' : ''}`}>
                            Orden: {phase.phase_order}
                          </p>
                        </div>
                        <Badge 
                          variant={phase.status === 'completed' ? 'default' : 'secondary'}
                          className={isMobile ? 'self-start' : ''}
                        >
                          {phase.status === 'completed' ? 'Completada' : 
                           phase.status === 'in_progress' ? 'En progreso' : 'Pendiente'}
                        </Badge>
                      </div>
                    ))
                  )}
                  {phases.length > 4 && (
                    <p className={`text-sm text-muted-foreground text-center ${isMobile ? 'text-xs' : ''}`}>
                      Y {phases.length - 4} fases más...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pagos" className="space-y-6">
          {/* Multiple Payment Plans with Clickable Details */}
          <PaymentPlansViewer 
            projectId={selectedProjectId}
            clientId={project.client_id}
          />
          <PaymentHistoryPanel payments={payments} compact={isMobile} />
        </TabsContent>

        <TabsContent value="documentos" className="space-y-6">
          {/* Unified Document Hub - Contains all document types */}
          <ClientDocumentHub
            clientId={project.client_id}
            projectId={project.id}
            compact={false}
          />
        </TabsContent>

        <TabsContent value="fotos">
          <ProgressPhotosCarousel 
            photos={photos}
            onPhotoDownload={async (photo) => {
              try {
                const { data } = await supabase.storage
                  .from('progress-photos')
                  .download(photo.photo_url);
                
                if (data) {
                  const url = URL.createObjectURL(data);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `foto-progreso-${photo.id}.jpg`;
                  link.click();
                  URL.revokeObjectURL(url);
                } else {
                  toast({
                    variant: "destructive",
                    title: "Error",
                    description: "No se pudo descargar la foto"
                  });
                }
              } catch (error) {
                toast({
                  variant: "destructive",
                  title: "Error",
                  description: "La foto no está disponible para descarga"
                });
              }
            }}
          />
        </TabsContent>

        <TabsContent value="chat">
          {isMobile ? (
            <>
              <div className="flex justify-end mb-4">
                <Button
                  onClick={() => setChatExpanded(true)}
                  variant="outline"
                  className="gap-2"
                >
                  <Maximize2 className="h-4 w-4" />
                  Expandir Chat
                </Button>
              </div>
              <div className="h-[400px]">
                <SuperiorClientPortalChat 
                  projectId={project.id}
                  clientId={project.client_id}
                />
              </div>
              
              <MobileDialog open={chatExpanded} onOpenChange={setChatExpanded}>
                <MobileDialogContent className="h-[90vh] flex flex-col p-0">
                  <MobileDialogHeader className="p-4 border-b">
                    <MobileDialogTitle>Chat del Proyecto</MobileDialogTitle>
                  </MobileDialogHeader>
                  <div className="flex-1 overflow-hidden">
                    <SuperiorClientPortalChat 
                      projectId={project.id}
                      clientId={project.client_id}
                    />
                  </div>
                </MobileDialogContent>
              </MobileDialog>
            </>
          ) : (
            <SuperiorClientPortalChat 
              projectId={project.id}
              clientId={project.client_id}
            />
          )}
        </TabsContent>
      </Tabs>
    </ClientLayout>
  );
};

export default ClientPortal;