import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, Image, Video, Download, Eye, Trash2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { uploadFileToStorage, getFileUrl, downloadFile, getFileType, formatFileSize } from '@/lib/fileUtils';
import { DocumentViewer } from '@/components/DocumentViewer';

interface ProjectFile {
  id: string;
  name: string;
  description?: string;
  file_path: string;
  file_type: string;
  file_category: 'document' | 'photo' | 'video' | 'other';
  category?: string;
  project_id?: string;
  client_id?: string;
  uploaded_by: string;
  file_size?: number;
  version: number;
  document_status: string;
  access_level: string;
  tags?: string[];
  metadata?: any;
  created_at: string;
  updated_at: string;
  project?: { id: string; name: string };
  client?: { id: string; full_name: string };
  uploaded_by_profile?: { id: string; full_name: string };
  public_url?: string;
}

interface Client {
  id: string;
  full_name: string;
}

interface Project {
  id: string;
  name: string;
  client_id: string;
}

const categoryLabels = {
  contract: 'Contrato',
  invoice: 'Factura',
  permit: 'Permiso',
  blueprint: 'Plano',
  progress: 'Progreso',
  report: 'Reporte',
  other: 'Otro'
};

const categoryColors = {
  contract: 'bg-blue-100 text-blue-800',
  invoice: 'bg-green-100 text-green-800',
  permit: 'bg-yellow-100 text-yellow-800',
  blueprint: 'bg-purple-100 text-purple-800',
  progress: 'bg-orange-100 text-orange-800',
  report: 'bg-pink-100 text-pink-800',
  other: 'bg-gray-100 text-gray-800'
};

const fileCategoryIcons = {
  document: FileText,
  photo: Image,
  video: Video,
  other: FileText
};

