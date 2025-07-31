import { useState, useEffect } from 'react';
import { Plus, Camera, Search, Calendar, Building2, User, MoreHorizontal, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PhotoGallery } from '@/components/PhotoGallery';
import { uploadFileToStorage, getFileUrl } from '@/lib/fileUtils';

interface ProgressPhoto {
  id: string;
  photo_url: string;
  description: string | null;
  taken_at: string;
  project_id: string;
  taken_by: string;
  project?: {
    id: string;
    name: string;
    client: {
      full_name: string;
    };
  };
  profile?: {
    full_name: string;
  };
}

interface Project {
  id: string;
  name: string;
  client: {
    full_name: string;
  };
}

export default function ProgressPhotos() {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  useEffect(() => {
    fetchPhotos();
    fetchProjects();
  }, []);

  const fetchPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('progress_photos')
        .select(`
          *,
          project:projects(
            id, 
            name,
            client:clients(full_name)
          ),
          profile:profiles!progress_photos_taken_by_fkey(full_name)
        `)
        .order('taken_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las fotos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
        .in('status', ['construction', 'design', 'permits']) // Solo proyectos activos
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handlePhotoUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);

    const formData = new FormData(e.currentTarget);
    const file = formData.get('photo') as File;
    const projectId = formData.get('project_id') as string;
    const description = formData.get('description') as string;

    if (!file) {
      toast({
        title: "Error",
        description: "Selecciona una foto para subir",
        variant: "destructive",
      });
      setUploading(false);
      return;
    }

    if (!projectId) {
      toast({
        title: "Error",
        description: "Selecciona un proyecto",
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

      // Subir archivo real a Storage
      const { filePath, publicUrl } = await uploadFileToStorage(file, {
        bucket: 'progress-photos',
        folder: 'projects',
        generatePublicUrl: true
      });

      // Create photo record
      const photoData = {
        project_id: projectId,
        photo_url: publicUrl!,
        file_path: filePath,
        description: description || null,
        taken_by: profile.id,
        taken_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('progress_photos')
        .insert([photoData]);

      if (error) throw error;

      toast({
        title: "Foto subida",
        description: "La foto de avance se subió correctamente",
      });

      setIsDialogOpen(false);
      fetchPhotos();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo subir la foto",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photoId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta foto?')) return;

    try {
      const { error } = await supabase
        .from('progress_photos')
        .delete()
        .eq('id', photoId);

      if (error) throw error;

      toast({
        title: "Foto eliminada",
        description: "La foto se eliminó correctamente",
      });

      fetchPhotos();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la foto",
        variant: "destructive",
      });
    }
  };

  const filteredPhotos = photos.filter(photo => {
    const matchesSearch = photo.project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         photo.project.client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         photo.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = projectFilter === 'all' || photo.project.id === projectFilter;
    return matchesSearch && matchesProject;
  });

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Agrupar fotos por proyecto para mejor visualización
  const photosByProject = filteredPhotos.reduce((acc, photo) => {
    const projectId = photo.project.id;
    if (!acc[projectId]) {
      acc[projectId] = {
        project: photo.project,
        photos: []
      };
    }
    acc[projectId].photos.push(photo);
    return acc;
  }, {} as Record<string, { project: any; photos: ProgressPhoto[] }>);

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
          <h1 className="text-3xl font-bold">Fotos de Avance</h1>
          <p className="text-muted-foreground">Registro fotográfico del progreso de obras</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Camera className="h-4 w-4 mr-2" />
              Subir Foto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Subir Foto de Avance</DialogTitle>
              <DialogDescription>
                Registra el progreso de la obra con fecha y hora automática
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handlePhotoUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="photo">Foto *</Label>
                <Input
                  id="photo"
                  name="photo"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Se registrará automáticamente la fecha y hora actual
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project_id">Proyecto *</Label>
                <Select name="project_id" required>
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

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={3}
                  placeholder="Describe el avance mostrado en la foto..."
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1" disabled={uploading}>
                  {uploading ? 'Subiendo...' : 'Subir Foto'}
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
            placeholder="Buscar fotos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Filtrar por proyecto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los proyectos</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name} - {project.client.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Galería de fotos agrupadas por proyecto */}
      <div className="space-y-8">
        {Object.entries(photosByProject).map(([projectId, { project, photos }]) => (
          <Card key={projectId}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {project.name}
              </CardTitle>
              <CardDescription>
                Cliente: {project.client.full_name} • {photos.length} foto(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {photos.map((photo) => (
                  <Card key={photo.id} className="overflow-hidden cursor-pointer">
                    <div 
                      className="aspect-video bg-muted overflow-hidden relative group"
                      onClick={() => {
                        setSelectedPhotoIndex(photos.findIndex(p => p.id === photo.id));
                        setIsGalleryOpen(true);
                      }}
                    >
                      <img
                        src={photo.photo_url.startsWith('http') 
                          ? photo.photo_url 
                          : `https://ycbflvptfgrjclzzlxci.supabase.co/storage/v1/object/public/progress-photos/${photo.photo_url}`
                        }
                        alt={photo.description || "Foto de avance"}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder.svg';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </div>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        {photo.description && (
                          <p className="text-sm">{photo.description}</p>
                        )}
                        
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDateTime(photo.taken_at)}
                        </div>
                        
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {photo.profile?.full_name || 'Usuario desconocido'}
                        </div>
                        
                        <div className="flex items-center justify-between pt-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              const fileName = `foto_${photo.project?.name}_${photo.id}.jpg`;
                              const link = document.createElement('a');
                              link.href = photo.photo_url.startsWith('http') 
                                ? photo.photo_url 
                                : `https://ycbflvptfgrjclzzlxci.supabase.co/storage/v1/object/public/progress-photos/${photo.photo_url}`;
                              link.download = fileName;
                              link.target = '_blank';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Descargar
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => handleDelete(photo.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {Object.keys(photosByProject).length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Camera className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground">No se encontraron fotos</p>
              <p className="text-sm text-muted-foreground">Sube tu primera foto de avance para comenzar</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Galería de fotos */}
      <PhotoGallery
        photos={filteredPhotos}
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        initialPhotoIndex={selectedPhotoIndex}
      />
    </div>
  );
}