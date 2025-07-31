import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Download, X, ZoomIn, ZoomOut, RotateCcw, Calendar, User, MessageSquare } from "lucide-react";

interface Photo {
  id: string;
  photo_url: string;
  description: string | null;
  taken_at: string;
  project_id: string;
  taken_by: string;
  project?: {
    name: string;
  };
  profile?: {
    full_name: string;
  };
}

interface PhotoGalleryProps {
  photos: Photo[];
  isOpen: boolean;
  onClose: () => void;
  initialPhotoIndex?: number;
}

export function PhotoGallery({ photos, isOpen, onClose, initialPhotoIndex = 0 }: PhotoGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialPhotoIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!photos.length) return null;

  const currentPhoto = photos[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
    resetImageState();
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
    resetImageState();
  };

  const resetImageState = () => {
    setZoom(1);
    setRotation(0);
  };

  const handleDownload = async () => {
    try {
      // Descargar preservando el tipo de archivo original
      const response = await fetch(currentPhoto.photo_url);
      if (!response.ok) throw new Error('Error al obtener la imagen');
      
      const blob = await response.blob();
      const link = document.createElement('a');
      const objectUrl = URL.createObjectURL(blob);
      
      // Detectar extensión de la imagen
      const extension = currentPhoto.photo_url.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `foto-${currentPhoto.id}.${extension}`;
      
      link.href = objectUrl;
      link.download = fileName;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpiar el objeto URL
      setTimeout(() => URL.revokeObjectURL(objectUrl), 100);
    } catch (error) {
      console.error('Error downloading photo:', error);
      // Fallback al método tradicional
      const link = document.createElement('a');
      link.href = currentPhoto.photo_url;
      link.download = `foto-${currentPhoto.id}.jpg`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleZoomIn = () => setZoom(zoom * 1.2);
  const handleZoomOut = () => setZoom(zoom / 1.2);
  const handleRotate = () => setRotation((rotation + 90) % 360);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] p-0">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold">
                Galería de Fotos - {currentPhoto.project?.name}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {currentIndex + 1} de {photos.length} fotos
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[50px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button size="sm" variant="outline" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={handleRotate}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Descargar
              </Button>
              <Button size="sm" variant="outline" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Imagen principal */}
          <div className="flex-1 relative bg-black flex items-center justify-center">
            <Button
              variant="outline"
              size="sm"
              className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-white/90 hover:bg-white"
              onClick={handlePrevious}
              disabled={photos.length <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="max-w-full max-h-full overflow-auto p-4">
              <img
                src={currentPhoto.photo_url}
                alt={currentPhoto.description || "Foto del proyecto"}
                className="max-w-full max-h-full object-contain transition-transform duration-200"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center'
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder.svg';
                }}
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-white/90 hover:bg-white"
              onClick={handleNext}
              disabled={photos.length <= 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Panel lateral con información */}
          <div className="w-80 border-l bg-background overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Información de la foto */}
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(currentPhoto.taken_at)}</span>
                    </div>
                    
                    {currentPhoto.profile?.full_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{currentPhoto.profile.full_name}</span>
                      </div>
                    )}

                    {currentPhoto.description && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <span>Descripción</span>
                        </div>
                        <p className="text-sm text-muted-foreground pl-6">
                          {currentPhoto.description}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Miniaturas */}
              <div>
                <h4 className="text-sm font-medium mb-3">Todas las fotos</h4>
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo, index) => (
                    <button
                      key={photo.id}
                      onClick={() => {
                        setCurrentIndex(index);
                        resetImageState();
                      }}
                      className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-colors ${
                        index === currentIndex 
                          ? 'border-primary ring-2 ring-primary/20' 
                          : 'border-transparent hover:border-muted-foreground/50'
                      }`}
                    >
                      <img
                        src={photo.photo_url}
                        alt={photo.description || "Miniatura"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder.svg';
                        }}
                      />
                      {index === currentIndex && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Navegación por teclado */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Navegación:</strong></p>
                <p>← → Cambiar foto</p>
                <p>Escape: Cerrar galería</p>
                <p>Rueda del ratón: Zoom</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook para navegación por teclado
export function usePhotoGalleryKeyboard(
  isOpen: boolean,
  onPrevious: () => void,
  onNext: () => void,
  onClose: () => void
) {
  useState(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          onPrevious();
          break;
        case 'ArrowRight':
          event.preventDefault();
          onNext();
          break;
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });
}