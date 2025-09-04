import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormControl, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, Ruler } from 'lucide-react';
import {
  TUDepartamentoField,
  TUMayorField,
  useTUCascadingData
} from '@/components/shared/TUFieldComponents';
import {
  weeksBetween,
  validateMonthWeekRange,
  formatMonth,
  generateMonthRange,
  getCurrentMonth
} from '@/utils/cronogramaWeekUtils';

// Schema validation for modern Gantt activity with YYYY-MM format
const ganttActivitySchema = z.object({
  departamento_id: z.string().min(1, 'El departamento es requerido'),
  mayor_id: z.string().min(1, 'El mayor es requerido'),
  start_month: z.string().regex(/^\d{4}-\d{2}$/, 'Formato de mes inválido'),
  start_week: z.number().min(1).max(4, 'La semana debe estar entre 1 y 4'),
  end_month: z.string().regex(/^\d{4}-\d{2}$/, 'Formato de mes inválido'),
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

type GanttActivityFormData = z.infer<typeof ganttActivitySchema>;

interface ModernGanttActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: GanttActivityFormData) => Promise<void>;
  initialData?: Partial<GanttActivityFormData>;
  clienteId?: string;
  proyectoId?: string;
  title?: string;
}

export function ModernGanttActivityModal({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  clienteId,
  proyectoId,
  title = "Nueva Actividad - Cronograma de Gantt"
}: ModernGanttActivityModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogContentRef = useRef<HTMLDivElement>(null);
  
  // TU cascading data hook
  const { loadDepartamentos } = useTUCascadingData();

  // Generate 24 months starting from current month
  const monthOptions = generateMonthRange(0, 24);

  const form = useForm<GanttActivityFormData>({
    resolver: zodResolver(ganttActivitySchema),
    defaultValues: {
      departamento_id: '',
      mayor_id: '',
      start_month: getCurrentMonth(),
      start_week: 1,
      end_month: getCurrentMonth(),
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
          start_month: initialData.start_month || getCurrentMonth(),
          start_week: initialData.start_week || 1,
          end_month: initialData.end_month || getCurrentMonth(),
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
  }, [open, initialData, form, loadDepartamentos]);

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

  const handleSubmit = async (data: GanttActivityFormData) => {
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
        data-dialog-content="gantt-activity-form"
        className="max-w-5xl max-h-[90vh] overflow-y-auto"
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
            <Calendar className="h-5 w-5 text-primary" />
            {title}
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
                    disabled={false}
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
                      value={field.value} 
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar mes" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {monthOptions.map(month => (
                          <SelectItem key={month} value={month}>
                            {formatMonth(month)}
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

            {/* Third row: End Month | End Week | Duration (Preview) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="end_month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mes de Fin *</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar mes" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {monthOptions.map(month => (
                          <SelectItem key={month} value={month}>
                            {formatMonth(month)}
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
                    <FormLabel className="flex items-center gap-1">
                      <Ruler className="h-4 w-4" />
                      Duración (semanas)
                    </FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted">
                        <span className="text-2xl font-bold text-primary">
                          {field.value || 1}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          semana{field.value !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Mini Preview Section */}
            {form.watch('start_month') && form.watch('end_month') && (
              <div className="p-4 border rounded-lg bg-accent/30">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Vista Previa de la Actividad
                </h4>
                <div className="text-sm space-y-1">
                  <div>
                    <span className="font-medium">Período:</span>{' '}
                    {formatMonth(startMonth)} S{startWeek} → {formatMonth(endMonth)} S{endWeek}
                  </div>
                  <div>
                    <span className="font-medium">Duración:</span>{' '}
                    <span className="font-bold text-primary">{form.watch('duration_weeks')} semanas</span>
                  </div>
                </div>
              </div>
            )}

            {/* Submit buttons */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
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
                className="min-w-[120px]"
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