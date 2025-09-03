import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormControl, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import {
  TUSubpartidaField,
  TUUnidadField,
  TUCantidadField,
  TUPrecioUnitarioField,
  TUMontoTotalField,
} from '@/components/shared/TUFieldComponents';

// Schema validation for Ejecutivo form
const ejecutivoFormSchema = z.object({
  departamento_id: z.string().min(1, 'El departamento es requerido'),
  mayor_id: z.string().min(1, 'El mayor es requerido'),
  partida_id: z.string().min(1, 'La partida es requerida'),
  subpartida_id: z.string().min(1, 'La subpartida es requerida'),
  unidad: z.enum(["PZA", "M2", "M3", "ML", "KG", "TON", "LT", "GAL", "M"]).default("PZA"),
  cantidad_requerida: z.number().min(0.01, 'La cantidad debe ser mayor a 0').default(1),
  precio_unitario: z.number().min(0, 'El precio debe ser mayor o igual a 0').default(0),
  monto_total: z.number().min(0).default(0),
});

type EjecutivoFormData = z.infer<typeof ejecutivoFormSchema>;

interface PresupuestoEjecutivoFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: EjecutivoFormData) => Promise<void>;
  initialData?: Partial<EjecutivoFormData>;
  clienteId?: string;
  proyectoId?: string;
  // Fixed values from selected parametrico partida
  departamento?: string;
  mayorId?: string;
  mayorNombre?: string;
  partidaId?: string;
  partidaNombre?: string;
  title?: string;
}

export function PresupuestoEjecutivoFormModal({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  clienteId,
  proyectoId,
  departamento = 'Construcción',
  mayorId,
  mayorNombre,
  partidaId,
  partidaNombre,
  title = "Nueva Subpartida - Presupuesto Ejecutivo"
}: PresupuestoEjecutivoFormModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogContentRef = useRef<HTMLDivElement>(null);

  const form = useForm<EjecutivoFormData>({
    resolver: zodResolver(ejecutivoFormSchema),
    defaultValues: {
      departamento_id: departamento,
      mayor_id: mayorId || '',
      partida_id: partidaId || '',
      subpartida_id: '',
      unidad: 'PZA',
      cantidad_requerida: 1,
      precio_unitario: 0,
      monto_total: 0,
    },
  });

  // Set fixed values when modal opens
  useEffect(() => {
    if (open) {
      form.setValue('departamento_id', departamento);
      if (mayorId) form.setValue('mayor_id', mayorId);
      if (partidaId) form.setValue('partida_id', partidaId);
      
      // Set initial data if provided
      if (initialData) {
        form.reset({
          departamento_id: departamento,
          mayor_id: mayorId || '',
          partida_id: partidaId || '',
          subpartida_id: initialData.subpartida_id || '',
          unidad: initialData.unidad || 'PZA',
          cantidad_requerida: initialData.cantidad_requerida || 1,
          precio_unitario: initialData.precio_unitario || 0,
          monto_total: initialData.monto_total || 0,
        });
      }
    }
  }, [open, initialData, departamento, mayorId, partidaId, form]);

  // Auto-calculate monto_total when precio_unitario or cantidad_requerida changes
  const precioUnitario = form.watch('precio_unitario') || 0;
  const cantidadRequerida = form.watch('cantidad_requerida') || 1;
  
  useEffect(() => {
    const total = Math.round((precioUnitario * cantidadRequerida) * 100) / 100;
    form.setValue('monto_total', total);
  }, [precioUnitario, cantidadRequerida, form]);

  const handleSubmit = async (data: EjecutivoFormData) => {
    if (!clienteId || !proyectoId) {
      toast({
        title: "Error",
        description: "Cliente y proyecto son requeridos.",
        variant: "destructive",
      });
      return;
    }

    if (!partidaId) {
      toast({
        title: "Error",
        description: "Debe seleccionar una partida del presupuesto paramétrico.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmit(data);
      
      form.reset();
      onOpenChange(false);
      
    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast({
        title: "Error",
        description: error.message || "Error al guardar la subpartida",
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
        data-dialog-content="ejecutivo-form"
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
            🔧 {title}
          </DialogTitle>
          {mayorNombre && partidaNombre && (
            <div className="text-sm text-muted-foreground">
              {departamento} → {mayorNombre} → {partidaNombre}
            </div>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Fixed fields display (read-only) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted p-4 rounded-lg">
              <FormItem>
                <FormLabel>Departamento (Fijo)</FormLabel>
                <FormControl>
                  <Input
                    value={departamento}
                    readOnly
                    disabled
                    className="bg-muted-foreground/10"
                  />
                </FormControl>
              </FormItem>

              <FormItem>
                <FormLabel>Mayor (Fijo)</FormLabel>
                <FormControl>
                  <Input
                    value={mayorNombre || 'No seleccionado'}
                    readOnly
                    disabled
                    className="bg-muted-foreground/10"
                  />
                </FormControl>
              </FormItem>

              <FormItem>
                <FormLabel>Partida (Fija)</FormLabel>
                <FormControl>
                  <Input
                    value={partidaNombre || 'No seleccionado'}
                    readOnly
                    disabled
                    className="bg-muted-foreground/10"
                  />
                </FormControl>
              </FormItem>
            </div>

            {/* First row: Subpartida | Unidad */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="subpartida_id"
                render={({ field }) => (
                  <TUSubpartidaField
                    partidaId={partidaId}
                    value={field.value}
                    onValueChange={field.onChange}
                    portalContainer={dialogContentRef.current}
                  />
                )}
              />

              <FormField
                control={form.control}
                name="unidad"
                render={({ field }) => (
                  <TUUnidadField
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
                {initialData ? 'Actualizar' : 'Crear'} Subpartida
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}