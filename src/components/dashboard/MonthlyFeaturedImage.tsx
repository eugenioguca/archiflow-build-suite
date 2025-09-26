import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Expand } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ImageViewerModal } from '@/components/ui/image-viewer-modal';

interface MonthlyImage {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string;
  month: number;
  year: number;
  is_active: boolean;
}

export function MonthlyFeaturedImage() {
  const [currentImage, setCurrentImage] = useState<MonthlyImage | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    fetchCurrentImage();
  }, [currentMonth, currentYear]);

  const fetchCurrentImage = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('monthly_featured_images')
        .select('*')
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching monthly image:', error);
        return;
      }

      setCurrentImage(data);
    } catch (error) {
      console.error('Error fetching monthly image:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (month: number) => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[month - 1];
  };

  if (loading) {
    return (
      <Card className="glassmorphic-bg border-0 shadow-lg animate-pulse">
        <CardContent className="p-0">
          <div className="relative h-48 sm:h-64 bg-muted/50 rounded-lg"></div>
        </CardContent>
      </Card>
    );
  }

  if (!currentImage) {
    return (
      <Card className="glassmorphic-bg border-0 shadow-lg">
        <CardContent className="p-6 text-center">
          <div className="flex flex-col items-center justify-center h-32 space-y-4">
            <Calendar className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold text-muted-foreground">
                No hay imagen para {getMonthName(currentMonth)} {currentYear}
              </h3>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="glassmorphic-bg border-0 shadow-lg overflow-hidden group">
        <CardContent className="p-0 relative">
          <div className="relative h-48 sm:h-64 overflow-hidden cursor-pointer" onClick={() => setShowImageViewer(true)}>
            <img
              src={currentImage.image_url}
              alt={currentImage.title || `Imagen de ${getMonthName(currentMonth)}`}
              className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
            />
            
            {/* Expand button overlay */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowImageViewer(true);
                }}
                variant="secondary"
                size="sm"
                className="bg-black/50 hover:bg-black/70 text-white border-white/30"
              >
                <Expand className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
            
            {/* Content overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-white pointer-events-none">
              {currentImage.title && (
                <h2 className="text-xl sm:text-2xl font-bold mb-2 drop-shadow-lg">
                  {currentImage.title}
                </h2>
              )}
              {currentImage.description && (
                <p className="text-sm sm:text-base text-gray-200 drop-shadow-md line-clamp-2">
                  {currentImage.description}
                </p>
              )}
              <div className="mt-3">
                <span className="text-sm text-gray-300 font-medium">
                  {getMonthName(currentMonth)} {currentYear}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Image Viewer Modal */}
      {showImageViewer && (
        <ImageViewerModal
          open={showImageViewer}
          onOpenChange={setShowImageViewer}
          imageUrl={currentImage.image_url}
          title={currentImage.title}
          description={currentImage.description}
        />
      )}
    </>
  );
}