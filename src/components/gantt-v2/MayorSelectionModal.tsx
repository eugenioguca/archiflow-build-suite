import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormMessage, FormControl } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableCombobox, SearchableComboboxItem } from '@/components/ui/searchable-combobox';
import { MoneyInput } from '@/components/ui/money-input';
import { useMayoresTU } from '@/hooks/gantt-v2/useMayoresTU';
import { getCurrentMonth } from '@/utils/gantt-v2/monthRange';
import { useToast } from '@/hooks/use-toast';

const yyyyMM = /^(19|20)\d{2}(0[1-9]|1[0-2])$/;

const mayorSchema = z.object({
  mayor_id: z.string().uuid('Debe seleccionar un mayor válido'),
  amount: z.number().min(0.01, 'El importe debe ser mayor a 0'),
  start_month: z.string().regex(yyyyMM, 'Formato de mes inválido (YYYYMM)'),
  start_week: z.number().int().min(1).max(4),
  end_month: z.string().regex(yyyyMM, 'Formato de mes inválido (YYYYMM)'),
  end_week: z.number().int().min(1).max(4),
}).refine((data) => {
  const startMonthNum = parseInt(data.start_month);
  const endMonthNum = parseInt(data.end_month);
  
  if (startMonthNum > endMonthNum) return false;
  if (startMonthNum === endMonthNum && data.start_week > data.end_week) return false;
  
  return true;
}, {
  message: "El fin debe ser posterior al inicio",
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
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  
  const isEditing = !!initialData?.mayor_id;
  
  const form = useForm({
    resolver: zodResolver(mayorSchema),
    defaultValues: {
      mayor_id: '',
      amount: 0,
      start_month: getCurrentMonth(),
      start_week: 1,
      end_month: getCurrentMonth(),
      end_week: 4,
    }
  });

  // Reset form with initial data when modal opens for editing
  useEffect(() => {
    if (open && initialData) {
      console.log('[MODAL] Resetting form with initialData:', initialData);
      form.reset({
        mayor_id: initialData.mayor_id || '',
        amount: initialData.amount || 0,
        start_month: initialData.start_month || getCurrentMonth(),
        start_week: initialData.start_week || 1,
        end_month: initialData.end_month || getCurrentMonth(),
        end_week: initialData.end_week || 4,
      });
    } else if (open && !initialData) {
      // Reset to defaults for new entries
      form.reset({
        mayor_id: '',
        amount: 0,
        start_month: getCurrentMonth(),
        start_week: 1,
        end_month: getCurrentMonth(),
        end_week: 4,
      });
    }
  }, [open, initialData, form]);

  // Transform mayors to SearchableComboboxItem format (exactly like in UnifiedTransactionForm)
  const transformToComboboxItems = (mayores: any[]): SearchableComboboxItem[] => {
    return mayores.map(mayor => ({
      value: mayor.id,
      label: `${mayor.codigo} - ${mayor.nombre}`,
      codigo: mayor.codigo,
      searchText: `${mayor.codigo || ''} ${mayor.nombre}`.toLowerCase()
    }));
  };

  const handleSubmit = async (data: any) => {
    try {
      setSaving(true);
      console.log('[MODAL] Submitting data:', data);
      
      await onSubmit(data);
      
      form.reset();
      onOpenChange(false);
      toast({
        title: isEditing ? "Línea actualizada" : "Línea agregada",
        description: isEditing ? "La línea se ha actualizado correctamente." : "La línea se ha guardado correctamente."
      });
    } catch (err: any) {
      console.error('[MODAL] Submit error:', err);
      toast({
        title: "Error",
        description: err.message || 'Error al guardar la línea',
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const mayorOptions = transformToComboboxItems(mayores);

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
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Mayor Selection */}
            <FormField
              control={form.control}
              name="mayor_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Mayor</FormLabel>
                  <FormControl>
                    {isEditing ? (
                      <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
                        {(() => {
                          const selectedMayor = mayores.find(m => m.id === field.value);
                          return selectedMayor ? `${selectedMayor.codigo} - ${selectedMayor.nombre}` : 'Mayor no encontrado';
                        })()}
                      </div>
                    ) : (
                      <SearchableCombobox
                        items={mayorOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Seleccionar mayor"
                        searchPlaceholder="Buscar mayor..."
                        disabled={loadingMayores}
                        showCodes={true}
                        searchFields={['label', 'codigo', 'searchText']}
                        className="w-full"
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount Input */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Importe</FormLabel>
                  <FormControl>
                    <MoneyInput
                      value={field.value || 0}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Start Date */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Mes de Inicio</FormLabel>
                    <FormControl>
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
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="start_week"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Semana de Inicio</FormLabel>
                    <FormControl>
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
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* End Date */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="end_month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Mes de Fin</FormLabel>
                    <FormControl>
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
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_week"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Semana de Fin</FormLabel>
                    <FormControl>
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
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                disabled={saving || !form.formState.isValid || loadingMayores}
              >
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}