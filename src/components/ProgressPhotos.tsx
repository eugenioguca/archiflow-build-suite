import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, Upload, MapPin, Calendar, Eye, Download } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ProgressPhoto {
  id: string;
  photo_url: string;
  thumbnail_url?: string;
  caption?: string;
  location_description?: string;
  camera_angle?: string;
  weather_conditions?: string;
  taken_at: string;
  tags: string[];
  visibility: string;
  phase?: {
    phase_name: string;
  } | null;
  milestone?: {
    milestone_name: string;
  } | null;
}

interface ProgressPhotosProps {
  constructionProjectId: string;
}

export function ProgressPhotos({ constructionProjectId }: ProgressPhotosProps) {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("progress_photos")
        .select(`
          *,
          phase:construction_phases(phase_name),
          milestone:progress_milestones(milestone_name)
        `)
        .eq("construction_project_id", constructionProjectId)
        .order("taken_at", { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error("Error fetching progress photos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (constructionProjectId) {
      fetchPhotos();
    }
  }, [constructionProjectId]);

  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case "public": return "bg-green-100 text-green-800";
      case "client": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Fotos de Progreso</h2>
          <p className="text-muted-foreground">Seguimiento visual del avance de obra</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Subir Fotos
          </Button>
          <Button>
            <Camera className="h-4 w-4 mr-2" />
            Tomar Foto
          </Button>
        </div>
      </div>

      {/* Photo Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{photos.length}</div>
            <p className="text-xs text-muted-foreground">Total de fotos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {photos.filter(p => p.visibility === "client").length}
            </div>
            <p className="text-xs text-muted-foreground">Visibles al cliente</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {photos.filter(p => new Date(p.taken_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
            </div>
            <p className="text-xs text-muted-foreground">Esta semana</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {photos.filter(p => p.phase).length}
            </div>
            <p className="text-xs text-muted-foreground">Por fases</p>
          </CardContent>
        </Card>
      </div>

      {/* Photo Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {photos.map((photo) => (
          <Card key={photo.id} className="overflow-hidden">
            <div className="aspect-video bg-gray-100 relative">
              <img
                src={photo.thumbnail_url || photo.photo_url}
                alt={photo.caption || "Foto de progreso"}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
              />
              <div className="absolute top-2 right-2">
                <Badge className={getVisibilityColor(photo.visibility)}>
                  {photo.visibility === "public" && "Público"}
                  {photo.visibility === "client" && "Cliente"}
                  {photo.visibility === "internal" && "Interno"}
                </Badge>
              </div>
              {photo.weather_conditions && (
                <div className="absolute top-2 left-2">
                  <Badge variant="outline" className="bg-white/80">
                    {photo.weather_conditions}
                  </Badge>
                </div>
              )}
            </div>
            <CardContent className="pt-4">
              <div className="space-y-2">
                {photo.caption && (
                  <h3 className="font-semibold line-clamp-2">{photo.caption}</h3>
                )}
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(photo.taken_at), "dd MMM yyyy, HH:mm", { locale: es })}
                </div>

                {photo.location_description && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {photo.location_description}
                  </div>
                )}

                <div className="flex flex-wrap gap-1">
                  {photo.phase && (
                    <Badge variant="outline" className="text-xs">
                      {photo.phase.phase_name}
                    </Badge>
                  )}
                  {photo.milestone && (
                    <Badge variant="outline" className="text-xs">
                      {photo.milestone.milestone_name}
                    </Badge>
                  )}
                  {photo.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedPhoto(photo)}>
                    <Eye className="h-3 w-3 mr-1" />
                    Ver
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {photos.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Camera className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay fotos de progreso</h3>
            <p className="text-muted-foreground text-center mb-4">
              Comienza a documentar el progreso de la obra subiendo la primera foto.
            </p>
            <div className="flex gap-2">
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Subir Fotos
              </Button>
              <Button>
                <Camera className="h-4 w-4 mr-2" />
                Tomar Foto
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photo Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{selectedPhoto.caption || "Foto de progreso"}</CardTitle>
                  <CardDescription>
                    {format(new Date(selectedPhoto.taken_at), "dd MMMM yyyy, HH:mm", { locale: es })}
                  </CardDescription>
                </div>
                <Button variant="ghost" onClick={() => setSelectedPhoto(null)}>
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="aspect-video bg-gray-100">
                  <img
                    src={selectedPhoto.photo_url}
                    alt={selectedPhoto.caption || "Foto de progreso"}
                    className="w-full h-full object-contain"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {selectedPhoto.location_description && (
                    <div>
                      <h4 className="font-medium mb-1">Ubicación</h4>
                      <p className="text-sm text-muted-foreground">{selectedPhoto.location_description}</p>
                    </div>
                  )}
                  {selectedPhoto.camera_angle && (
                    <div>
                      <h4 className="font-medium mb-1">Ángulo</h4>
                      <p className="text-sm text-muted-foreground">{selectedPhoto.camera_angle}</p>
                    </div>
                  )}
                  {selectedPhoto.weather_conditions && (
                    <div>
                      <h4 className="font-medium mb-1">Condiciones</h4>
                      <p className="text-sm text-muted-foreground">{selectedPhoto.weather_conditions}</p>
                    </div>
                  )}
                  <div>
                    <h4 className="font-medium mb-1">Visibilidad</h4>
                    <Badge className={getVisibilityColor(selectedPhoto.visibility)}>
                      {selectedPhoto.visibility === "public" && "Público"}
                      {selectedPhoto.visibility === "client" && "Cliente"}
                      {selectedPhoto.visibility === "internal" && "Interno"}
                    </Badge>
                  </div>
                </div>

                {selectedPhoto.tags.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Etiquetas</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedPhoto.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}