import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClientProjectSelector } from '@/components/ClientProjectSelector';
import { Separator } from '@/components/ui/separator';
import { Eye, FileText, CreditCard, Camera, MessageCircle, Building2, DollarSign, Calendar, MapPin, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ProjectProgressCard } from '@/components/ProjectProgressCard';
// Payment components removed
import { DocumentsPanel } from '@/components/DocumentsPanel';
import { ProgressPhotosCarousel } from '@/components/ProgressPhotosCarousel';
import { ClientDocumentHub } from '@/components/ClientDocumentHub';
import { SuperiorClientPortalChat } from '@/components/SuperiorClientPortalChat';
import { RealtimeNotificationSystem } from '@/components/RealtimeNotificationSystem';
import { ClientPortalFeaturesSummary } from '@/components/ClientPortalFeaturesSummary';
import { useProjectProgress } from '@/hooks/useProjectProgress';
import ClientPortalModern from '@/components/ClientPortalModern';

interface PreviewProject {
  id: string;
  client_id: string;
  project_name: string;
  project_description: string;
  status: string;
  budget: number;
  construction_budget: number;
  overall_progress_percentage: number;
  construction_start_date: string | null;
  estimated_completion_date: string | null;
  actual_completion_date: string | null;
  construction_area: number;
  land_square_meters: number;
  service_type: string;
}

interface PreviewDocument {
  id: string;
  name: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
  created_at: string;
  uploader_name?: string;
  category: string;
  description?: string;
  source?: string;
}

// Helper functions to fetch documents using the same logic as SalesProjectFileManager
const fetchUnifiedDocuments = async (projectId: string): Promise<PreviewDocument[]> => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('project_id', projectId)
    .eq('document_status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(doc => ({
    id: doc.id,
    name: doc.name,
    category: doc.category,
    file_path: doc.file_path,
    file_type: doc.file_type,
    file_size: doc.file_size,
    created_at: doc.created_at,
    uploader_name: doc.uploaded_by,
    description: doc.description,
    source: 'unified_documents'
  }));
};

const fetchProjectFieldDocuments = async (projectId: string, project: any): Promise<PreviewDocument[]> => {
  const inheritedDocs: PreviewDocument[] = [];

  if (project.contract_url) {
    inheritedDocs.push({
      id: `contract_${projectId}`,
      name: 'Contrato',
      category: 'contract',
      file_path: project.contract_url,
      file_type: 'application/pdf',
      file_size: 0,
      created_at: project.created_at,
      uploader_name: 'Ventas',
      description: 'Contrato firmado del proyecto',
      source: 'inherited'
    });
  }

  if (project.constancia_situacion_fiscal_url) {
    inheritedDocs.push({
      id: `fiscal_${projectId}`,
      name: 'Constancia de Situación Fiscal',
      category: 'fiscal',
      file_path: project.constancia_situacion_fiscal_url,
      file_type: 'application/pdf',
      file_size: 0,
      created_at: project.created_at,
      uploader_name: 'Ventas',
      description: 'Constancia de situación fiscal del cliente',
      source: 'inherited'
    });
  }

  return inheritedDocs;
};

const ClientPortalPreview = () => {
  const { toast } = useToast();
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [projectData, setProjectData] = useState<PreviewProject | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [progressPhotos, setProgressPhotos] = useState<any[]>([]);
  const [paymentPlans, setPaymentPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Use real progress calculation
  const { progress } = useProjectProgress(selectedProjectId, selectedClientId);

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
      
      // Update project with real progress and ensure all required fields
      setProjectData({
        ...project,
        overall_progress_percentage: progress.overallProgress,
        budget: project.budget || 0,
        construction_budget: project.construction_budget || 0,
        construction_area: project.construction_area || 0,
        land_square_meters: project.land_square_meters || 0,
        project_description: project.project_description || '',
        service_type: project.service_type || 'Residencial'
      });

      // Fetch payment plans
      const { data: paymentPlansData } = await supabase
        .from('payment_plans')
        .select(`
          *,
          creator:profiles!created_by(full_name),
          approver:profiles!approved_by(full_name)
        `)
        .eq('client_project_id', selectedProjectId)
        .order('created_at', { ascending: false });

      setPaymentPlans(paymentPlansData || []);

      // Fetch client payments for history
      const { data: paymentsData } = await supabase
        .from('client_payments')
        .select('*')
        .eq('client_id', selectedClientId)
        .limit(5);

      setPayments(paymentsData?.map(payment => ({
        ...payment,
        status: 'paid'
      })) || []);

      // Use the same direct queries as SalesProjectFileManager
      const documentsFromUnified = await fetchUnifiedDocuments(selectedProjectId);
      const documentsFromProjectFields = await fetchProjectFieldDocuments(selectedProjectId, project);
      
      // Evitar duplicaciones de forma más específica
      const unifiedDocuments = documentsFromUnified;
      const existingPaths = new Set(unifiedDocuments.map(doc => doc.file_path));
      const existingNames = new Set(unifiedDocuments.map(doc => doc.name.toLowerCase()));
      
      // Solo agregar documentos de project fields si NO existen duplicados
      const filteredProjectFieldDocs = documentsFromProjectFields.filter(doc => 
        !existingPaths.has(doc.file_path) && 
        !existingNames.has(doc.name.toLowerCase())
      );
      
      const allDocuments = [
        ...unifiedDocuments,
        ...filteredProjectFieldDocs
      ];
      
      console.log('Documents loaded for preview:', {
        unified: unifiedDocuments.length,
        inherited: filteredProjectFieldDocs.length,
        total: allDocuments.length,
        documents: allDocuments.map(d => ({ name: d.name, category: d.category, source: d.source }))
      });

      setDocuments(allDocuments);

      // Fetch progress photos
      const { data: progressPhotosData } = await supabase
        .from('progress_photos')
        .select(`
          *,
          profiles!progress_photos_taken_by_fkey(full_name)
        `)
        .eq('project_id', selectedProjectId)
        .order('taken_at', { ascending: false })
        .limit(10);

      setProgressPhotos(progressPhotosData?.map(photo => ({
        id: photo.id,
        photo_url: photo.photo_url,
        description: photo.title || photo.description || 'Foto de progreso',
        phase_name: photo.phase_id ? `Fase ${photo.phase_id}` : 'General',
        created_at: photo.taken_at,
        photographer_name: photo.profiles?.full_name || 'Equipo de construcción'
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
                  <h2 className="text-2xl font-bold">Portal del Cliente - Vista Previa</h2>
                  <p className="text-muted-foreground">
                    Vista exacta de cómo el cliente ve su portal moderno
                  </p>
                  <Badge variant="outline" className="gap-1">
                    <Eye className="h-3 w-3" />
                    Modo Preview Activo
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Contenido Real del Portal */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : projectData ? (
              <div className="border-2 border-dashed border-primary/20 rounded-lg p-4">
                <div className="text-center mb-4">
                  <Badge variant="secondary" className="gap-1">
                    <Eye className="h-3 w-3" />
                    Portal del Cliente - Vista Previa
                  </Badge>
                </div>
                
                {/* Render the actual client portal component with preview data */}
                <div className="bg-background rounded-lg border">
                  <ClientPortalModern 
                    isPreview={true}
                    previewData={{
                      project: projectData,
                      paymentPlans,
                      documents,
                      progressPhotos
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
          </div>
        </>
      )}
    </div>
  );
};

export default ClientPortalPreview;