export default function ProjectFiles() {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadData, setUploadData] = useState({
    file: null as File | null,
    name: '',
    description: '',
    category: '',
    projectId: '',
    clientId: '',
    access_level: 'internal'
  });

  // Estados para visualizadores
  const [documentViewer, setDocumentViewer] = useState({
    isOpen: false,
    documentUrl: '',
    documentName: '',
    fileType: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchFiles(),
        fetchClients(),
        fetchProjects()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async () => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('document_status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform documents to match ProjectFile interface
    const transformedFiles = (data || []).map(doc => ({
      id: doc.id,
      name: doc.name,
      description: doc.description,
      file_path: doc.file_path,
      file_type: doc.file_type || 'application/octet-stream',
      file_category: (doc.file_type?.includes('image') ? 'photo' : 'document') as 'document' | 'photo' | 'video' | 'other',
      category: doc.category,
      project_id: doc.project_id,
      client_id: doc.client_id,
      uploaded_by: doc.uploaded_by,
      file_size: doc.file_size,
      version: doc.version || 1,
      document_status: doc.document_status,
      access_level: doc.access_level || 'internal',
      tags: doc.tags || [],
      created_at: doc.created_at,
      updated_at: doc.created_at, // Use created_at as fallback
      public_url: doc.file_path // Will be processed later if needed
    }));

    setFiles(transformedFiles);
  };

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('id, full_name')
      .order('full_name');

    if (error) throw error;
    setClients(data || []);
  };

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('client_projects')
      .select('id, project_name, client_id')
      .order('project_name');

    if (error) throw error;
    setProjects(data?.map(p => ({ id: p.id, name: p.project_name, client_id: p.client_id })) || []);
  };

  const handleFileUpload = async () => {
    if (!uploadData.file || (!uploadData.projectId && !uploadData.clientId)) {
      toast({
        title: "Error",
        description: "Debes seleccionar un archivo y un proyecto o cliente",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Obtener perfil del usuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Perfil no encontrado');

      // Subir archivo a Supabase Storage
      const { filePath } = await uploadFileToStorage(uploadData.file, {
        bucket: 'project-documents',
        folder: uploadData.projectId ? `projects/${uploadData.projectId}` : `clients/${uploadData.clientId}`,
        generatePublicUrl: true
      });

      // Insertar en base de datos
      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          name: uploadData.name || uploadData.file.name,
          description: uploadData.description,
          file_path: filePath,
          file_type: uploadData.file.type,
          category: uploadData.category,
          project_id: uploadData.projectId || null,
          client_id: uploadData.clientId || null,
          uploaded_by: profile.id,
          file_size: uploadData.file.size,
          access_level: uploadData.access_level,
          department: 'general',
          department_permissions: ['all']
        });

      if (insertError) throw insertError;

      toast({
        title: "Éxito",
        description: "Archivo subido correctamente",
      });

      // Resetear formulario y recargar datos
      setUploadData({
        file: null,
        name: '',
        description: '',
        category: '',
        projectId: '',
        clientId: '',
        access_level: 'internal'
      });
      setIsUploadDialogOpen(false);
      fetchFiles();

    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "No se pudo subir el archivo",
        variant: "destructive",
      });
    }
  };

  const handleView = async (file: ProjectFile) => {
    try {
      // Determine correct bucket
      let bucket = 'project-documents';
      if (file.file_path.includes('client-documents/')) {
        bucket = 'client-documents';
      } else if (file.file_path.includes('progress-photos/') || file.category === 'progress') {
        bucket = 'progress-photos';
      }

      // Get public URL if not already available
      let url = file.public_url;
      if (!url || !url.startsWith('http')) {
        const { data } = supabase.storage
          .from(bucket)
          .getPublicUrl(file.file_path);
        url = data.publicUrl;
      }
      
      setDocumentViewer({
        isOpen: true,
        documentUrl: url,
        documentName: file.name,
        fileType: file.file_type
      });
    } catch (error) {
      console.error('Error viewing file:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el archivo",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (file: ProjectFile) => {
    try {
      // Determine correct bucket
      let bucket = 'project-documents';
      if (file.file_path.includes('client-documents/')) {
        bucket = 'client-documents';
      } else if (file.file_path.includes('progress-photos/') || file.category === 'progress') {
        bucket = 'progress-photos';
      }

      // Get public URL if not already available
      let url = file.public_url;
      if (!url || !url.startsWith('http')) {
        const { data } = supabase.storage
          .from(bucket)
          .getPublicUrl(file.file_path);
        url = data.publicUrl;
      }

      await downloadFile(url, file.name);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Error",
        description: "No se pudo descargar el archivo",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este archivo?')) return;

    try {
      const { error } = await supabase
        .from('documents')
        .update({ document_status: 'deleted' })
        .eq('id', fileId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Archivo eliminado correctamente",
      });

      fetchFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el archivo",
        variant: "destructive",
      });
    }
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || file.category === categoryFilter;
    const matchesFileType = fileTypeFilter === 'all' || file.file_category === fileTypeFilter;
    
    return matchesSearch && matchesCategory && matchesFileType;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Archivos del Proyecto</h1>
          <p className="text-muted-foreground">Gestiona documentos y fotos de tus proyectos</p>
        </div>
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Subir Archivo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Subir Nuevo Archivo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="file">Archivo *</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadData(prev => ({
                        ...prev,
                        file,
                        name: prev.name || file.name.split('.')[0]
                      }));
                    }
                  }}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.bmp,.webp,.svg,.txt,.csv"
                />
              </div>

              <div>
                <Label htmlFor="name">Nombre del archivo *</Label>
                <Input
                  id="name"
                  value={uploadData.name}
                  onChange={(e) => setUploadData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nombre descriptivo del archivo"
                />
              </div>

              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={uploadData.description}
                  onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción opcional del archivo"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Categoría</Label>
                  <Select value={uploadData.category} onValueChange={(value) => setUploadData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contract">Contrato</SelectItem>
                      <SelectItem value="invoice">Factura</SelectItem>
                      <SelectItem value="permit">Permiso</SelectItem>
                      <SelectItem value="blueprint">Plano</SelectItem>
                      <SelectItem value="progress">Progreso</SelectItem>
                      <SelectItem value="report">Reporte</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="access_level">Nivel de acceso</Label>
                  <Select value={uploadData.access_level} onValueChange={(value) => setUploadData(prev => ({ ...prev, access_level: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Público</SelectItem>
                      <SelectItem value="internal">Interno</SelectItem>
                      <SelectItem value="restricted">Restringido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="project">Proyecto</Label>
                  <Select value={uploadData.projectId} onValueChange={(value) => setUploadData(prev => ({ ...prev, projectId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar proyecto" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="client">Cliente (opcional)</Label>
                  <Select value={uploadData.clientId} onValueChange={(value) => setUploadData(prev => ({ ...prev, clientId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleFileUpload}>
                  Subir Archivo
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar archivos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtrar por categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            <SelectItem value="contract">Contratos</SelectItem>
            <SelectItem value="invoice">Facturas</SelectItem>
            <SelectItem value="permit">Permisos</SelectItem>
            <SelectItem value="blueprint">Planos</SelectItem>
            <SelectItem value="progress">Progreso</SelectItem>
            <SelectItem value="report">Reportes</SelectItem>
            <SelectItem value="other">Otros</SelectItem>
          </SelectContent>
        </Select>
        <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Tipo de archivo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="document">Documentos</SelectItem>
            <SelectItem value="photo">Fotos</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
            <SelectItem value="other">Otros</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de archivos */}
      <div className="grid gap-4">
        {filteredFiles.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay archivos</h3>
              <p className="text-muted-foreground">
                {searchTerm || categoryFilter !== 'all' || fileTypeFilter !== 'all'
                  ? 'No se encontraron archivos con los filtros aplicados.'
                  : 'Sube tu primer archivo para comenzar.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredFiles.map((file) => {
            const IconComponent = fileCategoryIcons[file.file_category] || FileText;
            return (
              <Card key={file.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="p-2 bg-muted rounded-lg">
                        <IconComponent className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground truncate">{file.name}</h3>
                          {file.category && (
                            <Badge variant="outline" className={categoryColors[file.category as keyof typeof categoryColors] || categoryColors.other}>
                              {categoryLabels[file.category as keyof typeof categoryLabels] || file.category}
                            </Badge>
                          )}
                        </div>
                        {file.description && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{file.description}</p>
                        )}
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>{formatDate(file.created_at)}</span>
                          {file.file_size && (
                            <>
                              <span>•</span>
                              <span>{formatFileSize(file.file_size)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(file)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(file)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(file.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Visualizadores */}
      <DocumentViewer
        isOpen={documentViewer.isOpen}
        onClose={() => setDocumentViewer(prev => ({ ...prev, isOpen: false }))}
        documentUrl={documentViewer.documentUrl}
        documentName={documentViewer.documentName}
        fileType={documentViewer.fileType}
      />
    </div>
  );
}