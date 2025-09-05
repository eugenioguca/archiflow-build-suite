import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMayoresTU } from '@/hooks/gantt-v2/useMayoresTU';

const mayorSchema = z.object({
  mayor_id: z.string().min(1, "Debe seleccionar un mayor"),
  amount: z.number().min(0, "El importe debe ser mayor o igual a 0"),
});

interface MayorSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { mayor_id: string; amount: number }) => void;
  initialData?: {
    mayor_id?: string;
    amount?: number;
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
    }
  });

  const handleSubmit = (data: any) => {
    onSubmit(data);
    form.reset();
    onOpenChange(false);
  };

  const mayorOptions = mayores.map(mayor => ({
    value: mayor.id,
    label: `${mayor.codigo} - ${mayor.nombre}`
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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
              min="0"
              placeholder="0.00"
              {...form.register('amount', { valueAsNumber: true })}
            />
            {form.formState.errors.amount && (
              <p className="text-sm text-destructive">
                {form.formState.errors.amount.message}
              </p>
            )}
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