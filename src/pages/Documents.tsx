import { useState, useEffect } from 'react';
import { Plus, Search, Upload, FileText, Download, Trash2, Filter, FolderOpen, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DocumentViewer } from '@/components/DocumentViewer';
import { getFileUrl } from '@/lib/fileUtils';

interface Document {
  id: string;
  name: string;
  description: string | null;
  file_path: string;
  file_type: string | null;
  category: string | null;
  created_at: string;
  project?: {
    id: string;
    name: string;
  };
  client?: {
    id: string;
    full_name: string;
  };
  uploaded_by: {
    id: string;
    full_name: string;
  };
}

interface Client {
  id: string;
  full_name: string;
}

interface Project {
  id: string;
  name: string;
  client: {
    full_name: string;
  };
}

const categoryLabels = {
  personal: 'Documentos Personales',
  project: 'Documentos del Proyecto',
  contract: 'Contratos',
  permit: 'Permisos y Licencias',
  other: 'Otros'
};

const categoryColors = {
  personal: 'bg-blue-100 text-blue-800',
  project: 'bg-green-100 text-green-800',
  contract: 'bg-purple-100 text-purple-800',
  permit: 'bg-yellow-100 text-yellow-800',
  other: 'bg-gray-100 text-gray-800'
};

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewerState, setViewerState] = useState({
    isOpen: false,
    documentUrl: "",
    documentName: "",
    fileType: ""
  });

  useEffect(() => {
    fetchDocuments();
    fetchClients();
    fetchProjects();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          project:projects(id, name),
          client:clients(id, full_name),
          uploaded_by:profiles!documents_uploaded_by_fkey(id, full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los documentos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name')
        .order('full_name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id, 
          name,
          client:clients(full_name)
        `)
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleFileUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);

    const formData = new FormData(e.currentTarget);
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const projectId = formData.get('project_id') as string;
    const clientId = formData.get('client_id') as string;

    if (!file) {
      toast({
        title: "Error",
        description: "Selecciona un archivo para subir",
        variant: "destructive",
      });
      setUploading(false);
      return;
    }

    try {
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuario no autenticado');

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.user.id)
        .single();

      if (!profile) throw new Error('Perfil no encontrado');

      // Subir archivo a Supabase Storage con la misma estructura que los otros módulos
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      
      // Usar la misma estructura que en otros módulos: user_id/project_id/timestamp.ext
      let fileName: string;
      if (projectId) {
        fileName = `${userData.user.id}/${projectId}/${timestamp}.${fileExt}`;
      } else {
        fileName = `${userData.user.id}/${timestamp}_${sanitizedFileName}`;
      }

      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create document record with Storage path
      const documentData = {
        name: name || file.name,
        description: description || null,
        file_path: fileName, // Ruta en Storage
        file_type: file.type,
        category,
        project_id: projectId || null,
        client_id: clientId || null,
        uploaded_by: profile.id,
        file_size: file.size,
      };

      const { error } = await supabase
        .from('documents')
        .insert([documentData]);

      if (error) throw error;

      toast({
        title: "Documento subido",
        description: "El documento se subió correctamente",
      });

      setIsDialogOpen(false);
      fetchDocuments();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "No se pudo subir el documento",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este documento?')) return;

    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      toast({
        title: "Documento eliminado",
        description: "El documento se eliminó correctamente",
      });

      fetchDocuments();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el documento",
        variant: "destructive",
      });
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDownload = async (doc: Document) => {
    try {
      let downloadUrl = doc.file_path;
      
      // Si el archivo está en Storage, obtener la URL pública
      if (!doc.file_path.startsWith('http')) {
        const { data } = supabase.storage
          .from('project-documents')
          .getPublicUrl(doc.file_path);
        downloadUrl = data.publicUrl;
      }

      // Descargar preservando el tipo de archivo
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('Error al obtener el archivo');
      
      const blob = await response.blob();
      const link = document.createElement('a');
      const objectUrl = URL.createObjectURL(blob);
      
      link.href = objectUrl;
      link.download = doc.name;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpiar el objeto URL
      setTimeout(() => URL.revokeObjectURL(objectUrl), 100);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Error",
        description: "No se pudo descargar el archivo",
        variant: "destructive",
      });
    }
  };

  const handleView = async (doc: Document) => {
    try {
      let viewUrl = doc.file_path;
      
      // Si el archivo está en Storage, obtener la URL correcta
      if (!doc.file_path.startsWith('http')) {
        console.log('Getting URL for file:', doc.file_path);
        const { url } = await getFileUrl(doc.file_path, 'project-documents', true);
        console.log('Generated URL:', url);
        viewUrl = url;
      }
      
      console.log('Opening viewer with URL:', viewUrl, 'File type:', doc.file_type);
      setViewerState({
        isOpen: true,
        documentUrl: viewUrl,
        documentName: doc.name,
        fileType: doc.file_type || ''
      });
    } catch (error) {
      console.error('Error getting file URL:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el documento",
        variant: "destructive",
      });
    }
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
          <h1 className="text-3xl font-bold">Gestión de Documentos</h1>
          <p className="text-muted-foreground">Administra documentos de clientes y proyectos</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Subir Documento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Subir Nuevo Documento</DialogTitle>
              <DialogDescription>
                Agrega un documento al sistema de gestión
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleFileUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file">Archivo *</Label>
                <Input
                  id="file"
                  name="file"
                  type="file"
                  required
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.xls,.xlsx"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Documento</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Se usará el nombre del archivo si está vacío"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={3}
                  placeholder="Descripción opcional del documento"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoría *</Label>
                <Select name="category" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Documentos Personales</SelectItem>
                    <SelectItem value="project">Documentos del Proyecto</SelectItem>
                    <SelectItem value="contract">Contratos</SelectItem>
                    <SelectItem value="permit">Permisos y Licencias</SelectItem>
                    <SelectItem value="other">Otros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_id">Cliente (Opcional)</Label>
                <Select name="client_id">
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

              <div className="space-y-2">
                <Label htmlFor="project_id">Proyecto (Opcional)</Label>
                <Select name="project_id">
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name} - {project.client.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1" disabled={uploading}>
                  {uploading ? 'Subiendo...' : 'Subir Documento'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  disabled={uploading}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar documentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            <SelectItem value="personal">Documentos Personales</SelectItem>
            <SelectItem value="project">Documentos del Proyecto</SelectItem>
            <SelectItem value="contract">Contratos</SelectItem>
            <SelectItem value="permit">Permisos y Licencias</SelectItem>
            <SelectItem value="other">Otros</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de documentos */}
      <div className="grid gap-4">
        {filteredDocuments.map((document) => (
          <Card key={document.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="p-2 bg-muted rounded-lg">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{document.name}</h3>
                      <Badge className={categoryColors[document.category as keyof typeof categoryColors] || categoryColors.other}>
                        {categoryLabels[document.category as keyof typeof categoryLabels] || 'Otros'}
                      </Badge>
                    </div>
                    
                    {document.description && (
                      <p className="text-sm text-muted-foreground">
                        {document.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Subido por: {document.uploaded_by.full_name}</span>
                      <span>•</span>
                      <span>{formatDate(document.created_at)}</span>
                      {document.client && (
                        <>
                          <span>•</span>
                          <span>Cliente: {document.client.full_name}</span>
                        </>
                      )}
                      {document.project && (
                        <>
                          <span>•</span>
                          <span>Proyecto: {document.project.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleView(document)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDownload(document)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDelete(document.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredDocuments.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground">No se encontraron documentos</p>
              <p className="text-sm text-muted-foreground">Sube tu primer documento para comenzar</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Document Viewer */}
      <DocumentViewer
        isOpen={viewerState.isOpen}
        onClose={() => setViewerState({ ...viewerState, isOpen: false })}
        documentUrl={viewerState.documentUrl}
        documentName={viewerState.documentName}
        fileType={viewerState.fileType}
      />
    </div>
  );
}