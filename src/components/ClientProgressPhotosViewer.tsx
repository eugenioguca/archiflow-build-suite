import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ProgressPhotosCarousel } from '@/components/ProgressPhotosCarousel';
import {
  Camera,
  Download,
  Calendar,
  Filter,
  Grid3X3,
  ZoomIn
} from 'lucide-react';

interface ProgressPhoto {
  id: string;
  photo_url: string;
  description?: string | null;
  phase_name?: string | null;
  created_at: string;
  photographer_name?: string | null;
}

interface ClientProgressPhotosViewerProps {
  projectId: string;
}

export const ClientProgressPhotosViewer: React.FC<ClientProgressPhotosViewerProps> = ({
  projectId
}) => {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchProgressPhotos();
  }, [projectId]);

  const fetchProgressPhotos = async () => {
    try {
      setLoading(true);

      // Temporalmente simplificado mientras se actualiza la estructura
      const { data, error } = await supabase
        .from('progress_photos')
        .select('id, photo_url, description')
        .eq('project_id', projectId)
        .limit(0); // Temporalmente deshabilitado

      if (error) throw error;

      // Temporalmente simplificado
      const photosWithPhotographer: ProgressPhoto[] = [];

      setPhotos(photosWithPhotographer);
    } catch (error) {
      console.error('Error fetching progress photos:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las fotos de progreso',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoDownload = async (photo: ProgressPhoto) => {
    try {
      // Crear un enlace temporal para descargar la imagen
      const link = document.createElement('a');
      link.href = photo.photo_url;
      link.download = `progreso_${photo.phase_name || 'foto'}_${new Date(photo.created_at).toLocaleDateString()}.jpg`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Descarga iniciada',
        description: 'La foto se está descargando'
      });
    } catch (error) {
      console.error('Error downloading photo:', error);
      toast({
        title: 'Error de descarga',
        description: 'No se pudo descargar la foto',
        variant: 'destructive'
      });
    }
  };

  const getPhaseStats = () => {
    // Simplificado por ahora - agrupar por mes
    const months = [...new Set(photos.map(photo => {
      const date = new Date(photo.created_at);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }))];
    return months.map(month => ({
      name: `${month}`,
      count: photos.filter(photo => {
        const date = new Date(photo.created_at);
        const photoMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return photoMonth === month;
      }).length
    }));
  };

  const phaseStats = getPhaseStats();
  const filteredPhotos = selectedPhase === 'all' 
    ? photos 
    : photos.filter(photo => {
        const date = new Date(photo.created_at);
        const photoMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return photoMonth === selectedPhase;
      });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Fotos de Progreso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas por fase */}
      {phaseStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Progreso por Fase
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {phaseStats.map((phase) => (
                <div
                  key={phase.name}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedPhase === phase.name
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedPhase(phase.name || 'all')}
                >
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary mb-1">
                      {phase.count}
                    </div>
                    <div className="text-sm font-medium">{phase.name}</div>
                    <div className="text-xs text-muted-foreground">fotos</div>
                  </div>
                </div>
              ))}
              
              <div
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedPhase === 'all'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedPhase('all')}
              >
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary mb-1">
                    {photos.length}
                  </div>
                  <div className="text-sm font-medium">Total</div>
                  <div className="text-xs text-muted-foreground">fotos</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Carrusel de fotos */}
      <ProgressPhotosCarousel
        photos={filteredPhotos}
        onPhotoDownload={handlePhotoDownload}
      />

      {/* Resumen del progreso visual */}
      {photos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Resumen Visual del Progreso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary mb-2">
                  {photos.length}
                </div>
                <div className="text-sm font-medium mb-1">Total de Fotos</div>
                <div className="text-xs text-muted-foreground">
                  Documentando el progreso
                </div>
              </div>

              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary mb-2">
                  {phaseStats.length}
                </div>
                <div className="text-sm font-medium mb-1">Fases Documentadas</div>
                <div className="text-xs text-muted-foreground">
                  Etapas con evidencia visual
                </div>
              </div>

              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary mb-2">
                  {photos.length > 0 
                    ? Math.ceil((new Date().getTime() - new Date(photos[photos.length - 1].created_at).getTime()) / (1000 * 60 * 60 * 24))
                    : 0}
                </div>
                <div className="text-sm font-medium mb-1">Días Documentados</div>
                <div className="text-xs text-muted-foreground">
                  Desde la primera foto
                </div>
              </div>
            </div>

            {photos.length > 0 && (
              <div className="mt-6 text-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Descargar todas las fotos (funcionalidad futura)
                    toast({
                      title: 'Función próximamente',
                      description: 'La descarga masiva estará disponible pronto'
                    });
                  }}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Descargar Todas las Fotos
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};