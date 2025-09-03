import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormControl, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/DatePicker';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import {
  TUDepartamentoField,
  TUMayorField,
  useTUCascadingData
} from '@/components/shared/TUFieldComponents';

// Schema validation for Cronograma form
const cronogramaFormSchema = z.object({
  departamento_id: z.string().min(1, 'El departamento es requerido'),
  mayor_id: z.string().min(1, 'El mayor es requerido'),
  fecha_inicio: z.date({ required_error: 'La fecha de inicio es requerida' }),
  fecha_fin: z.date({ required_error: 'La fecha de fin es requerida' }),
  duracion_dias: z.number().min(1, 'La duración debe ser mayor a 0').default(1),
}).refine(
  (data) => data.fecha_fin >= data.fecha_inicio,
  {
    message: "La fecha de fin debe ser posterior o igual a la fecha de inicio",
    path: ["fecha_fin"],
  }
);

type CronogramaFormData = z.infer<typeof cronogramaFormSchema>;

interface CronogramaGanttFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CronogramaFormData) => Promise<void>;
  initialData?: Partial<CronogramaFormData>;
  clienteId?: string;
  proyectoId?: string;
  title?: string;
}

export function CronogramaGanttFormModal({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  clienteId,
  proyectoId,
  title = "Nueva Actividad - Cronograma de Gantt"
}: CronogramaGanttFormModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogContentRef = useRef<HTMLDivElement>(null);
  
  // TU cascading data hook
  const { loadDepartamentos } = useTUCascadingData();

  const form = useForm<CronogramaFormData>({
    resolver: zodResolver(cronogramaFormSchema),
    defaultValues: {
      departamento_id: '',
      mayor_id: '',
      fecha_inicio: new Date(),
      fecha_fin: new Date(),
      duracion_dias: 1,
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
          fecha_inicio: initialData.fecha_inicio || new Date(),
          fecha_fin: initialData.fecha_fin || new Date(),
          duracion_dias: initialData.duracion_dias || 1,
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

  // Auto-calculate duration when dates change
  const fechaInicio = form.watch('fecha_inicio');
  const fechaFin = form.watch('fecha_fin');
  
  useEffect(() => {
    if (fechaInicio && fechaFin) {
      const diffTime = Math.abs(fechaFin.getTime() - fechaInicio.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
      form.setValue('duracion_dias', diffDays);
    }
  }, [fechaInicio, fechaFin, form]);

  // Reset mayor when departamento changes
  const departamentoId = form.watch('departamento_id');

  useEffect(() => {
    if (departamentoId) {
      form.setValue('mayor_id', '');
    }
  }, [departamentoId, form]);

  const handleSubmit = async (data: CronogramaFormData) => {
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
      await onSubmit(data);
      
      form.reset();
      onOpenChange(false);
      
    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast({
        title: "Error",
        description: error.message || "Error al guardar la actividad",
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
        data-dialog-content="cronograma-form"
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
            📅 {title}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* First row: Departamento | Mayor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

            {/* Second row: Fecha Inicio | Fecha Fin | Duración */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="fecha_inicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Inicio *</FormLabel>
                    <FormControl>
                      <DatePicker 
                        date={field.value} 
                        onDateChange={field.onChange}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fecha_fin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Fin *</FormLabel>
                    <FormControl>
                      <DatePicker 
                        date={field.value} 
                        onDateChange={field.onChange}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duracion_dias"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duración (días)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        value={field.value || ""}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          field.onChange(isNaN(val) ? 1 : val);
                        }}
                        className="text-right"
                        placeholder="1"
                        readOnly
                        disabled
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
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
                {initialData ? 'Actualizar' : 'Crear'} Actividad
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}