import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FolderOpen, 
  Camera, 
  Upload, 
  Download, 
  Eye, 
  FileText, 
  Image as ImageIcon,
  Trash2,
  RefreshCw,
  Plus,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { uploadFileToStorage, downloadFile, getFileUrl } from '@/lib/fileUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SalesProjectFileManagerProps {
  clientId: string;
  projectId: string;
  projectName: string;
}

interface Document {
  id: string;
  document_name: string;
  document_type: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
  created_at: string;
  uploaded_by?: string;
  source: 'client_documents' | 'project_field' | 'inherited';
}

interface ProgressPhoto {
  id: string;
  photo_url: string;
  title: string | null;
  description: string | null;
  taken_at: string;
  photo_type: string;
  photographer_name: string | null;
}

interface FileUpload {
  file: File;
  id: string;
  category: string;
  description: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
}

const DOCUMENT_CATEGORIES = [
  { value: 'legal', label: 'Documentos Legales' },
  { value: 'financial', label: 'Documentos Financieros' },
  { value: 'technical', label: 'Documentos Técnicos' },
  { value: 'permits', label: 'Permisos y Licencias' },
  { value: 'contracts', label: 'Contratos' },
  { value: 'correspondence', label: 'Correspondencia' },
  { value: 'other', label: 'Otros' }
];

