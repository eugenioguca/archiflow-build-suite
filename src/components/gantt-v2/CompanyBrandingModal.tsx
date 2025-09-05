import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormMessage, FormControl } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const companyBrandingSchema = z.object({
  company_name: z.string().min(1, 'Nombre de empresa es requerido'),
  website: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type CompanyBrandingFormData = z.infer<typeof companyBrandingSchema>;

interface CompanyBrandingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompanyBrandingModal({ open, onOpenChange }: CompanyBrandingModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  const form = useForm<CompanyBrandingFormData>({
    resolver: zodResolver(companyBrandingSchema),
    defaultValues: {
      company_name: '',
      website: '',
      email: '',
      phone: '',
      address: '',
    }
  });

  // Load existing company branding
  useEffect(() => {
    if (open) {
      loadCompanyBranding();
    }
  }, [open]);

  const loadCompanyBranding = async () => {
    try {
      const { data, error } = await supabase
        .from('company_branding')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading company branding:', error);
        return;
      }

      if (data) {
        setExistingId(data.id);
        form.reset({
          company_name: data.company_name || '',
          website: data.website || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
        });
      } else {
        // Set defaults if no data exists
        form.reset({
          company_name: 'DOVITA CONSTRUCCIONES',
          website: 'www.dovita.com',
          email: 'info@dovita.com',
          phone: '(555) 123-4567',
          address: 'Dirección de la empresa',
        });
      }
    } catch (error) {
      console.error('Error loading company branding:', error);
    }
  };

  const onSubmit = async (data: CompanyBrandingFormData) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Debe estar autenticado para realizar esta acción",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Get current user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        throw new Error('No se encontró el perfil del usuario');
      }

      if (existingId) {
        // Update existing record
        const { error } = await supabase
          .from('company_branding')
          .update({
            ...data,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingId);

        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('company_branding')
          .insert({
            ...data,
            created_by: profile.id
          });

        if (error) throw error;
      }

      toast({
        title: "Configuración guardada",
        description: "Los datos de la empresa se han actualizado correctamente."
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving company branding:', error);
      toast({
        title: "Error",
        description: error.message || 'Error al guardar la configuración de la empresa',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar Encabezado</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sitio Web</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="www.empresa.com" />
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
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Dirección completa de la empresa" rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}