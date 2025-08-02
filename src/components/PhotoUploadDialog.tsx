import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Upload, Camera, Image as ImageIcon } from 'lucide-react';

interface PhotoUploadDialogProps {
  constructionProjectId: string;
  trigger?: React.ReactNode;
  onSave: () => void;
}

export function PhotoUploadDialog({ 
  constructionProjectId, 
  trigger,
  onSave 
}: PhotoUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('progress');
  const [phase, setPhase] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFiles || selectedFiles.length === 0) {
      toast({
        title: "Error",
        description: "Por favor selecciona al menos una foto",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const userData = await supabase.auth.getUser();
      const userId = userData.data.user?.id;

      if (!userId) throw new Error('Usuario no autenticado');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      // Upload each file to Supabase Storage
      const uploadPromises = Array.from(selectedFiles).map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${constructionProjectId}_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `construction/${constructionProjectId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('progress-photos')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('progress-photos')
          .getPublicUrl(filePath);

        return {
          file_path: filePath,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);

      // Create progress photo records (one per file)
      const photoRecords = uploadedFiles.map(file => ({
        construction_project_id: constructionProjectId,
        project_id: constructionProjectId, // Required field
        photo_url: file.file_url,
        file_path: file.file_path,
        photo_date: new Date().toISOString().split('T')[0],
        description: description,
        category: category,
        phase_name: phase || null,
        taken_by: profile.id,
        uploaded_by: profile.id
      }));

      const { error } = await supabase
        .from('progress_photos')
        .insert(photoRecords);

      if (error) throw error;

      toast({
        title: "Fotos subidas",
        description: `${uploadedFiles.length} foto(s) subida(s) exitosamente`
      });

      setOpen(false);
      onSave();
      
      // Reset form
      setSelectedFiles(null);
      setDescription('');
      setCategory('progress');
      setPhase('');
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast({
        title: "Error",
        description: "No se pudieron subir las fotos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      // Check if we can access the camera
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        toast({
          title: "Cámara",
          description: "Funcionalidad de cámara en desarrollo. Por favor usa el botón de subir archivos."
        });
      } else {
        toast({
          title: "Cámara no disponible",
          description: "Tu dispositivo no soporta acceso a la cámara",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Error",
        description: "No se pudo acceder a la cámara",
        variant: "destructive"
      });
    }
  };

  const categories = [
    { value: 'progress', label: 'Progreso General' },
    { value: 'phase', label: 'Fase Específica' },
    { value: 'materials', label: 'Materiales' },
    { value: 'quality', label: 'Control de Calidad' },
    { value: 'safety', label: 'Seguridad' },
    { value: 'issues', label: 'Problemas/Incidencias' },
    { value: 'completion', label: 'Finalización' }
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Subir Fotos
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Subir Fotos de Progreso
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="photos">Seleccionar Fotos *</Label>
            <Input
              id="photos"
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setSelectedFiles(e.target.files)}
              required
            />
            <p className="text-sm text-muted-foreground">
              Puedes seleccionar múltiples fotos. Formatos soportados: JPG, PNG, HEIC
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoría *</Label>
            <Select 
              value={category} 
              onValueChange={setCategory}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phase">Fase (opcional)</Label>
            <Input
              id="phase"
              value={phase}
              onChange={(e) => setPhase(e.target.value)}
              placeholder="Ej: Cimentación, Estructura, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe qué se muestra en las fotos..."
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Subiendo...' : 'Subir Fotos'}
              </Button>
            </div>
            <div className="flex justify-center">
              <Button type="button" variant="outline" onClick={handleTakePhoto} className="w-full">
                <Camera className="h-4 w-4 mr-2" />
                Tomar Foto con Cámara
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}