export const SalesProjectFileManager: React.FC<SalesProjectFileManagerProps> = ({
  clientId,
  projectId,
  projectName,
}) => {
  console.log('🔥 SalesProjectFileManager NUEVO se está ejecutando!', { clientId, projectId, projectName });
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileUpload[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchDocuments();
    fetchPhotos();
  }, [clientId, projectId]);

  const fetchDocuments = async () => {
    console.log('🔥 fetchDocuments del NUEVO componente ejecutándose');
    try {
      setLoading(true);
      const documentsFromClientDocs = await fetchClientDocuments();
      const documentsFromProjectFields = await fetchProjectFieldDocuments();
      
      const allDocuments = [
        ...documentsFromClientDocs,
        ...documentsFromProjectFields
      ];
      
      setDocuments(allDocuments);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los documentos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClientDocuments = async (): Promise<Document[]> => {
    const { data, error } = await supabase
      .from('client_documents')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(doc => ({
      id: doc.id,
      document_name: doc.document_name,
      document_type: doc.document_type,
      file_path: doc.file_path,
      file_type: doc.file_type,
      file_size: doc.file_size,
      created_at: doc.created_at,
      uploaded_by: doc.uploaded_by,
      source: 'client_documents' as const
    }));
  };

  const fetchProjectFieldDocuments = async (): Promise<Document[]> => {
    const { data, error } = await supabase
      .from('client_projects')
      .select('contract_url, constancia_situacion_fiscal_url')
      .eq('id', projectId)
      .single();

    if (error) throw error;

    const inheritedDocs: Document[] = [];

    if (data.contract_url) {
      inheritedDocs.push({
        id: `contract_${projectId}`,
        document_name: 'Contrato',
        document_type: 'contract',
        file_path: data.contract_url,
        created_at: new Date().toISOString(),
        source: 'inherited' as const
      });
    }

    if (data.constancia_situacion_fiscal_url) {
      inheritedDocs.push({
        id: `fiscal_${projectId}`,
        document_name: 'Constancia de Situación Fiscal',
        document_type: 'fiscal',
        file_path: data.constancia_situacion_fiscal_url,
        created_at: new Date().toISOString(),
        source: 'inherited' as const
      });
    }

    return inheritedDocs;
  };

  const fetchPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('progress_photos')
        .select('*')
        .eq('project_id', projectId)
        .order('taken_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error('Error fetching photos:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const newFiles: FileUpload[] = files.map(file => ({
      file,
      id: Math.random().toString(36).substring(7),
      category: 'other',
      description: '',
      progress: 0,
      status: 'pending'
    }));
    
    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  const updateFile = (fileId: string, updates: Partial<FileUpload>) => {
    setSelectedFiles(prev => 
      prev.map(f => f.id === fileId ? { ...f, ...updates } : f)
    );
  };

  const removeFile = (fileId: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const uploadFile = async (fileUpload: FileUpload) => {
    try {
      updateFile(fileUpload.id, { status: 'uploading', progress: 50 });

      // Upload to storage
      const { filePath } = await uploadFileToStorage(fileUpload.file, {
        bucket: 'client-documents',
        folder: clientId,
        generatePublicUrl: false
      });

      // Insert into database
      const { error: dbError } = await supabase
        .from('client_documents')
        .insert({
          client_id: clientId,
          project_id: projectId,
          document_name: fileUpload.file.name,
          document_type: fileUpload.category,
          file_path: filePath,
          file_type: fileUpload.file.type,
          file_size: fileUpload.file.size,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (dbError) throw dbError;

      updateFile(fileUpload.id, { status: 'completed', progress: 100 });
    } catch (error) {
      console.error('Error uploading file:', error);
      updateFile(fileUpload.id, { status: 'error', progress: 0 });
      throw error;
    }
  };

  const handleUploadAll = async () => {
    const pendingFiles = selectedFiles.filter(f => f.status === 'pending' && f.category && f.description);
    
    if (pendingFiles.length === 0) {
      toast({
        title: "No hay archivos para subir",
        description: "Asegúrate de seleccionar archivos y completar todos los campos",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      for (const fileUpload of pendingFiles) {
        await uploadFile(fileUpload);
      }

      toast({
        title: "Archivos subidos exitosamente",
        description: `Se subieron ${pendingFiles.length} archivos`,
      });

      setSelectedFiles([]);
      await fetchDocuments();
    } catch (error) {
      toast({
        title: "Error al subir archivos",
        description: "Algunos archivos no se pudieron subir",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleViewDocument = async (document: Document) => {
    try {
      const bucket = document.source === 'client_documents' ? 'client-documents' : 'project-documents';
      const { url } = await getFileUrl(document.file_path, bucket, true);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error opening document:', error);
      toast({
        title: "Error",
        description: "No se pudo abrir el documento",
        variant: "destructive",
      });
    }
  };

  const handleDownloadDocument = async (document: Document) => {
    try {
      const bucket = document.source === 'client_documents' ? 'client-documents' : 'project-documents';
      const { url } = await getFileUrl(document.file_path, bucket, true);
      await downloadFile(url, document.document_name);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Error",
        description: "No se pudo descargar el documento",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPhoto = async (photo: ProgressPhoto) => {
    try {
      await downloadFile(photo.photo_url, `foto_${photo.id}.jpg`);
    } catch (error) {
      console.error('Error downloading photo:', error);
      toast({
        title: "Error",
        description: "No se pudo descargar la foto",
        variant: "destructive",
      });
    }
  };

  const openPhotoCarousel = (photo: ProgressPhoto) => {
    const index = photos.findIndex(p => p.id === photo.id);
    setCurrentPhotoIndex(index);
    setSelectedPhoto(photo);
  };

  const navigatePhoto = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' 
      ? (currentPhotoIndex - 1 + photos.length) % photos.length
      : (currentPhotoIndex + 1) % photos.length;
    
    setCurrentPhotoIndex(newIndex);
    setSelectedPhoto(photos[newIndex]);
  };

  const getDocumentIcon = (documentType: string) => {
    switch (documentType) {
      case 'contract':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'fiscal':
        return <FileText className="h-5 w-5 text-green-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const filteredDocuments = documents.filter(doc =>
    doc.document_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.document_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Expediente del Proyecto</h2>
        <p className="text-muted-foreground">{projectName}</p>
      </div>

      <Tabs defaultValue="documents" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Documentos ({documents.length})
          </TabsTrigger>
          <TabsTrigger value="photos" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Fotografías ({photos.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="flex-1 mt-6 space-y-6">
          {/* Document Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Subir Documentos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">Haz clic para seleccionar archivos</p>
                  <p className="text-xs text-muted-foreground">
                    PDF, DOC, DOCX, JPG, PNG (máx. 10MB cada uno)
                  </p>
                </label>
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-3">
                  {selectedFiles.map((fileUpload) => (
                    <div key={fileUpload.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{fileUpload.file.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(fileUpload.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <Select
                          value={fileUpload.category}
                          onValueChange={(value) => updateFile(fileUpload.id, { category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar categoría" />
                          </SelectTrigger>
                          <SelectContent>
                            {DOCUMENT_CATEGORIES.map((category) => (
                              <SelectItem key={category.value} value={category.value}>
                                {category.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Input
                          placeholder="Descripción del documento"
                          value={fileUpload.description}
                          onChange={(e) => updateFile(fileUpload.id, { description: e.target.value })}
                        />
                      </div>

                      {fileUpload.status === 'uploading' && (
                        <Progress value={fileUpload.progress} className="h-2" />
                      )}
                      
                      {fileUpload.status === 'error' && (
                        <p className="text-sm text-destructive">Error al subir el archivo</p>
                      )}
                      
                      {fileUpload.status === 'completed' && (
                        <p className="text-sm text-green-600">Archivo subido exitosamente</p>
                      )}
                    </div>
                  ))}
                  
                  <Button 
                    onClick={handleUploadAll}
                    disabled={uploading || selectedFiles.every(f => f.status !== 'pending' || !f.category || !f.description)}
                    className="w-full"
                  >
                    {uploading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Subir Todos los Archivos
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Documentos del Proyecto
                </CardTitle>
                <Button variant="outline" size="sm" onClick={fetchDocuments}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar
                </Button>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar documentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-muted rounded"></div>
                    </div>
                  ))}
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="text-center py-8">
                  <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium">No hay documentos disponibles</p>
                  <p className="text-muted-foreground">
                    {searchTerm ? 'Intenta ajustar tu búsqueda' : 'Sube el primer documento para comenzar'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredDocuments.map((document) => (
                    <div key={document.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        {getDocumentIcon(document.document_type)}
                        <div>
                          <h4 className="font-medium">{document.document_name}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{DOCUMENT_CATEGORIES.find(c => c.value === document.document_type)?.label || document.document_type}</span>
                            <span>{formatFileSize(document.file_size)}</span>
                            <span>{format(new Date(document.created_at), 'dd/MM/yyyy', { locale: es })}</span>
                            {document.source === 'inherited' && (
                              <Badge variant="outline" className="text-xs">Heredado</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDocument(document)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadDocument(document)}
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

        <TabsContent value="photos" className="flex-1 mt-6">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Fotografías de Progreso
                </CardTitle>
                <Button variant="outline" size="sm" onClick={fetchPhotos}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {photos.length === 0 ? (
                <div className="text-center py-8">
                  <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium">No hay fotografías disponibles</p>
                  <p className="text-muted-foreground">
                    Las fotografías aparecerán aquí cuando el equipo de construcción las suba
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {photos.map((photo) => (
                    <Card key={photo.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
                      <div className="relative aspect-square">
                        <img
                          src={photo.photo_url}
                          alt={photo.title || "Foto de progreso"}
                          className="w-full h-full object-cover"
                          onClick={() => openPhotoCarousel(photo)}
                        />
                        <div className="absolute top-2 left-2">
                          <Badge variant="outline" className="bg-white/90">
                            {photo.photo_type}
                          </Badge>
                        </div>
                      </div>
                      <CardContent className="p-3">
                        <h4 className="font-medium text-sm mb-1 truncate">
                          {photo.title || "Sin título"}
                        </h4>
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {photo.description || "Sin descripción"}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(photo.taken_at), 'dd/MM/yyyy', { locale: es })}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadPhoto(photo);
                            }}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Photo Carousel Modal */}
      {selectedPhoto && (
        <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <DialogHeader className="sr-only">
              <DialogTitle>Visualizador de Fotografías</DialogTitle>
              <DialogDescription>Carrusel para ver fotografías de progreso del proyecto</DialogDescription>
            </DialogHeader>
            <div className="relative h-full">
              {/* Header */}
              <div className="absolute top-0 left-0 right-0 z-10 bg-black/80 text-white p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{selectedPhoto.title || "Sin título"}</h3>
                  <p className="text-sm text-gray-300">
                    {currentPhotoIndex + 1} de {photos.length} • {format(new Date(selectedPhoto.taken_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownloadPhoto(selectedPhoto)}
                    className="text-white hover:bg-white/20"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPhoto(null)}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Image */}
              <div className="relative h-[60vh] flex items-center justify-center bg-black">
                <img
                  src={selectedPhoto.photo_url}
                  alt={selectedPhoto.title || "Foto de progreso"}
                  className="max-h-full max-w-full object-contain"
                />
                
                {/* Navigation */}
                {photos.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                      onClick={() => navigatePhoto('prev')}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                      onClick={() => navigatePhoto('next')}
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                  </>
                )}
              </div>

              {/* Description */}
              {selectedPhoto.description && (
                <div className="p-4 bg-white">
                  <p className="text-sm text-muted-foreground">{selectedPhoto.description}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};