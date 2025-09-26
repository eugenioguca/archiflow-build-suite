import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, X, Calendar, Save } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ImageManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImageUpdated: () => void;
}

export function ImageManager({ open, onOpenChange, onImageUpdated }: ImageManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Por favor selecciona una imagen",
        variant: "destructive"
      });
      return;
    }

    console.log('🖼️ Iniciando subida de imagen del mes...', {
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      fileType: selectedFile.type,
      month: currentMonth,
      year: currentYear
    });

    setUploading(true);
    try {
      // First, deactivate any existing image for this month/year
      console.log('🖼️ Desactivando imágenes existentes...');
      const { error: updateError } = await supabase
        .from('monthly_featured_images')
        .update({ is_active: false })
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .eq('is_active', true);

      if (updateError) {
        console.error('Error desactivando imágenes existentes:', updateError);
        throw updateError;
      }

      // Upload the file to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${currentYear}-${currentMonth}-${Date.now()}.${fileExt}`;
      
      console.log('🖼️ Subiendo archivo a Storage...', { fileName });
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('monthly-images')
        .upload(fileName, selectedFile);

      if (uploadError) {
        console.error('Error subiendo archivo:', uploadError);
        toast({
          title: "Error en la subida",
          description: `Error de storage: ${uploadError.message}`,
          variant: "destructive"
        });
        throw uploadError;
      }

      console.log('🖼️ Archivo subido exitosamente:', uploadData);

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('monthly-images')
        .getPublicUrl(fileName);

      console.log('🖼️ URL pública generada:', publicUrl);

      // Insert the new image record
      console.log('🖼️ Insertando registro en base de datos...');
      const { error: insertError } = await supabase
        .from('monthly_featured_images')
        .insert({
          title: title || null,
          description: description || null,
          image_url: publicUrl,
          month: currentMonth,
          year: currentYear,
          is_active: true
        });

      if (insertError) {
        console.error('Error insertando en base de datos:', insertError);
        toast({
          title: "Error guardando datos",
          description: `Error de base de datos: ${insertError.message}`,
          variant: "destructive"
        });
        throw insertError;
      }

      console.log('🖼️ Imagen del mes actualizada exitosamente!');
      toast({
        title: "Éxito",
        description: "Imagen del mes actualizada correctamente"
      });

      onImageUpdated();
      handleClose();
    } catch (error: any) {
      console.error('🖼️ Error completo:', error);
      
      let errorMessage = "No se pudo subir la imagen";
      if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setSelectedFile(null);
    setPreviewUrl(null);
    onOpenChange(false);
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const getMonthName = (month: number) => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[month - 1];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Imagen del Mes - {getMonthName(currentMonth)} {currentYear}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Image Upload Area */}
          <div className="space-y-4">
            <Label>Imagen</Label>
            
            {!selectedFile ? (
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${isDragActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted-foreground/30 hover:border-primary/50'
                  }
                `}
              >
                <input {...getInputProps()} />
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {isDragActive
                    ? 'Suelta la imagen aquí...'
                    : 'Arrastra una imagen aquí o haz clic para seleccionar'
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  JPG, PNG, WEBP (máx. 10MB)
                </p>
              </div>
            ) : (
              <div className="relative">
                <div className="relative rounded-lg overflow-hidden">
                  <img
                    src={previewUrl!}
                    alt="Preview"
                    className="w-full h-64 object-cover"
                  />
                  <Button
                    onClick={removeFile}
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
                </p>
              </div>
            )}
          </div>

          {/* Image Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título (opcional)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título de la imagen del mes"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción de la imagen del mes"
                maxLength={300}
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={uploading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || !selectedFile}
              className="min-w-[120px]"
            >
              {uploading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Subiendo...
                </div>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}