import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generateMonthRange } from '@/utils/gantt-v2/monthRange';
import { expandRangeToMonthWeekCells } from '@/utils/gantt-v2/weekMath';

const yyyyMm = /^(19|20)\d{2}(0[1-9]|1[0-2])$/;

const activitySchema = z.object({
  start_month: z.string().regex(yyyyMm, "Formato de mes inválido"),
  start_week: z.number().int().min(1).max(4),
  end_month: z.string().regex(yyyyMm, "Formato de mes inválido"),
  end_week: z.number().int().min(1).max(4),
}).refine((data) => {
  const startNum = parseInt(data.start_month);
  const endNum = parseInt(data.end_month);
  if (startNum > endNum) return false;
  if (startNum === endNum && data.start_week > data.end_week) return false;
  return true;
}, {
  message: "La fecha de fin debe ser posterior o igual a la fecha de inicio",
  path: ["end_month"]
});

interface ActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  initialData?: {
    start_month?: string;
    start_week?: number;
    end_month?: string;
    end_week?: number;
  };
  title: string;
}

export function ActivityModal({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  title
}: ActivityModalProps) {
  const form = useForm({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      start_month: initialData?.start_month || '',
      start_week: initialData?.start_week || 1,
      end_month: initialData?.end_month || '',
      end_week: initialData?.end_week || 1,
    }
  });

  // Generate month options (current month ± 12 months)
  const currentMonth = new Date();
  currentMonth.setMonth(currentMonth.getMonth() - 12);
  const monthOptions = generateMonthRange(
    `${currentMonth.getFullYear()}${String(currentMonth.getMonth() + 1).padStart(2, '0')}`,
    25
  );

  const watchedValues = form.watch();
  let previewCells: Array<{month: string, week: number}> = [];
  
  try {
    if (watchedValues.start_month && watchedValues.end_month) {
      previewCells = expandRangeToMonthWeekCells(
        watchedValues.start_month,
        watchedValues.start_week,
        watchedValues.end_month,
        watchedValues.end_week
      );
    }
  } catch (error) {
    // Invalid range, show empty preview
  }

  const handleSubmit = (data: any) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Start Month */}
            <div className="space-y-2">
              <Label>Mes inicial</Label>
              <Select
                value={form.watch('start_month')}
                onValueChange={(value) => form.setValue('start_month', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar mes" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.start_month && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.start_month.message}
                </p>
              )}
            </div>

            {/* Start Week */}
            <div className="space-y-2">
              <Label>Semana inicial</Label>
              <Select
                value={String(form.watch('start_week'))}
                onValueChange={(value) => form.setValue('start_week', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Semana 1</SelectItem>
                  <SelectItem value="2">Semana 2</SelectItem>
                  <SelectItem value="3">Semana 3</SelectItem>
                  <SelectItem value="4">Semana 4</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.start_week && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.start_week.message}
                </p>
              )}
            </div>

            {/* End Month */}
            <div className="space-y-2">
              <Label>Mes final</Label>
              <Select
                value={form.watch('end_month')}
                onValueChange={(value) => form.setValue('end_month', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar mes" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.end_month && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.end_month.message}
                </p>
              )}
            </div>

            {/* End Week */}
            <div className="space-y-2">
              <Label>Semana final</Label>
              <Select
                value={String(form.watch('end_week'))}
                onValueChange={(value) => form.setValue('end_week', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Semana 1</SelectItem>
                  <SelectItem value="2">Semana 2</SelectItem>
                  <SelectItem value="3">Semana 3</SelectItem>
                  <SelectItem value="4">Semana 4</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.end_week && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.end_week.message}
                </p>
              )}
            </div>
          </div>

          {/* Preview */}
          {previewCells.length > 0 && (
            <div className="space-y-2">
              <Label>Vista previa de semanas activas</Label>
              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="text-sm text-muted-foreground mb-2">
                  Semanas cubiertas: {previewCells.length} semanas
                </div>
                <div className="flex flex-wrap gap-1">
                  {previewCells.slice(0, 20).map((cell, index) => {
                    const monthLabel = monthOptions.find(m => m.value === cell.month)?.label || cell.month;
                    return (
                      <div
                        key={index}
                        className="bg-blue-500 text-white text-xs px-2 py-1 rounded"
                      >
                        {monthLabel} W{cell.week}
                      </div>
                    );
                  })}
                  {previewCells.length > 20 && (
                    <div className="text-xs text-muted-foreground px-2 py-1">
                      +{previewCells.length - 20} más...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!form.formState.isValid}
            >
              Guardar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}