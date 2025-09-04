import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormControl, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import {
  TUDepartamentoField,
  TUMayorField,
  useTUCascadingData
} from '@/components/shared/TUFieldComponents';
import { weeksBetween, validateMonthWeekRange, formatDateToYYYYMM, getCurrentMonth } from '@/utils/cronogramaWeekUtils';

// Generate month options for the next 24 months starting from current month
const generateMonthOptions = () => {
  const options = [];
  const currentDate = new Date();
  
  for (let i = 0; i < 24; i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
    const value = formatDateToYYYYMM(date);
    const label = date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    options.push({ value, label });
  }
  
  return options;
};

// Schema validation for Cronograma form with month+week model
const cronogramaFormSchema = z.object({
  departamento_id: z.string().min(1, 'El departamento es requerido'),
  mayor_id: z.string().min(1, 'El mayor es requerido'),
  start_month: z.string().min(1, 'El mes de inicio es requerido'),
  start_week: z.number().min(1).max(4, 'La semana debe estar entre 1 y 4'),
  end_month: z.string().min(1, 'El mes de fin es requerido'),
  end_week: z.number().min(1).max(4, 'La semana debe estar entre 1 y 4'),
  duration_weeks: z.number().min(1, 'La duración debe ser mayor a 0').default(1),
}).refine(
  (data) => {
    const validation = validateMonthWeekRange(
      { month: data.start_month, week: data.start_week },
      { month: data.end_month, week: data.end_week }
    );
    return validation.isValid;
  },
  {
    message: "La fecha de fin debe ser posterior o igual a la fecha de inicio",
    path: ["end_month"],
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

  const currentMonth = getCurrentMonth();

  const form = useForm<CronogramaFormData>({
    resolver: zodResolver(cronogramaFormSchema),
    defaultValues: {
      departamento_id: '',
      mayor_id: '',
      start_month: currentMonth,
      start_week: 1,
      end_month: currentMonth,
      end_week: 1,
      duration_weeks: 1,
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
          start_month: initialData.start_month || currentMonth,
          start_week: initialData.start_week || 1,
          end_month: initialData.end_month || currentMonth,
          end_week: initialData.end_week || 1,
          duration_weeks: initialData.duration_weeks || 1,
        });
      }
      
      // Auto-select "Construcción" departamento
      if (!initialData?.departamento_id) {
        setTimeout(() => {
          form.setValue('departamento_id', 'Construcción');
        }, 500);
      }
    }
  }, [open, initialData, form, currentMonth]);

  // Auto-calculate duration when month/week changes
  const startMonth = form.watch('start_month');
  const startWeek = form.watch('start_week');
  const endMonth = form.watch('end_month');
  const endWeek = form.watch('end_week');
  
  useEffect(() => {
    if (startMonth && startWeek && endMonth && endWeek) {
      const duration = weeksBetween(
        { month: startMonth, week: startWeek },
        { month: endMonth, week: endWeek }
      );
      form.setValue('duration_weeks', duration);
    }
  }, [startMonth, startWeek, endMonth, endWeek, form]);

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

            {/* Second row: Start Month | Start Week */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mes de Inicio *</FormLabel>
                    <Select 
                      value={field.value || currentMonth} 
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar mes" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {generateMonthOptions().map(({ value, label }) => (
                          <SelectItem key={value} value={value}>
                            {label}
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
                name="start_week"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Semana de Inicio *</FormLabel>
                    <Select 
                      value={field.value?.toString() || "1"} 
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Semana" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">W1 - Semana 1</SelectItem>
                        <SelectItem value="2">W2 - Semana 2</SelectItem>
                        <SelectItem value="3">W3 - Semana 3</SelectItem>
                        <SelectItem value="4">W4 - Semana 4</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Third row: End Month | End Week | Duration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="end_month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mes de Fin *</FormLabel>
                    <Select 
                      value={field.value || currentMonth} 
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar mes" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {generateMonthOptions().map(({ value, label }) => (
                          <SelectItem key={value} value={value}>
                            {label}
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
                name="end_week"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Semana de Fin *</FormLabel>
                    <Select 
                      value={field.value?.toString() || "1"} 
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Semana" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">W1 - Semana 1</SelectItem>
                        <SelectItem value="2">W2 - Semana 2</SelectItem>
                        <SelectItem value="3">W3 - Semana 3</SelectItem>
                        <SelectItem value="4">W4 - Semana 4</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration_weeks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duración (semanas)</FormLabel>
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