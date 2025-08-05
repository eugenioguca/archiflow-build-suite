import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  Download, 
  Eye, 
  FolderOpen,
  Image,
  File,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DesignDocument {
  id: string;
  name: string;
  file_path: string;
  file_type?: string | null;
  file_size?: number | null;
  description?: string | null;
  created_at: string;
  uploader_name?: string | null;
  category?: string;
  phase_name?: string;
}

interface DesignPhase {
  id: string;
  phase_name: string;
  status: string;
  estimated_completion_date?: string | null;
  actual_completion_date?: string | null;
  phase_order: number;
}

interface DesignDocumentsViewerProps {
  projectId: string;
  clientId: string;
}

export const DesignDocumentsViewer: React.FC<DesignDocumentsViewerProps> = ({
  projectId,
  clientId
}) => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<DesignDocument[]>([]);
  const [phases, setPhases] = useState<DesignPhase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhase, setSelectedPhase] = useState<string>('all');

  useEffect(() => {
    Promise.all([fetchDocuments(), fetchDesignPhases()]);
  }, [projectId]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          id,
          name,
          file_path,
          file_type,
          file_size,
          description,
          created_at,
          department,
          uploaded_by
        `)
        .eq('project_id', projectId)
        .eq('department', 'diseño')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to match interface
      const transformedDocs = (data || []).map(doc => ({
        ...doc,
        uploader_name: 'Equipo de Diseño',
        category: 'design',
        phase_name: doc.description?.includes('Zonificación') ? 'Zonificación' :
                   doc.description?.includes('Volumetría') ? 'Volumetría' :
                   doc.description?.includes('Acabados') ? 'Acabados' :
                   doc.description?.includes('Renders') ? 'Renders' : 'General'
      }));

      setDocuments(transformedDocs);
    } catch (error: any) {
      console.error('Error fetching design documents:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los documentos de diseño"
      });
    }
  };

  const fetchDesignPhases = async () => {
    try {
      const { data, error } = await supabase
        .from('design_phases')
        .select('*')
        .eq('project_id', projectId)
        .order('phase_order', { ascending: true });

      if (error) throw error;

      setPhases(data || []);
    } catch (error: any) {
      console.error('Error fetching design phases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-documents')
        .download(filePath);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo descargar el documento"
      });
    }
  };

  const handleView = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-documents')
        .createSignedUrl(filePath, 300); // 5 minutes

      if (error) throw error;

      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo abrir el documento"
      });
    }
  };

  const getPhaseStatus = (phaseName: string) => {
    const phase = phases.find(p => p.phase_name === phaseName);
    return phase?.status || 'pending';
  };

  const getPhaseStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      in_progress: 'secondary',
      pending: 'outline'
    } as const;

    const labels = {
      completed: 'Completado',
      in_progress: 'En Progreso',
      pending: 'Pendiente'
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileType?: string | null) => {
    if (!fileType) return <File className="h-4 w-4" />;
    
    if (fileType.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    }
    
    return <FileText className="h-4 w-4" />;
  };

  const filteredDocuments = selectedPhase === 'all' 
    ? documents 
    : documents.filter(doc => doc.phase_name === selectedPhase);

  const documentsByPhase = phases.reduce((acc, phase) => {
    acc[phase.phase_name] = documents.filter(doc => doc.phase_name === phase.phase_name);
    return acc;
  }, {} as Record<string, DesignDocument[]>);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Documentos de Diseño por Fases
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {phases.map((phase) => {
              const phaseDocuments = documentsByPhase[phase.phase_name] || [];
              return (
                <div key={phase.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{phase.phase_name}</h4>
                    {getPhaseStatusBadge(phase.status)}
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {phaseDocuments.length}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {phaseDocuments.length === 1 ? 'documento' : 'documentos'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Documents by Phase */}
      <Tabs value={selectedPhase} onValueChange={setSelectedPhase}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">Todos</TabsTrigger>
          {phases.slice(0, 4).map((phase) => (
            <TabsTrigger key={phase.id} value={phase.phase_name}>
              {phase.phase_name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {documents.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-2">No hay documentos disponibles</h3>
                <p className="text-muted-foreground">
                  Los documentos de diseño aparecerán aquí cuando el arquitecto los suba.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {getFileIcon(doc.file_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{doc.name}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{doc.phase_name}</span>
                            <span>•</span>
                            <span>{formatFileSize(doc.file_size)}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: es })}
                            </span>
                          </div>
                          {doc.description && (
                            <p className="text-sm text-muted-foreground mt-1 truncate">
                              {doc.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleView(doc.file_path)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownload(doc.file_path, doc.name)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {phases.map((phase) => (
          <TabsContent key={phase.id} value={phase.phase_name} className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {phase.phase_name}
                  </CardTitle>
                  {getPhaseStatusBadge(phase.status)}
                </div>
                {phase.estimated_completion_date && (
                  <p className="text-sm text-muted-foreground">
                    Fecha estimada: {format(new Date(phase.estimated_completion_date), 'dd MMM yyyy', { locale: es })}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {documentsByPhase[phase.phase_name]?.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">No hay documentos para esta fase</h3>
                    <p className="text-muted-foreground text-sm">
                      Los documentos aparecerán cuando el arquitecto los suba para esta fase.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documentsByPhase[phase.phase_name]?.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            {getFileIcon(doc.file_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{doc.name}</h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{formatFileSize(doc.file_size)}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: es })}
                              </span>
                            </div>
                            {doc.description && (
                              <p className="text-sm text-muted-foreground mt-1 truncate">
                                {doc.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleView(doc.file_path)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownload(doc.file_path, doc.name)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};