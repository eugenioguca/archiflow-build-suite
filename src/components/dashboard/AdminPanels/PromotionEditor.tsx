import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, X, Star, Save, Plus, Edit, Trash2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Promotion {
  id?: string;
  title: string;
  description: string;
  image_url: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface PromotionEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPromotionUpdated: () => void;
}

export function PromotionEditor({ open, onOpenChange, onPromotionUpdated }: PromotionEditorProps) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [formData, setFormData] = useState<Omit<Promotion, 'id'>>({
    title: '',
    description: '',
    image_url: null,
    start_date: '',
    end_date: '',
    is_active: true
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list');
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchPromotions();
    }
  }, [open]);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('company_promotions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromotions(data || []);
    } catch (error) {
      console.error('Error fetching promotions:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las promociones",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

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
    maxSize: 5 * 1024 * 1024 // 5MB
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      image_url: null,
      start_date: '',
      end_date: '',
      is_active: true
    });
    setSelectedFile(null);
    setPreviewUrl(null);
    setEditingPromotion(null);
  };

  const editPromotion = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      title: promotion.title,
      description: promotion.description,
      image_url: promotion.image_url,
      start_date: promotion.start_date,
      end_date: promotion.end_date,
      is_active: promotion.is_active
    });
    setPreviewUrl(promotion.image_url);
    setActiveTab('form');
  };

  const savePromotion = async () => {
    if (!formData.title || !formData.start_date || !formData.end_date) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      let imageUrl = formData.image_url;

      // Upload new image if selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `promotions/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('promotions')
          .upload(fileName, selectedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('promotions')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      const promotionData = {
        ...formData,
        image_url: imageUrl
      };

      if (editingPromotion?.id) {
        // Update existing promotion
        const { error } = await supabase
          .from('company_promotions')
          .update(promotionData)
          .eq('id', editingPromotion.id);

        if (error) throw error;
      } else {
        // Create new promotion
        const { error } = await supabase
          .from('company_promotions')
          .insert([promotionData]);

        if (error) throw error;
      }

      toast({
        title: "Éxito",
        description: editingPromotion ? "Promoción actualizada" : "Promoción creada"
      });

      resetForm();
      fetchPromotions();
      onPromotionUpdated();
      setActiveTab('list');
    } catch (error) {
      console.error('Error saving promotion:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la promoción",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const deletePromotion = async (promotionId: string) => {
    try {
      const { error } = await supabase
        .from('company_promotions')
        .delete()
        .eq('id', promotionId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Promoción eliminada"
      });

      fetchPromotions();
      onPromotionUpdated();
    } catch (error) {
      console.error('Error deleting promotion:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la promoción",
        variant: "destructive"
      });
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (previewUrl && !editingPromotion?.image_url) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-warning" />
            Gestionar Promociones Corporativas
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">Lista de Promociones</TabsTrigger>
            <TabsTrigger value="form">
              {editingPromotion ? 'Editar Promoción' : 'Nueva Promoción'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Promociones Activas</h3>
              <Button
                onClick={() => {
                  resetForm();
                  setActiveTab('form');
                }}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nueva Promoción
              </Button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="flex space-x-4">
                        <div className="w-20 h-20 bg-muted rounded"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-3/4"></div>
                          <div className="h-3 bg-muted rounded w-1/2"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : promotions.length === 0 ? (
              <div className="text-center py-8">
                <Star className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No hay promociones creadas</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {promotions.map((promotion) => (
                  <Card key={promotion.id} className="p-4">
                    <div className="flex items-start space-x-4">
                      {promotion.image_url && (
                        <img
                          src={promotion.image_url}
                          alt={promotion.title}
                          className="w-20 h-20 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{promotion.title}</h4>
                            {promotion.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                {promotion.description}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDate(promotion.start_date)} - {formatDate(promotion.end_date)}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={promotion.is_active ? "default" : "secondary"}>
                              {promotion.is_active ? 'Activa' : 'Inactiva'}
                            </Badge>
                            <Button
                              onClick={() => editPromotion(promotion)}
                              variant="outline"
                              size="sm"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              onClick={() => deletePromotion(promotion.id!)}
                              variant="outline"
                              size="sm"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="form" className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Título de la promoción"
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Estado</Label>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        checked={formData.is_active}
                        onChange={() => setFormData({ ...formData, is_active: true })}
                      />
                      <span className="text-sm">Activa</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        checked={!formData.is_active}
                        onChange={() => setFormData({ ...formData, is_active: false })}
                      />
                      <span className="text-sm">Inactiva</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción de la promoción"
                  maxLength={500}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Fecha de inicio *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">Fecha de fin *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div className="space-y-4">
                <Label>Imagen (opcional)</Label>
                
                {!previewUrl ? (
                  <div
                    {...getRootProps()}
                    className={`
                      border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                      ${isDragActive 
                        ? 'border-primary bg-primary/5' 
                        : 'border-muted-foreground/30 hover:border-primary/50'
                      }
                    `}
                  >
                    <input {...getInputProps()} />
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {isDragActive
                        ? 'Suelta la imagen aquí...'
                        : 'Arrastra una imagen aquí o haz clic para seleccionar'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative rounded-lg overflow-hidden">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-40 object-cover"
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
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  resetForm();
                  setActiveTab('list');
                }}
                disabled={uploading}
              >
                Cancelar
              </Button>
              <Button
                onClick={savePromotion}
                disabled={uploading}
                className="min-w-[120px]"
              >
                {uploading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Guardando...
                  </div>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {editingPromotion ? 'Actualizar' : 'Crear'}
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}