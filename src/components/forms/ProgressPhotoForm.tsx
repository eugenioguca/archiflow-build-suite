import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DragDropUploader } from "@/components/ui/drag-drop-uploader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const photoSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  description: z.string().optional(),
  category: z.string().min(1, "La categoría es requerida"),
  photographer_name: z.string().min(1, "El nombre del fotógrafo es requerido"),
  phase_id: z.string().optional(),
  is_before_photo: z.boolean().default(false),
  is_after_photo: z.boolean().default(false),
});

type PhotoFormData = z.infer<typeof photoSchema>;

interface ProgressPhotoFormProps {
  projectId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProgressPhotoForm({ projectId, onSuccess, onCancel }: ProgressPhotoFormProps) {
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

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

  const form = useForm<PhotoFormData>({
    resolver: zodResolver(photoSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "General",
      photographer_name: "",
      phase_id: undefined,
      is_before_photo: false,
      is_after_photo: false,
    },
  });

  // Fetch current user profile and set photographer_name
  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .single();
        
        if (profile?.full_name && !form.getValues("photographer_name")) {
          form.setValue("photographer_name", profile.full_name);
        }
      }
    };

    fetchUserProfile();
  }, [form]);

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
    if (files.length > 0 && !form.getValues("title")) {
      form.setValue("title", `Foto de progreso - ${files[0].name.split('.')[0]}`);
    }
  };

  const uploadPhoto = async (file: File): Promise<string> => {
    // Sanitize filename to remove invalid characters for storage keys
    const sanitizedFileName = file.name
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace invalid chars with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores
      .toLowerCase();
    
    const fileName = `${Date.now()}-${sanitizedFileName}`;
    const filePath = `${projectId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from("progress-photos")
      .upload(filePath, file);

    if (error) {
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from("progress-photos")
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const onSubmit = async (data: PhotoFormData) => {
    if (selectedFiles.length === 0) {
      toast.error("Selecciona al menos una foto");
      return;
    }

    try {
      setLoading(true);

      // Get current user profile
      const { data: user } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.user?.id)
        .single();

      if (!profile) {
        toast.error("Error al obtener el perfil del usuario");
        return;
      }

      const uploadPromises = selectedFiles.map(async (file, index) => {
        try {
          const photoUrl = await uploadPhoto(file);
          
          // Get GPS coordinates if available
          let latitude = null;
          let longitude = null;
          let gpsAccuracy = null;

          if (navigator.geolocation) {
            try {
              const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                  enableHighAccuracy: true,
                  timeout: 5000,
                  maximumAge: 300000
                });
              });
              latitude = position.coords.latitude;
              longitude = position.coords.longitude;
              gpsAccuracy = position.coords.accuracy;
            } catch (gpsError) {
              
            }
          }

          const photoData = {
            project_id: projectId,
            photo_url: photoUrl,
            description: data.description || null,
            taken_by: profile.id,
            phase_id: data.phase_id || null,
            title: selectedFiles.length > 1 ? `${data.title} (${index + 1})` : data.title,
            coordinates: latitude && longitude ? { latitude, longitude, accuracy: gpsAccuracy } : null,
            weather_conditions: null,
            tags: [],
            is_before_photo: data.is_before_photo,
            before_photo_id: null,
            visibility: "internal",
            photo_type: "progress",
            geolocation: latitude && longitude ? { latitude, longitude, accuracy: gpsAccuracy } : {},
            photographer_name: data.photographer_name,
            camera_settings: {},
            markup_data: {},
            quality_rating: 5,
            technical_specifications: {
              upload_source: "web",
              user_agent: navigator.userAgent,
              timestamp: new Date().toISOString()
            }
          };

          return supabase
            .from("progress_photos")
            .insert(photoData);
        } catch (error) {
          console.error(`Error uploading file ${file.name}:`, error);
          throw error;
        }
      });

      const results = await Promise.all(uploadPromises);
      
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        console.error("Upload errors:", errors);
        toast.error("Error al subir algunas fotos");
        return;
      }

      toast.success(`${selectedFiles.length} foto(s) subida(s) exitosamente`);
      onSuccess();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al subir las fotos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label>Seleccionar Fotos</Label>
            <DragDropUploader
              onFilesSelected={handleFilesSelected}
              accept={{
                'image/*': ['.jpg', '.jpeg', '.png', '.webp']
              }}
              maxSize={10 * 1024 * 1024} // 10MB
              multiple={true}
            />
            {selectedFiles.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                {selectedFiles.length} archivo(s) seleccionado(s)
              </p>
            )}
          </div>

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Avance de cimentación sector A" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Descripción detallada del progreso mostrado en las fotos..." 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoría</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="photographer_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tomada por</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Nombre del fotógrafo"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="is_before_photo"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="rounded"
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-normal">
                    Foto "Antes"
                  </FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_after_photo"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="rounded"
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-normal">
                    Foto "Después"
                  </FormLabel>
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading || selectedFiles.length === 0}>
            {loading ? "Subiendo..." : "Subir Fotos"}
          </Button>
        </div>
      </form>
    </Form>
  );
}