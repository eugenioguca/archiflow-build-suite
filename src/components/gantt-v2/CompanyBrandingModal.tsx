import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormMessage, FormControl } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const companySchema = z.object({
  company_name: z.string().min(1, 'Nombre de empresa es requerido'),
  address: z.string().min(1, 'Dirección es requerida'),
  phone: z.string().min(1, 'Teléfono es requerido'),
  email: z.string().email('Email inválido'),
  website: z.string().optional(),
  logo_url: z.string().optional(),
  // Campos del proyecto
  project_location: z.string().optional(),
  land_surface_area: z.number().min(0, 'Debe ser un número positivo').optional().nullable(),
  construction_area: z.number().min(0, 'Debe ser un número positivo').optional().nullable(),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface CompanyBrandingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
  projectId?: string;
}

export function CompanyBrandingModal({ 
  open, 
  onOpenChange, 
  clientId, 
  projectId 
}: CompanyBrandingModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      company_name: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      logo_url: '',
      project_location: '',
      land_surface_area: null,
      construction_area: null,
    }
  });

  // Load existing company settings and project data
  useEffect(() => {
    if (open) {
      loadCompanySettings();
    }
  }, [open, clientId, projectId]);

  const loadCompanySettings = async () => {
    try {
      setLoading(true);
      
      // Load company branding
      const { data: existingBranding } = await supabase
        .from('company_branding')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Load project data if available
      let projectData = null;
      if (projectId) {
        const { data } = await supabase
          .from('client_projects')
          .select('project_location, land_surface_area, construction_area')
          .eq('id', projectId)
          .single();
        projectData = data;
      }

      const formData = {
        company_name: existingBranding?.company_name || 'DOVITA CONSTRUCCIONES',
        address: existingBranding?.address || 'Dirección de la empresa',
        phone: existingBranding?.phone || '(555) 123-4567',
        email: existingBranding?.email || 'info@dovita.com',
        website: existingBranding?.website || 'www.dovita.com',
        logo_url: existingBranding?.logo_url || '',
        project_location: projectData?.project_location || '',
        land_surface_area: projectData?.land_surface_area || null,
        construction_area: projectData?.construction_area || null,
      };

      form.reset(formData);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Error",
        description: 'Error al cargar la configuración.',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CompanyFormData) => {
    setLoading(true);
    try {
      // Save company branding
      const { data: existingBranding } = await supabase
        .from('company_branding')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const brandingData = {
        company_name: data.company_name,
        address: data.address,
        phone: data.phone,
        email: data.email,
        website: data.website,
        logo_url: data.logo_url || null,
      };

      if (existingBranding) {
        const { error } = await supabase
          .from('company_branding')
          .update({ ...brandingData, updated_at: new Date().toISOString() })
          .eq('id', existingBranding.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('company_branding')
          .insert({
            ...brandingData,
            created_by: (await supabase.auth.getUser()).data.user?.id || '00000000-0000-0000-0000-000000000000'
          });
        if (error) throw error;
      }

      // Save project data if projectId is provided
      if (projectId) {
        const { error: projectError } = await supabase
          .from('client_projects')
          .update({
            project_location: data.project_location || null,
            land_surface_area: data.land_surface_area,
            construction_area: data.construction_area,
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId);

        if (projectError) throw projectError;
      }

      toast({
        title: "Configuración guardada",
        description: "Los datos de la empresa y proyecto se han guardado exitosamente."
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: error.message || 'Error al guardar la configuración.',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Configurar Encabezado</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Información de la Empresa */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Información de la Empresa</h3>
                
                <FormField
                  control={form.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la Empresa</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="DOVITA CONSTRUCCIONES" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Dirección completa de la empresa" rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="(555) 123-4567" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="info@empresa.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sitio Web (Opcional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="www.empresa.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="logo_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL del Logo (Opcional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Información del Proyecto */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Información del Proyecto</h3>
                
                <FormField
                  control={form.control}
                  name="project_location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ubicación</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ubicación del proyecto" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="land_surface_area"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Superficie de Terreno (m²)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="construction_area"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Área de Construcción (m²)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </form>
          </Form>
        </div>

        <div className="flex-shrink-0 flex justify-end gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={form.handleSubmit(onSubmit)} 
            disabled={loading}
          >
            {loading ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}