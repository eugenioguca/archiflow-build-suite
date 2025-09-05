import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMayoresTU } from '@/hooks/gantt-v2/useMayoresTU';
import { getCurrentMonth } from '@/utils/gantt-v2/monthRange';

const mayorSchema = z.object({
  mayor_id: z.string().min(1, "Debe seleccionar un mayor"),
  amount: z.number().min(0.01, "El importe debe ser mayor a 0"),
  start_month: z.string().min(1, "Debe seleccionar el mes de inicio"),
  start_week: z.number().min(1).max(4, "Selecciona una semana válida"),
  end_month: z.string().min(1, "Debe seleccionar el mes de fin"),
  end_week: z.number().min(1).max(4, "Selecciona una semana válida"),
}).refine((data) => {
  const startMonthNum = parseInt(data.start_month);
  const endMonthNum = parseInt(data.end_month);
  
  if (startMonthNum > endMonthNum) return false;
  if (startMonthNum === endMonthNum && data.start_week > data.end_week) return false;
  
  return true;
}, {
  message: "La fecha de fin debe ser posterior a la fecha de inicio",
  path: ["end_week"],
});

interface MayorSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    mayor_id: string;
    amount: number;
    start_month: string;
    start_week: number;
    end_month: string;
    end_week: number;
  }) => void;
  initialData?: {
    mayor_id?: string;
    amount?: number;
    start_month?: string;
    start_week?: number;
    end_month?: string;
    end_week?: number;
  };
  title: string;
}

export function MayorSelectionModal({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  title
}: MayorSelectionModalProps) {
  const { data: mayores = [], isLoading: loadingMayores } = useMayoresTU();
  
  const form = useForm({
    resolver: zodResolver(mayorSchema),
    defaultValues: {
      mayor_id: initialData?.mayor_id || '',
      amount: initialData?.amount || 0,
      start_month: initialData?.start_month || getCurrentMonth(),
      start_week: initialData?.start_week || 1,
      end_month: initialData?.end_month || getCurrentMonth(),
      end_week: initialData?.end_week || 4,
    }
  });

  const handleSubmit = (data: any) => {
    onSubmit(data);
    form.reset();
    onOpenChange(false);
  };

  const mayorOptions = mayores.map(mayor => ({
    value: mayor.id,
    label: `${mayor.codigo} - ${mayor.nombre}`,
    codigo: mayor.codigo
  }));

  // Generate month options (current month + 24 months)
  const generateMonthOptions = () => {
    const current = getCurrentMonth();
    const currentYear = parseInt(current.substring(0, 4));
    const currentMonth = parseInt(current.substring(4, 6));
    
    const options = [];
    for (let i = 0; i < 24; i++) {
      let year = currentYear;
      let month = currentMonth + i;
      
      while (month > 12) {
        month -= 12;
        year += 1;
      }
      
      const monthStr = String(month).padStart(2, '0');
      const value = `${year}${monthStr}`;
      const label = new Date(year, month - 1, 1).toLocaleDateString('es-MX', { 
        month: 'long', 
        year: 'numeric' 
      });
      
      options.push({ value, label });
    }
    return options;
  };

  const monthOptions = generateMonthOptions();
  const weekOptions = [
    { value: 1, label: 'Semana 1' },
    { value: 2, label: 'Semana 2' },
    { value: 3, label: 'Semana 3' },
    { value: 4, label: 'Semana 4' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Mayor Selection */}
          <div className="space-y-2">
            <Label>Mayor</Label>
            <SearchableCombobox
              items={mayorOptions}
              value={form.watch('mayor_id')}
              onValueChange={(value) => form.setValue('mayor_id', value)}
              placeholder="Buscar mayor..."
              emptyText="No se encontraron mayores"
              disabled={loadingMayores}
            />
            {form.formState.errors.mayor_id && (
              <p className="text-sm text-destructive">
                {form.formState.errors.mayor_id.message}
              </p>
            )}
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label>Importe</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              {...form.register('amount', { valueAsNumber: true })}
            />
            {form.formState.errors.amount && (
              <p className="text-sm text-destructive">
                {form.formState.errors.amount.message}
              </p>
            )}
          </div>

          {/* Start Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mes de Inicio</Label>
              <Controller
                name="start_month"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar mes" />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.start_month && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.start_month.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Semana de Inicio</Label>
              <Controller
                name="start_week"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value?.toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Semana" />
                    </SelectTrigger>
                    <SelectContent>
                      {weekOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.start_week && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.start_week.message}
                </p>
              )}
            </div>
          </div>

          {/* End Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mes de Fin</Label>
              <Controller
                name="end_month"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar mes" />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.end_month && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.end_month.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Semana de Fin</Label>
              <Controller
                name="end_week"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value?.toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Semana" />
                    </SelectTrigger>
                    <SelectContent>
                      {weekOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.end_week && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.end_week.message}
                </p>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.reset();
                onOpenChange(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!form.formState.isValid || loadingMayores}
            >
              Guardar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}