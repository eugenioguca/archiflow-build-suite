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

const companySchema = z.object({
  company_name: z.string().min(1, 'Nombre de empresa es requerido'),
  address: z.string().min(1, 'Dirección es requerida'),
  phone: z.string().min(1, 'Teléfono es requerido'),
  email: z.string().email('Email inválido'),
  website: z.string().optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface CompanySettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompanySettingsModal({ open, onOpenChange }: CompanySettingsModalProps) {
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
    }
  });

  // Load existing company settings
  useEffect(() => {
    if (open) {
      loadCompanySettings();
    }
  }, [open]);

  const loadCompanySettings = async () => {
    try {
      // Set default values for now - will be properly implemented after migration
      form.reset({
        company_name: 'DOVITA CONSTRUCCIONES',
        address: 'Dirección de la empresa',
        phone: '(555) 123-4567',
        email: 'info@dovita.com',
        website: 'www.dovita.com',
      });
    } catch (error) {
      console.error('Error loading company settings:', error);
    }
  };

  const onSubmit = async (data: CompanyFormData) => {
    setLoading(true);
    try {
      // For now, just show success - will be properly implemented after migration
      toast({
        title: "Configuración guardada",
        description: "Los datos de la empresa se han guardado temporalmente. Se implementará la persistencia con la migración de base de datos."
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving company settings:', error);
      toast({
        title: "Error",
        description: 'Error al guardar la configuración de la empresa.',
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
          <DialogTitle>Configuración de Empresa</DialogTitle>
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