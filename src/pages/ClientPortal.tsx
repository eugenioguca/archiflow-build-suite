import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Import our new professional components
import { ProjectProgressCard } from '@/components/ProjectProgressCard';
import { PaymentHistoryPanel } from '@/components/PaymentHistoryPanel';
import { DocumentsPanel } from '@/components/DocumentsPanel';
import { ProgressPhotosCarousel } from '@/components/ProgressPhotosCarousel';
import { ClientPortalChat } from '@/components/ClientPortalChat';
import { ClientDocumentUploader } from '@/components/ClientDocumentUploader';

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
  const [project, setProject] = useState<ClientProject | null>(null);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchClientData();
    }
  }, [user]);

  const fetchClientData = async () => {
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

      // Get client project
      const { data: projectData, error: projectError } = await supabase
        .from('client_projects')
        .select('*')
        .eq('client_id', clientData.id)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Get project phases
      const { data: phasesData } = await supabase
        .from('design_phases')
        .select('*')
        .eq('project_id', projectData.id)
        .order('phase_order', { ascending: true });
      
      setPhases(phasesData || []);

      // Get payments
      const { data: paymentsData } = await supabase
        .from('client_payments')
        .select('*')
        .eq('client_id', clientData.id)
        .order('payment_date', { ascending: false });

      if (paymentsData) {
        setPayments(paymentsData.map(payment => ({
          ...payment,
          status: 'paid' // Assume paid since they're in the system
        })));
      }

      // Get documents
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
        .eq('project_id', projectData.id)
        .order('created_at', { ascending: false });

      if (documentsData) {
        const processedDocs = documentsData.map(doc => ({
          ...doc,
          uploader_name: 'Sistema',
          category: 'general'
        }));
        setDocuments(processedDocs);
      }

      // Skip progress photos for now - table may not exist yet
      setPhotos([]);

    } catch (error) {
      console.error('Error fetching client data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los datos del proyecto"
      });
    } finally {
      setLoading(false);
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

  const formatCurrency = (amount: number) => {
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

  if (!project) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">No hay proyecto asignado</h2>
            <p className="text-muted-foreground">
              Actualmente no tienes un proyecto asignado. Contacta con el administrador.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header del Proyecto */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">{project.project_name}</h1>
            <p className="text-lg text-muted-foreground">{project.project_description}</p>
            <div className="flex items-center gap-4 mt-4">
              {getStatusBadge(project.status)}
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {project.project_location || 'Ubicación no especificada'}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              {project.overall_progress_percentage || 0}%
            </div>
            <div className="text-sm text-muted-foreground">Progreso</div>
            <Progress value={project.overall_progress_percentage || 0} className="w-32 mt-2" />
          </div>
        </div>
      </div>

      {/* Información General */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Presupuesto Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(project.budget)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Fecha de Inicio</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {project.construction_start_date ? 
                format(new Date(project.construction_start_date), 'dd MMM yyyy', { locale: es }) :
                'No definida'
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Finalización Estimada</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
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

        <TabsContent value="resumen" className="space-y-6">
          {/* Project Progress Card */}
          <ProjectProgressCard project={project} />
          
          {/* Two column layout with overview cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PaymentHistoryPanel payments={payments} />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Fases del Proyecto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {phases.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                      <p>No hay fases definidas</p>
                    </div>
                  ) : (
                    phases.slice(0, 4).map((phase) => (
                      <div key={phase.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{phase.phase_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Orden: {phase.phase_order}
                          </p>
                        </div>
                        <Badge 
                          variant={phase.status === 'completed' ? 'default' : 'secondary'}
                        >
                          {phase.status === 'completed' ? 'Completada' : 
                           phase.status === 'in_progress' ? 'En progreso' : 'Pendiente'}
                        </Badge>
                      </div>
                    ))
                  )}
                  {phases.length > 4 && (
                    <p className="text-sm text-muted-foreground text-center">
                      Y {phases.length - 4} fases más...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pagos">
          <PaymentHistoryPanel payments={payments} />
        </TabsContent>

        <TabsContent value="documentos" className="space-y-6">
          <ClientDocumentUploader 
            projectId={project.id}
            clientId={project.client_id}
            onUploadComplete={fetchClientData}
          />
          <DocumentsPanel 
            documents={documents}
            onDocumentView={(doc) => {
              // Open document in new tab or modal
              window.open(doc.file_path, '_blank');
            }}
            onDocumentDownload={(doc) => {
              // Download document
              const link = document.createElement('a');
              link.href = doc.file_path;
              link.download = doc.name;
              link.click();
            }}
          />
        </TabsContent>

        <TabsContent value="fotos">
          <ProgressPhotosCarousel 
            photos={photos}
            onPhotoDownload={(photo) => {
              // Download photo
              const link = document.createElement('a');
              link.href = photo.photo_url;
              link.download = `foto-${photo.id}.jpg`;
              link.click();
            }}
          />
        </TabsContent>

        <TabsContent value="chat">
          <ClientPortalChat 
            projectId={project.id}
            clientId={project.client_id}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientPortal;