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
      <Tabs defaultValue="pagos" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
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
        </TabsList>

        <TabsContent value="pagos">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Pagos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payments.length === 0 ? (
                  <div className="text-center py-8">
                    <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No hay pagos registrados</p>
                  </div>
                ) : (
                  payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Pago #{payment.id.slice(0,8)}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(payment.payment_date), 'dd MMM yyyy', { locale: es })} • {payment.payment_method || 'Transferencia'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{formatCurrency(payment.amount_paid)}</p>
                        <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'}>
                          {payment.status === 'paid' ? 'Pagado' : 'Pendiente'}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentos">
          <Card>
            <CardHeader>
              <CardTitle>Documentos del Proyecto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {documents.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No hay documentos disponibles</p>
                  </div>
                ) : (
                  documents.map((document) => (
                    <div key={document.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-primary" />
                        <div>
                          <p className="font-medium">{document.name}</p>
                          <p className="text-sm text-muted-foreground">{document.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(document.created_at), 'dd MMM yyyy', { locale: es })}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">{document.category}</Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fotos">
          <Card>
            <CardHeader>
              <CardTitle>Fotos de Avance del Proyecto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Las fotos de avance se mostrarán aquí</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientPortal;