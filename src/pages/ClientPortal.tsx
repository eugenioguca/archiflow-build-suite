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
import ClientPortalModern from '@/components/ClientPortalModern';

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

  // Use the new modern portal component
  return <ClientPortalModern />;
};

export default ClientPortal;