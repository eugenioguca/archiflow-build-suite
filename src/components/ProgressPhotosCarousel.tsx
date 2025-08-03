import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Camera, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Calendar,
  User,
  ZoomIn,
  Grid3X3,
  Image as ImageIcon
} from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  CarouselApi,
} from '@/components/ui/carousel';
import { useEffect } from 'react';

interface ProgressPhoto {
  id: string;
  photo_url: string;
  description?: string | null;
  phase_name?: string | null;
  created_at: string;
  photographer_name?: string | null;
}

interface ProgressPhotosCarouselProps {
  photos: ProgressPhoto[];
  onPhotoDownload?: (photo: ProgressPhoto) => void;
}

export const ProgressPhotosCarousel: React.FC<ProgressPhotosCarouselProps> = ({ 
  photos,
  onPhotoDownload
}) => {
  const isMobile = useIsMobile();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'carousel' | 'grid'>(isMobile ? 'grid' : 'carousel');

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Obtener fases únicas
  const phases = [...new Set(photos.map(photo => photo.phase_name).filter(Boolean))];
  
  // Filtrar fotos por fase seleccionada
  const filteredPhotos = selectedPhase === 'all' 
    ? photos 
    : photos.filter(photo => photo.phase_name === selectedPhase);

  // Agrupar fotos por fase para vista de grid
  const groupedPhotos = photos.reduce((groups, photo) => {
    const phase = photo.phase_name || 'Sin fase';
    if (!groups[phase]) {
      groups[phase] = [];
    }
    groups[phase].push(photo);
    return groups;
  }, {} as Record<string, ProgressPhoto[]>);

  if (photos.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Fotos de Avance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Camera className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <p className="font-medium text-lg">No hay fotos de avance</p>
            <p className="text-sm">Las fotos del progreso de construcción aparecerán aquí</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className={isMobile ? 'p-4' : undefined}>
        <CardTitle className={`${isMobile ? 'flex flex-col gap-3' : 'flex items-center justify-between'}`}>
          <span className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            <span className={isMobile ? 'text-base' : ''}>Fotos de Avance</span>
          </span>
          <div className={`flex items-center gap-2 ${isMobile ? 'justify-between' : ''}`}>
            <Badge variant="secondary" className={isMobile ? 'text-xs' : ''}>{photos.length} fotos</Badge>
            {!isMobile && (
              <div className="flex border rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === 'carousel' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('carousel')}
                  className="rounded-none h-8"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-none h-8"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className={`space-y-4 ${isMobile ? 'p-4 pt-0' : ''}`}>
        {/* Filtros de fase */}
        {phases.length > 0 && (
          <div className={`flex flex-wrap gap-2 ${isMobile ? 'gap-1' : ''}`}>
            <Button
              variant={selectedPhase === 'all' ? 'default' : 'outline'}
              size={isMobile ? 'sm' : 'sm'}
              onClick={() => setSelectedPhase('all')}
              className={isMobile ? 'text-xs h-8' : ''}
            >
              Todas ({photos.length})
            </Button>
            {phases.map((phase) => {
              const phaseCount = photos.filter(p => p.phase_name === phase).length;
              return (
                <Button
                  key={phase}
                  variant={selectedPhase === phase ? 'default' : 'outline'}
                  size={isMobile ? 'sm' : 'sm'}
                  onClick={() => setSelectedPhase(phase)}
                  className={isMobile ? 'text-xs h-8' : ''}
                >
                  {isMobile ? `${phase} (${phaseCount})` : `${phase} (${phaseCount})`}
                </Button>
              );
            })}
          </div>
        )}

        {viewMode === 'carousel' ? (
          <div className="space-y-4">
            {/* Carousel Mode */}
            <Carousel setApi={setApi} className="w-full">
              <CarouselContent>
                {filteredPhotos.map((photo) => (
                  <CarouselItem key={photo.id}>
                    <div className="space-y-4">
                      <div className="relative aspect-video bg-muted rounded-lg overflow-hidden group">
                        <img
                          src={photo.photo_url}
                          alt={photo.description || 'Foto de avance'}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onPhotoDownload?.(photo)}
                            className="gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Descargar
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">{photo.description || 'Foto de avance'}</h3>
                          {photo.phase_name && (
                            <Badge variant="outline">{photo.phase_name}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(photo.created_at)}
                          </div>
                          {photo.photographer_name && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {photo.photographer_name}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
            
            {filteredPhotos.length > 1 && (
              <div className="text-center text-sm text-muted-foreground">
                Foto {current} de {count}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Grid Mode */}
            {Object.entries(groupedPhotos).map(([phase, phasePhotos]) => (
              <div key={phase} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{phase}</h3>
                  <Badge variant="outline" className="text-xs">
                    {phasePhotos.length}
                  </Badge>
                </div>
                
                <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'}`}>
                  {phasePhotos.map((photo) => (
                    <div key={photo.id} className="space-y-2">
                      <div className="relative aspect-square bg-muted rounded-lg overflow-hidden group cursor-pointer">
                        <img
                          src={photo.photo_url}
                          alt={photo.description || 'Foto de avance'}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className={`absolute inset-0 bg-black/20 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-300 flex items-center justify-center`}>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onPhotoDownload?.(photo)}
                            className={`${isMobile ? 'h-9 w-9' : 'h-8 w-8'} p-0`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium truncate`}>
                          {photo.description || 'Foto de avance'}
                        </p>
                        <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-muted-foreground`}>
                          {formatDate(photo.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};