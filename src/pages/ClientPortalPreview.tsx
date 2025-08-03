import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClientProjectSelector } from '@/components/ClientProjectSelector';
import { Separator } from '@/components/ui/separator';
import { Eye, FileText, CreditCard, Camera, MessageCircle, Building2, DollarSign, Calendar, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ProjectProgressCard } from '@/components/ProjectProgressCard';
import { PaymentHistoryPanel } from '@/components/PaymentHistoryPanel';
import { DocumentsPanel } from '@/components/DocumentsPanel';

interface PreviewProject {
  id: string;
  project_name: string;
  project_description?: string | null;
  status: string;
  budget?: number | null;
  overall_progress_percentage?: number | null;
  estimated_completion_date?: string | null;
  project_location?: string | null;
  service_type?: string | null;
  timeline_months?: number | null;
  client_id: string;
}

const ClientPortalPreview = () => {
  const { toast } = useToast();
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [projectData, setProjectData] = useState<PreviewProject | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedProjectId && selectedClientId) {
      fetchProjectData();
    }
  }, [selectedProjectId, selectedClientId]);

  const fetchProjectData = async () => {
    setLoading(true);
    try {
      // Fetch project data
      const { data: project, error: projectError } = await supabase
        .from('client_projects')
        .select('*')
        .eq('id', selectedProjectId)
        .single();

      if (projectError) throw projectError;
      setProjectData(project);

      // Fetch sample payments
      const { data: paymentsData } = await supabase
        .from('client_payments')
        .select('*')
        .eq('client_id', selectedClientId)
        .limit(5);

      setPayments(paymentsData?.map(payment => ({
        ...payment,
        status: 'paid'
      })) || []);

      // Fetch sample documents
      const { data: documentsData } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', selectedProjectId)
        .limit(5);

      setDocuments(documentsData?.map(doc => ({
        ...doc,
        uploader_name: 'Sistema',
        category: 'general'
      })) || []);

    } catch (error) {
      console.error('Error fetching project data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los datos del proyecto"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Eye className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">Previsualización Client Portal</h1>
        <Badge variant="outline" className="ml-2">Vista Admin</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Cliente y Proyecto</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientProjectSelector
            selectedClientId={selectedClientId}
            selectedProjectId={selectedProjectId}
            onClientChange={setSelectedClientId}
            onProjectChange={setSelectedProjectId}
          />
        </CardContent>
      </Card>

      {selectedClientId && selectedProjectId && (
        <>
          <Separator />
          
          <div className="grid gap-6">
            {/* Hero Section del Portal */}
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
              <CardContent className="p-8">
                <div className="text-center space-y-4">
                  <h2 className="text-2xl font-bold">Portal del Cliente</h2>
                  <p className="text-muted-foreground">
                    Vista previa de cómo el cliente ve su portal
                  </p>
                  <div className="flex justify-center gap-4 mt-6">
                    <Badge variant="secondary" className="gap-1">
                      <FileText className="h-3 w-3" />
                      Documentos
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <CreditCard className="h-3 w-3" />
                      Pagos
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Camera className="h-3 w-3" />
                      Fotos de Avance
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <MessageCircle className="h-3 w-3" />
                      Chat del Proyecto
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contenido del Portal con datos reales */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : projectData ? (
              <div className="space-y-6">
                {/* Project Progress Card */}
                <ProjectProgressCard project={projectData} />
                
                {/* Two column layout */}
                <div className="grid md:grid-cols-2 gap-6">
                  <PaymentHistoryPanel payments={payments} />
                  <DocumentsPanel 
                    documents={documents}
                    onDocumentView={(doc) => {
                      toast({
                        title: "Vista previa",
                        description: `Abriendo documento: ${doc.name}`
                      });
                    }}
                    onDocumentDownload={(doc) => {
                      toast({
                        title: "Descarga simulada",
                        description: `Descargando: ${doc.name}`
                      });
                    }}
                  />
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Datos del proyecto</h3>
                  <p className="text-muted-foreground">
                    Selecciona un cliente y proyecto para ver la vista previa del portal
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Secciones adicionales del portal */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Documentos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    {documents.length > 0 
                      ? `${documents.length} documentos disponibles`
                      : 'No hay documentos cargados'
                    }
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Plan de Pagos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    {payments.length > 0 
                      ? `${payments.length} pagos registrados`
                      : 'No hay pagos registrados'
                    }
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Fotos de Avance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Fotos de avance del proyecto
                    <span className="block text-xs mt-1 text-orange-600">
                      (Funcionalidad en desarrollo)
                    </span>
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Chat del Proyecto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Chat en tiempo real para comunicación directa con el equipo
                  <span className="block text-xs mt-1 text-green-600">
                    ✓ Funcionalidad implementada
                  </span>
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default ClientPortalPreview;