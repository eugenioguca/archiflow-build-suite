import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Upload, Eye, Palette, Type, Layout, Image, Save, RotateCcw } from 'lucide-react';
import { InvoicePreview } from './InvoicePreview';

interface InvoiceTemplate {
  id: string;
  template_name: string;
  is_active: boolean;
  company_logo_url?: string;
  company_logo_path?: string;
  header_config: any;
  colors_config: any;
  fonts_config: any;
  layout_config: any;
  footer_config: any;
  created_at: string;
}

export function InvoiceTemplateManager() {
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('invoice_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setTemplates(data || []);
      if (data && data.length > 0) {
        setSelectedTemplate(data.find(t => t.is_active) || data[0]);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las plantillas',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedTemplate) return;

    try {
      setUploading(true);
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Por favor selecciona un archivo de imagen válido');
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('El archivo debe ser menor a 5MB');
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `logo_${Date.now()}.${fileExt}`;
      const filePath = `${selectedTemplate.id}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(filePath);

      // Update template with logo info
      const updatedTemplate = {
        ...selectedTemplate,
        company_logo_url: publicUrl,
        company_logo_path: filePath
      };

      await updateTemplate(updatedTemplate);
      
      toast({
        title: 'Éxito',
        description: 'Logo subido correctamente'
      });
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Error',
        description: error.message || 'Error al subir el logo',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  }, [selectedTemplate]);

  const updateTemplate = async (template: InvoiceTemplate) => {
    try {
      const { error } = await supabase
        .from('invoice_templates')
        .update({
          template_name: template.template_name,
          company_logo_url: template.company_logo_url,
          company_logo_path: template.company_logo_path,
          header_config: template.header_config,
          colors_config: template.colors_config,
          fonts_config: template.fonts_config,
          layout_config: template.layout_config,
          footer_config: template.footer_config
        })
        .eq('id', template.id);

      if (error) throw error;

      setSelectedTemplate(template);
      fetchTemplates();
      
      toast({
        title: 'Éxito',
        description: 'Plantilla actualizada correctamente'
      });
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: 'Error',
        description: 'Error al actualizar la plantilla',
        variant: 'destructive'
      });
    }
  };

  const setActiveTemplate = async (templateId: string) => {
    try {
      // Deactivate all templates
      await supabase
        .from('invoice_templates')
        .update({ is_active: false })
        .neq('id', 'dummy');

      // Activate selected template
      const { error } = await supabase
        .from('invoice_templates')
        .update({ is_active: true })
        .eq('id', templateId);

      if (error) throw error;

      fetchTemplates();
      toast({
        title: 'Éxito',
        description: 'Plantilla activada correctamente'
      });
    } catch (error) {
      console.error('Error setting active template:', error);
      toast({
        title: 'Error',
        description: 'Error al activar la plantilla',
        variant: 'destructive'
      });
    }
  };

  const resetToDefaults = () => {
    if (!selectedTemplate) return;
    
    const defaultTemplate = {
      ...selectedTemplate,
      header_config: {
        show_logo: true,
        logo_position: 'left',
        logo_size: 'medium',
        show_company_info: true,
        company_info_position: 'right'
      },
      colors_config: {
        primary_color: '#3B82F6',
        secondary_color: '#64748B',
        accent_color: '#EF4444',
        text_color: '#1F2937',
        background_color: '#FFFFFF'
      },
      fonts_config: {
        title_font: 'Arial',
        title_size: '24',
        subtitle_font: 'Arial',
        subtitle_size: '18',
        body_font: 'Arial',
        body_size: '12'
      }
    };

    setSelectedTemplate(defaultTemplate);
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Cargando plantillas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Configuración de Plantillas</h2>
          <p className="text-muted-foreground">
            Personaliza el formato y diseño de las facturas
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Template Selector */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layout className="h-5 w-5" />
                Plantillas Disponibles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedTemplate?.id === template.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-accent'
                  }`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{template.template_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(template.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {template.is_active && (
                        <Badge variant="default" className="text-xs">
                          Activa
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTemplate(template.id);
                        }}
                        disabled={template.is_active}
                      >
                        {template.is_active ? 'En uso' : 'Activar'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Configuration */}
        <div className="lg:col-span-2">
          {selectedTemplate ? (
            <div className="space-y-6">
              {/* Header & Logo Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="h-5 w-5" />
                    Logo y Encabezado
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Nombre de la Plantilla</Label>
                    <Input
                      value={selectedTemplate.template_name}
                      onChange={(e) =>
                        setSelectedTemplate({
                          ...selectedTemplate,
                          template_name: e.target.value
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label>Logo de la Empresa</Label>
                    <div className="mt-2 space-y-4">
                      {selectedTemplate.company_logo_url && (
                        <div className="flex items-center gap-4">
                          <img
                            src={selectedTemplate.company_logo_url}
                            alt="Logo actual"
                            className="h-16 w-16 object-contain border rounded"
                          />
                          <div>
                            <p className="text-sm font-medium">Logo actual</p>
                            <p className="text-xs text-muted-foreground">
                              Subido correctamente
                            </p>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4">
                        <Button
                          variant="outline"
                          disabled={uploading}
                          onClick={() => document.getElementById('logo-upload')?.click()}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {uploading ? 'Subiendo...' : 'Subir Logo'}
                        </Button>
                        <input
                          id="logo-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        <span className="text-xs text-muted-foreground">
                          PNG, JPG o SVG (máx. 5MB)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Posición del Logo</Label>
                      <Select
                        value={selectedTemplate.header_config?.logo_position || 'left'}
                        onValueChange={(value) =>
                          setSelectedTemplate({
                            ...selectedTemplate,
                            header_config: {
                              ...selectedTemplate.header_config,
                              logo_position: value
                            }
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Izquierda</SelectItem>
                          <SelectItem value="center">Centro</SelectItem>
                          <SelectItem value="right">Derecha</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Tamaño del Logo</Label>
                      <Select
                        value={selectedTemplate.header_config?.logo_size || 'medium'}
                        onValueChange={(value) =>
                          setSelectedTemplate({
                            ...selectedTemplate,
                            header_config: {
                              ...selectedTemplate.header_config,
                              logo_size: value
                            }
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Pequeño</SelectItem>
                          <SelectItem value="medium">Mediano</SelectItem>
                          <SelectItem value="large">Grande</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Colors Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Colores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Color Primario</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={selectedTemplate.colors_config?.primary_color || '#3B82F6'}
                          onChange={(e) =>
                            setSelectedTemplate({
                              ...selectedTemplate,
                              colors_config: {
                                ...selectedTemplate.colors_config,
                                primary_color: e.target.value
                              }
                            })
                          }
                          className="w-16 h-10"
                        />
                        <Input
                          value={selectedTemplate.colors_config?.primary_color || '#3B82F6'}
                          onChange={(e) =>
                            setSelectedTemplate({
                              ...selectedTemplate,
                              colors_config: {
                                ...selectedTemplate.colors_config,
                                primary_color: e.target.value
                              }
                            })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Color Secundario</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={selectedTemplate.colors_config?.secondary_color || '#64748B'}
                          onChange={(e) =>
                            setSelectedTemplate({
                              ...selectedTemplate,
                              colors_config: {
                                ...selectedTemplate.colors_config,
                                secondary_color: e.target.value
                              }
                            })
                          }
                          className="w-16 h-10"
                        />
                        <Input
                          value={selectedTemplate.colors_config?.secondary_color || '#64748B'}
                          onChange={(e) =>
                            setSelectedTemplate({
                              ...selectedTemplate,
                              colors_config: {
                                ...selectedTemplate.colors_config,
                                secondary_color: e.target.value
                              }
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Fonts Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Type className="h-5 w-5" />
                    Tipografía
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Fuente del Título</Label>
                      <Select
                        value={selectedTemplate.fonts_config?.title_font || 'Arial'}
                        onValueChange={(value) =>
                          setSelectedTemplate({
                            ...selectedTemplate,
                            fonts_config: {
                              ...selectedTemplate.fonts_config,
                              title_font: value
                            }
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Arial">Arial</SelectItem>
                          <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                          <SelectItem value="Helvetica">Helvetica</SelectItem>
                          <SelectItem value="Calibri">Calibri</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Tamaño del Título</Label>
                      <Select
                        value={selectedTemplate.fonts_config?.title_size || '24'}
                        onValueChange={(value) =>
                          setSelectedTemplate({
                            ...selectedTemplate,
                            fonts_config: {
                              ...selectedTemplate.fonts_config,
                              title_size: value
                            }
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="18">18pt</SelectItem>
                          <SelectItem value="20">20pt</SelectItem>
                          <SelectItem value="24">24pt</SelectItem>
                          <SelectItem value="28">28pt</SelectItem>
                          <SelectItem value="32">32pt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-between">
                <Button variant="outline" onClick={resetToDefaults}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restaurar Valores por Defecto
                </Button>
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowPreview(true)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Vista Previa
                  </Button>
                  <Button onClick={() => updateTemplate(selectedTemplate)}>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Cambios
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  Selecciona una plantilla para comenzar a configurar
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {selectedTemplate && (
        <InvoicePreview
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          template={selectedTemplate}
        />
      )}
    </div>
  );
}