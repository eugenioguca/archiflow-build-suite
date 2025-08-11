import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { usePaymentPlans } from '@/hooks/usePaymentPlans';
import { usePaymentInstallments } from '@/hooks/usePaymentInstallments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  FileText, 
  Camera, 
  MessageCircle, 
  Home,
  Settings,
  Bell,
  User,
  TrendingUp,
  Building2,
  MapPin,
  Phone,
  Mail,
  ChevronRight,
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  Timer,
  Construction,
  Calculator,
  Hammer,
  Palette,
  LogOut
} from 'lucide-react';
import { format, differenceInDays, isAfter, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import dovitaLogo from '@/assets/dovita-logo.png';
import { ClientDocumentHub } from './ClientDocumentHub';
import { downloadDocument } from '@/lib/documentUtils';
import { ProgressPhotosCarousel } from './ProgressPhotosCarousel';
import { SuperiorClientPortalChat } from './SuperiorClientPortalChat';
import { ClientProjectCalendarViewer } from './ClientProjectCalendarViewer';

import { PaymentPlanManager } from './PaymentPlanManager';

interface ClientProject {
  id: string;
  client_id: string;
  project_name: string;
  status: string;
  budget: number;
  construction_budget: number;
  overall_progress_percentage: number;
  construction_start_date: string | null;
  estimated_completion_date: string | null;
  actual_completion_date: string | null;
  project_description: string;
  construction_area: number;
  land_square_meters: number;
  service_type: string;
}

interface ClientPortalModernProps {
  isPreview?: boolean;
  previewData?: {
    project: ClientProject;
    paymentPlans: any[];
    documents: any[];
    progressPhotos: any[];
  };
}

const ClientPortalModern: React.FC<ClientPortalModernProps> = ({ 
  isPreview = false, 
  previewData 
}) => {
  const { user } = useAuth();
  const [clientProjects, setClientProjects] = useState<ClientProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<ClientProject | null>(null);
  const [clientName, setClientName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('calendar');
  const [paidAmount, setPaidAmount] = useState(0);
  const [progressPhotos, setProgressPhotos] = useState([]);

  useEffect(() => {
    if (isPreview && previewData) {
      // Use preview data
      setClientProjects([previewData.project]);
      setSelectedProject(previewData.project);
      setProgressPhotos(previewData.progressPhotos || []);
      setLoading(false);
      // Fetch paid amount for preview
      if (previewData.project.id) {
        fetchPaidAmount(previewData.project.id);
      }
    } else if (user && !isPreview) {
      fetchClientProjects();
    }
  }, [user, isPreview, previewData]);

  useEffect(() => {
    if (selectedProject && !isPreview) {
      fetchProjectDetails(selectedProject.id);
      fetchProgressPhotos(selectedProject.id);
    }
  }, [selectedProject, isPreview]);

  const fetchClientProjects = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) return;

      const { data: client } = await supabase
        .from('clients')
        .select('id, full_name')
        .eq('profile_id', profile.id)
        .single();

      if (!client) return;
      setClientName(client.full_name);

      const { data: projects } = await supabase
        .from('client_projects')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (projects && projects.length > 0) {
        setClientProjects(projects);
        setSelectedProject(projects[0]);
        // Fetch paid amount for the first project
        fetchPaidAmount(projects[0].id);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Error al cargar los proyectos');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectDetails = async (projectId: string) => {
    // Simplified for demo - just sets empty arrays
    console.log('Fetching details for project:', projectId);
  };

  const fetchProgressPhotos = async (projectId: string) => {
    try {
      const { data: photos, error } = await supabase
        .from('progress_photos')
        .select(`
          id,
          photo_url,
          description,
          title,
          taken_at,
          photographer_name,
          phase_id
        `)
        .eq('project_id', projectId)
        .order('taken_at', { ascending: false });

      if (error) throw error;

      const formattedPhotos = photos?.map(photo => ({
        id: photo.id,
        photo_url: photo.photo_url,
        description: photo.description || photo.title,
        phase_name: null, // Will be populated if we have phase info
        created_at: photo.taken_at,
        photographer_name: photo.photographer_name
      })) || [];

      setProgressPhotos(formattedPhotos);
    } catch (error) {
      console.error('Error fetching progress photos:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'potential': { label: 'Potencial', variant: 'secondary' as const },
      'design': { label: 'Diseño', variant: 'default' as const },
      'construction': { label: 'Construcción', variant: 'default' as const },
      'design_completed': { label: 'Diseño Completado', variant: 'secondary' as const },
      'completed': { label: 'Completado', variant: 'default' as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'secondary' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const fetchPaidAmount = async (projectId: string) => {
    try {
      // Get payment plans for this project
      const { data: paymentPlans } = await supabase
        .from('payment_plans')
        .select('id')
        .eq('client_project_id', projectId);

      if (!paymentPlans || paymentPlans.length === 0) {
        setPaidAmount(0);
        return;
      }

      // Get all paid installments for all plans
      const { data: paidInstallments } = await supabase
        .from('payment_installments')
        .select('amount')
        .in('payment_plan_id', paymentPlans.map(plan => plan.id))
        .eq('status', 'paid');

      const total = paidInstallments?.reduce((sum, installment) => sum + (installment.amount || 0), 0) || 0;
      setPaidAmount(total);
    } catch (error) {
      console.error('Error fetching paid amount:', error);
      setPaidAmount(0);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const handlePhotoDownload = async (photo: any) => {
    try {
      const fileName = `foto_progreso_${photo.id}.jpg`;
      const result = await downloadDocument(photo.photo_url, fileName, 'project');
      
      if (result.success) {
        toast.success('Foto descargada exitosamente');
      } else {
        toast.error(result.error || 'Error al descargar la foto');
      }
    } catch (error) {
      console.error('Error downloading photo:', error);
      toast.error('Error al descargar la foto');
    }
  };

  const getProjectTimeline = () => {
    if (!selectedProject) return null;

    const startDate = selectedProject.construction_start_date ? new Date(selectedProject.construction_start_date) : null;
    const estimatedEnd = selectedProject.estimated_completion_date ? new Date(selectedProject.estimated_completion_date) : null;
    const actualEnd = selectedProject.actual_completion_date ? new Date(selectedProject.actual_completion_date) : null;
    const today = new Date();

    let timelineData = {
      status: 'pending',
      daysTotal: 0,
      daysElapsed: 0,
      daysRemaining: 0,
      isOnTime: true,
      isCompleted: false
    };

    if (startDate && estimatedEnd) {
      timelineData.daysTotal = differenceInDays(estimatedEnd, startDate);
      timelineData.daysElapsed = differenceInDays(today, startDate);
      timelineData.daysRemaining = differenceInDays(estimatedEnd, today);
      timelineData.isOnTime = !isAfter(today, estimatedEnd);
      timelineData.isCompleted = !!actualEnd;
    }

    return timelineData;
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Error al cerrar sesión');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Cargando tu portal...</p>
        </div>
      </div>
    );
  }

  if (clientProjects.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
        <Card className="glass-card max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle>No hay proyectos disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center">
              Aún no tienes proyectos asignados. Contacta a tu asesor para más información.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const timeline = getProjectTimeline();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Mobile Header - Style App */}
      <div className="sticky top-0 z-50 bg-background/98 backdrop-blur-xl border-b border-border/50 shadow-sm">
        <div className="p-4 space-y-2">
          {/* Top row - Logout button */}
          <div className="flex justify-end">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive flex items-center gap-2 px-3 py-1 h-8"
            >
              <LogOut className="h-4 w-4" />
              Cerrar Sesión
            </Button>
          </div>
          
          {/* Center - Logo and client info */}
          <div className="flex flex-col items-center space-y-2">
            <div className="w-48 h-24 flex items-center justify-center">
              <img 
                src="/lovable-uploads/8fc0699f-f4d1-4a0f-a989-2f0456de8d2a.png" 
                alt="Dovita Logo" 
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Portal para {clientName || 'Cliente'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Project Selector */}
      {clientProjects.length > 1 && (
        <div className="p-4 border-b border-border/50">
          <select
            value={selectedProject?.id || ''}
            onChange={(e) => {
              const project = clientProjects.find(p => p.id === e.target.value);
              if (project) {
                setSelectedProject(project);
                fetchPaidAmount(project.id);
              }
            }}
            className="w-full p-3 rounded-xl bg-card border border-border text-foreground"
          >
            {clientProjects.map(project => (
              <option key={project.id} value={project.id}>
                {project.project_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Main Content */}
      <div className="p-4 space-y-6">
        {/* Hero Card - Project Overview */}
        <Card className="glass-card border-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-background">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">{selectedProject?.project_name}</h2>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(selectedProject?.status || '')}
                  <Badge variant="outline">{selectedProject?.service_type}</Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Progreso General</p>
                <p className="text-3xl font-bold text-primary">{selectedProject?.overall_progress_percentage || 0}%</p>
              </div>
            </div>
            
            <Progress 
              value={selectedProject?.overall_progress_percentage || 0} 
              className="h-3 mb-4"
            />

            {/* Construction Timeline */}
            {timeline && selectedProject?.construction_start_date && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/30">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Construction className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Inicio de Obra</span>
                  </div>
                  <p className="text-lg font-semibold">
                    {format(new Date(selectedProject.construction_start_date), 'dd MMM yyyy', { locale: es })}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <CalendarDays className="h-4 w-4 text-secondary" />
                    <span className="text-sm font-medium">Terminación Est.</span>
                  </div>
                  <p className="text-lg font-semibold">
                    {selectedProject.estimated_completion_date 
                      ? format(new Date(selectedProject.estimated_completion_date), 'dd MMM yyyy', { locale: es })
                      : 'Por definir'
                    }
                  </p>
                </div>

                {timeline.daysRemaining > 0 && (
                  <div className="col-span-2 mt-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Días restantes</span>
                      <span className={`font-semibold ${timeline.isOnTime ? 'text-success' : 'text-destructive'}`}>
                        {timeline.daysRemaining} días
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Dashboard */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <DollarSign className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pagos Realizados</p>
                  <p className="font-bold">{formatCurrency(paidAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <Home className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Área del Terreno</p>
                  <p className="font-bold">{selectedProject?.land_square_meters || 0} m²</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Budget Overview */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calculator className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Presupuesto Apertura</p>
                  <p className="font-bold">{formatCurrency(selectedProject?.budget || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Hammer className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Presupuesto Obra</p>
                  <p className="font-bold">{formatCurrency(selectedProject?.construction_budget || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="calendar" className="text-xs">
              <Calendar className="h-4 w-4 mb-1" />
              Calendario
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-xs">
              <FileText className="h-4 w-4 mb-1" />
              Docs
            </TabsTrigger>
            <TabsTrigger value="photos" className="text-xs">
              <Camera className="h-4 w-4 mb-1" />
              Fotos
            </TabsTrigger>
            <TabsTrigger value="payments" className="text-xs">
              <DollarSign className="h-4 w-4 mb-1" />
              Pagos
            </TabsTrigger>
            <TabsTrigger value="chat" className="text-xs">
              <MessageCircle className="h-4 w-4 mb-1" />
              Chat
            </TabsTrigger>
          </TabsList>


          <TabsContent value="calendar">
            <div className="space-y-4">
              {selectedProject ? (
                <ClientProjectCalendarViewer
                  projectId={selectedProject.id}
                  projectName={selectedProject.project_name}
                />
              ) : (
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Calendario del Proyecto</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center text-muted-foreground p-8">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay proyecto seleccionado</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>


          <TabsContent value="documents">
            <div className="space-y-4">
              {selectedProject && (
                <ClientDocumentHub 
                  clientId={selectedProject.client_id} 
                  projectId={selectedProject.id} 
                  compact 
                  previewDocuments={isPreview ? previewData?.documents : undefined}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="photos">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Fotos de Progreso</CardTitle>
              </CardHeader>
              <CardContent>
                {isPreview && previewData?.progressPhotos ? (
                  previewData.progressPhotos.length > 0 ? (
                    <ProgressPhotosCarousel 
                      photos={previewData.progressPhotos} 
                      onPhotoDownload={handlePhotoDownload}
                    />
                  ) : (
                    <div className="text-center text-muted-foreground p-8">
                      <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay fotos de progreso disponibles</p>
                    </div>
                  )
                ) : selectedProject ? (
                  <ProgressPhotosCarousel 
                    photos={progressPhotos} 
                    onPhotoDownload={handlePhotoDownload}
                  />
                ) : (
                  <div className="text-center text-muted-foreground p-8">
                    <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Las fotos de progreso aparecerán aquí cuando el equipo las suba</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Planes de Pago</h3>
              </div>
              
              {selectedProject && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Palette className="h-4 w-4 text-blue-500" />
                        Plan de Pago - Diseño
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <PaymentPlanManager 
                        clientProjectId={selectedProject.id}
                        planType="design_payment"
                        readOnly={true}
                        compact={true}
                      />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-orange-500" />
                        Plan de Pago - Construcción
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <PaymentPlanManager 
                        clientProjectId={selectedProject.id}
                        planType="construction_payment"
                        readOnly={true}
                        compact={true}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>


          <TabsContent value="chat">
            <div className="space-y-4">
              {isPreview ? (
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Chat del Proyecto</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center text-muted-foreground p-8">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Vista previa del chat - Funcionalidad disponible para el cliente</p>
                    </div>
                  </CardContent>
                </Card>
              ) : selectedProject ? (
                <SuperiorClientPortalChat 
                  clientId={selectedProject.client_id} 
                  projectId={selectedProject.id} 
                />
              ) : null}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ClientPortalModern;