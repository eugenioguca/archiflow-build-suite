import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, Calendar, Image as ImageIcon, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MonthlyImage {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string;
  month: number;
  year: number;
  is_active: boolean;
  created_at: string;
}

interface MonthlyImagesGridProps {
  refreshKey: number;
  onImageDeleted: () => void;
}

export function MonthlyImagesGrid({ refreshKey, onImageDeleted }: MonthlyImagesGridProps) {
  const [images, setImages] = useState<MonthlyImage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchImages();
  }, [refreshKey]);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('monthly_featured_images')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) {
        console.error('Error fetching images:', error);
        return;
      }

      setImages(data || []);
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteImage = async (image: MonthlyImage) => {
    try {
      // First, delete the file from storage if it exists
      if (image.image_url) {
        const fileName = image.image_url.split('/').pop();
        if (fileName) {
          const { error: storageError } = await supabase.storage
            .from('monthly-images')
            .remove([fileName]);
          
          if (storageError) {
            console.error('Error deleting file from storage:', storageError);
            // Continue with database deletion even if storage deletion fails
          }
        }
      }

      // Delete the image record from the database
      const { error: dbError } = await supabase
        .from('monthly_featured_images')
        .delete()
        .eq('id', image.id);

      if (dbError) {
        throw dbError;
      }

      toast({
        title: "Imagen eliminada",
        description: `La imagen del mes ${getMonthName(image.month)} ${image.year} ha sido eliminada exitosamente.`,
      });

      // Refresh the images list
      await fetchImages();
      onImageDeleted();
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        title: "Error al eliminar imagen",
        description: "No se pudo eliminar la imagen. Por favor, intenta de nuevo.",
        variant: "destructive",
      });
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
      <Card className="glassmorphic-bg border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-info" />
            Imágenes del Mes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="aspect-video bg-muted rounded-lg animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (images.length === 0) {
    return (
      <Card className="glassmorphic-bg border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-info" />
            Imágenes del Mes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <ImageIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
              No hay imágenes disponibles
            </h3>
            <p className="text-sm text-muted-foreground">
              Las imágenes del mes aparecerán aquí una vez que las subas.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glassmorphic-bg border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-info" />
          Imágenes del Mes ({images.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((image) => (
            <div
              key={image.id}
              className="group relative overflow-hidden rounded-lg border bg-card"
            >
              {/* Image */}
              <div className="aspect-video relative overflow-hidden">
                <img
                  src={image.image_url}
                  alt={image.title || `Imagen del mes ${getMonthName(image.month)} ${image.year}`}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
                
                {/* Status Badge */}
                {image.is_active && (
                  <Badge 
                    className="absolute top-2 left-2 bg-green-500 hover:bg-green-600"
                  >
                    Activa
                  </Badge>
                )}
                
                {/* Actions Overlay */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                    onClick={() => window.open(image.image_url, '_blank')}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 bg-white/90 hover:bg-red-50 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar imagen?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción eliminará permanentemente la imagen del mes {getMonthName(image.month)} {image.year}
                          {image.title && ` "${image.title}"`} y no se podrá recuperar. ¿Estás seguro de que deseas continuar?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteImage(image)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {getMonthName(image.month)} {image.year}
                  </span>
                </div>
                
                {image.title && (
                  <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                    {image.title}
                  </h3>
                )}
                
                {image.description && (
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {image.description}
                  </p>
                )}
                
                <div className="mt-3 text-xs text-muted-foreground">
                  Subida: {new Date(image.created_at).toLocaleDateString('es-ES')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}