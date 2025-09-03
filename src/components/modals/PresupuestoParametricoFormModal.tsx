import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormField } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import {
  TUDepartamentoField,
  TUMayorField,
  TUPartidaField,
  TUCantidadField,
  TUPrecioUnitarioField,
  TUMontoTotalField,
  useTUCascadingData
} from '@/components/shared/TUFieldComponents';

// Schema validation for Parametrico form
const parametricoFormSchema = z.object({
  departamento_id: z.string().min(1, 'El departamento es requerido'),
  mayor_id: z.string().min(1, 'El mayor es requerido'),
  partida_id: z.string().min(1, 'La partida es requerida'),
  cantidad_requerida: z.number().min(0.01, 'La cantidad debe ser mayor a 0').default(1),
  precio_unitario: z.number().min(0, 'El precio debe ser mayor o igual a 0').default(0),
  monto_total: z.number().min(0).default(0),
});

type ParametricoFormData = z.infer<typeof parametricoFormSchema>;

interface PresupuestoParametricoFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ParametricoFormData) => Promise<void>;
  initialData?: Partial<ParametricoFormData>;
  clienteId?: string;
  proyectoId?: string;
  title?: string;
}

export function PresupuestoParametricoFormModal({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  clienteId,
  proyectoId,
  title = "Nueva Partida - Presupuesto Paramétrico"
}: PresupuestoParametricoFormModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogContentRef = useRef<HTMLDivElement>(null);
  
  // TU cascading data hook
  const { loadDepartamentos } = useTUCascadingData();

  const form = useForm<ParametricoFormData>({
    resolver: zodResolver(parametricoFormSchema),
    defaultValues: {
      departamento_id: '',
      mayor_id: '',
      partida_id: '',
      cantidad_requerida: 1,
      precio_unitario: 0,
      monto_total: 0,
    },
  });

  // Load departamentos when modal opens
  useEffect(() => {
    if (open) {
      loadDepartamentos();
      
      // Set initial data if provided
      if (initialData) {
        form.reset({
          departamento_id: initialData.departamento_id || '',
          mayor_id: initialData.mayor_id || '',
          partida_id: initialData.partida_id || '',
          cantidad_requerida: initialData.cantidad_requerida || 1,
          precio_unitario: initialData.precio_unitario || 0,
          monto_total: initialData.monto_total || 0,
        });
      }
      
      // Auto-select "Construcción" if no initial data
      if (!initialData?.departamento_id) {
        setTimeout(() => {
          form.setValue('departamento_id', 'Construcción');
        }, 500);
      }
    }
  }, [open, initialData, form]);

  // Auto-calculate monto_total when precio_unitario or cantidad_requerida changes
  const precioUnitario = form.watch('precio_unitario') || 0;
  const cantidadRequerida = form.watch('cantidad_requerida') || 1;
  
  useEffect(() => {
    const total = Math.round((precioUnitario * cantidadRequerida) * 100) / 100;
    form.setValue('monto_total', total);
  }, [precioUnitario, cantidadRequerida, form]);

  // Reset dependent fields when parent changes
  const departamentoId = form.watch('departamento_id');
  const mayorId = form.watch('mayor_id');

  useEffect(() => {
    if (departamentoId) {
      form.setValue('mayor_id', '');
      form.setValue('partida_id', '');
    }
  }, [departamentoId, form]);

  useEffect(() => {
    if (mayorId) {
      form.setValue('partida_id', '');
    }
  }, [mayorId, form]);

  const handleSubmit = async (data: ParametricoFormData) => {
    if (!clienteId || !proyectoId) {
      toast({
        title: "Error",
        description: "Cliente y proyecto son requeridos.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmit({
        ...data,
        // Add cliente_id and proyecto_id from props
      });
      
      form.reset();
      onOpenChange(false);
      
    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast({
        title: "Error",
        description: error.message || "Error al guardar la partida",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enhanced keyboard and scroll event handling for SearchableCombobox inside Dialog
  const handleDialogKeyDownCapture = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-combobox-root]')) {
      return; // Let combobox handle this event naturally
    }
    if (e.key === "Escape") {
      onOpenChange(false);
    }
  };

  const handleDialogFocusCapture = (e: React.FocusEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-combobox-root]')) {
      return; // Let combobox manage its own focus
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        ref={dialogContentRef}
        data-dialog-content="parametrico-form"
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        onKeyDownCapture={handleDialogKeyDownCapture}
        onFocusCapture={handleDialogFocusCapture}
        onInteractOutside={(e) => {
          const target = e.target as Element;
          if (target.closest('[data-combobox-root]')) {
            e.preventDefault();
          }
        }}
        onFocusOutside={(e) => {
          const target = e.target as Element;  
          if (target.closest('[data-combobox-root]')) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            📊 {title}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* First row: Departamento | Mayor | Partida */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="departamento_id"
                render={({ field }) => (
                  <TUDepartamentoField
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={false} // Allow changing department if needed
                    portalContainer={dialogContentRef.current}
                  />
                )}
              />

              <FormField
                control={form.control}
                name="mayor_id"
                render={({ field }) => (
                  <TUMayorField
                    departamentoId={departamentoId}
                    value={field.value}
                    onValueChange={field.onChange}
                    portalContainer={dialogContentRef.current}
                  />
                )}
              />

              <FormField
                control={form.control}
                name="partida_id"
                render={({ field }) => (
                  <TUPartidaField
                    mayorId={mayorId}
                    value={field.value}
                    onValueChange={field.onChange}
                    portalContainer={dialogContentRef.current}
                  />
                )}
              />
            </div>

            {/* Second row: Cantidad | Precio Unitario | Monto Total */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="cantidad_requerida"
                render={({ field }) => (
                  <TUCantidadField
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                )}
              />

              <FormField
                control={form.control}
                name="precio_unitario"
                render={({ field }) => (
                  <TUPrecioUnitarioField
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                )}
              />

              <FormField
                control={form.control}
                name="monto_total"
                render={({ field }) => (
                  <TUMontoTotalField
                    value={field.value}
                  />
                )}
              />
            </div>

            {/* Submit buttons */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialData ? 'Actualizar' : 'Crear'} Partida
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}