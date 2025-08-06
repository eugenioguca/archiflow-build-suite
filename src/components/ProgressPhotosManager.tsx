import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { 
  Camera, 
  Plus, 
  MapPin, 
  Grid3X3, 
  List, 
  Upload, 
  Search,
  Calendar,
  Download,
  Image as ImageIcon,
  Trash2,
  Edit,
  ZoomIn,
  Eye,
  Filter
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProgressPhotoForm } from "@/components/forms/ProgressPhotoForm";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ProgressPhoto {
  id: string;
  project_id: string;
  photo_url: string;
  description: string | null;
  taken_by: string;
  taken_at: string;
  title: string | null;
  file_path: string | null;
  taken_date: string | null;
  coordinates: any;
  camera_angle: string | null;
  weather_conditions: string | null;
  is_before_photo: boolean;
  before_photo_id: string | null;
  visibility: string;
  work_report_id: string | null;
  inspection_id: string | null;
  equipment_id: string | null;
  photo_type: string;
  geolocation: any;
  photographer_name: string | null;
  camera_settings: any;
  markup_data: any;
  quality_rating: number | null;
  technical_specifications: any;
}

interface ProgressPhotosManagerProps {
  projectId: string;
}

export function ProgressPhotosManager({ projectId }: ProgressPhotosManagerProps) {
  const isMobile = useIsMobile();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPhotoDialog, setNewPhotoDialog] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const categories = [
    "Excavación",
    "Cimentación", 
    "Estructura",
    "Muros",
    "Instalaciones",
    "Acabados",
    "Exterior",
    "Seguridad",
    "General"
  ];

  useEffect(() => {
    fetchPhotos();
  }, [projectId]);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("progress_photos")
        .select(`
          *,
          profiles!progress_photos_taken_by_fkey(full_name)
        `)
        .eq("project_id", projectId)
        .order("taken_at", { ascending: false });

      if (error) {
        console.error("Error fetching progress photos:", error);
        toast.error("Error al cargar las fotos");
        return;
      }

      setPhotos(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar las fotos");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta foto?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("progress_photos")
        .delete()
        .eq("id", photoId);

      if (error) {
        console.error("Error deleting photo:", error);
        toast.error("Error al eliminar la foto");
        return;
      }

      toast.success("Foto eliminada exitosamente");
      fetchPhotos();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al eliminar la foto");
    }
  };

  const filteredPhotos = photos.filter(photo => {
    const matchesSearch = photo.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         photo.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         photo.photo_type?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || photo.photo_type === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const stats = {
    total: photos.length,
    today: photos.filter(p => {
      const today = new Date();
      const photoDate = new Date(p.taken_at);
      return photoDate.toDateString() === today.toDateString();
    }).length,
    thisWeek: photos.filter(p => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return new Date(p.taken_at) >= weekAgo;
    }).length,
    withGPS: photos.filter(p => p.geolocation).length
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando fotos...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Camera className="h-8 w-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Fotos</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.today}</div>
            <div className="text-sm text-muted-foreground">Hoy</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.thisWeek}</div>
            <div className="text-sm text-muted-foreground">Esta Semana</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.withGPS}</div>
            <div className="text-sm text-muted-foreground">Con GPS</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Gestión de Fotos de Avance
              </CardTitle>
              <CardDescription>
                Documentación visual del progreso de construcción
              </CardDescription>
            </div>
            
            <div className="flex gap-2">
              <div className="flex rounded-lg border">
                <Button 
                  variant={viewMode === "grid" ? "default" : "ghost"} 
                  size="sm" 
                  className="rounded-r-none"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button 
                  variant={viewMode === "list" ? "default" : "ghost"} 
                  size="sm" 
                  className="rounded-l-none"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              
              <Dialog open={newPhotoDialog} onOpenChange={setNewPhotoDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Subir Fotos
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[85vh]">
                  <div className="flex flex-col h-full">
                    <DialogHeader className="flex-shrink-0 pb-4">
                      <DialogTitle>Subir Fotos de Progreso</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto">
                      <ProgressPhotoForm
                        projectId={projectId}
                        onSuccess={() => {
                          setNewPhotoDialog(false);
                          fetchPhotos();
                        }}
                        onCancel={() => setNewPhotoDialog(false)}
                      />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar fotos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Photos Display */}
      {filteredPhotos.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">No hay fotos disponibles</p>
            <p className="text-muted-foreground">
              {photos.length === 0 
                ? "Sube las primeras fotos para comenzar a documentar el progreso"
                : "Prueba ajustando los filtros de búsqueda"
              }
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className={`grid grid-cols-1 ${isMobile ? 'sm:grid-cols-2 gap-3' : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6'}`}>
          {filteredPhotos.map((photo) => (
            <Card key={photo.id} className="overflow-hidden">
              <div className="relative aspect-square">
                <img
                  src={photo.photo_url}
                  alt={photo.title || "Foto de progreso"}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 flex gap-1">
                  {photo.is_before_photo && (
                    <Badge variant="secondary" className="text-xs">
                      Antes
                    </Badge>
                  )}
                  {photo.geolocation && (
                    <Badge variant="outline" className="text-xs">
                      <MapPin className="h-3 w-3" />
                    </Badge>
                  )}
                </div>
                <div className="absolute bottom-2 left-2">
                  <Badge variant="outline" className="text-xs bg-white/90">
                    {photo.photo_type}
                  </Badge>
                </div>
              </div>
              
              <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
                <h3 className={`font-medium mb-1 truncate ${isMobile ? 'text-sm' : ''}`}>
                  {photo.title || "Sin título"}
                </h3>
                <p className={`text-sm text-muted-foreground mb-2 line-clamp-2 ${isMobile ? 'text-xs' : ''}`}>
                  {photo.description || "Sin descripción"}
                </p>
                <div className={`flex items-center justify-between text-xs text-muted-foreground mb-3 ${isMobile ? 'mb-2' : ''}`}>
                  <span>{format(new Date(photo.taken_at), "dd/MM/yyyy", { locale: es })}</span>
                </div>
                
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDeletePhoto(photo.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="bg-muted/50">
                    <th className="text-left p-4 font-medium">Imagen</th>
                    <th className="text-left p-4 font-medium">Título</th>
                    <th className="text-left p-4 font-medium">Categoría</th>
                    <th className="text-left p-4 font-medium">Fecha</th>
                    <th className="text-left p-4 font-medium">GPS</th>
                    <th className="text-center p-4 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPhotos.map((photo) => (
                    <tr key={photo.id} className="border-b hover:bg-muted/30">
                      <td className="p-4">
                        <div className="relative w-16 h-16">
                          <img
                            src={photo.photo_url}
                            alt={photo.title || "Foto de progreso"}
                            className="w-full h-full object-cover rounded"
                          />
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <div className="font-medium">{photo.title || "Sin título"}</div>
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {photo.description || "Sin descripción"}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline">{photo.photo_type}</Badge>
                      </td>
                      <td className="p-4 text-sm">
                        {format(new Date(photo.taken_at), "dd/MM/yyyy HH:mm", { locale: es })}
                      </td>
                      <td className="p-4">
                        {photo.geolocation ? (
                          <MapPin className="h-4 w-4 text-green-600" />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedPhoto(photo)}
                          >
                            <ZoomIn className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeletePhoto(photo.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photo Detail Dialog */}
      {selectedPhoto && (
        <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedPhoto.title || "Foto de progreso"}</DialogTitle>
              <DialogDescription>
                {format(new Date(selectedPhoto.taken_at), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={selectedPhoto.photo_url}
                  alt={selectedPhoto.title || "Foto de progreso"}
                  className="w-full max-h-96 object-contain rounded-lg"
                />
              </div>
              
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Detalles</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Tipo:</strong> {selectedPhoto.photo_type}</div>
                    <div><strong>Tomada por:</strong> {selectedPhoto.photographer_name || (selectedPhoto as any).profiles?.full_name || "Usuario desconocido"}</div>
                    {selectedPhoto.description && (
                      <div><strong>Descripción:</strong> {selectedPhoto.description}</div>
                    )}
                  </div>
                </div>
                
                {selectedPhoto.geolocation && (
                  <div>
                    <h4 className="font-medium mb-2">Ubicación GPS</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Coordenadas:</strong> {JSON.stringify(selectedPhoto.geolocation)}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}