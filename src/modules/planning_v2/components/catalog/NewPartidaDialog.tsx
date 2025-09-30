/**
 * Dialog for creating a new Partida with WBS mapping and defaults
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { WBSSelector } from './WBSSelector';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  wbs_code: z.string().optional(),
  honorarios_pct_override: z.number().min(0).max(1).nullable(),
  desperdicio_pct_override: z.number().min(0).max(1).nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface NewPartidaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  orderIndex: number;
  budgetDefaults: {
    honorarios_pct_default: number;
    desperdicio_pct_default: number;
  };
}

export function NewPartidaDialog({
  open,
  onOpenChange,
  budgetId,
  orderIndex,
  budgetDefaults,
}: NewPartidaDialogProps) {
  const queryClient = useQueryClient();
  const [showOverrides, setShowOverrides] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      wbs_code: '',
      honorarios_pct_override: null,
      desperdicio_pct_override: null,
    },
  });

  const createPartidaMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Create partida
      const { data: partida, error: partidaError } = await supabase
        .from('planning_partidas')
        .insert({
          budget_id: budgetId,
          name: values.name,
          order_index: orderIndex,
          active: true,
          notes: null,
          honorarios_pct_override: values.honorarios_pct_override,
          desperdicio_pct_override: values.desperdicio_pct_override,
        })
        .select()
        .single();

      if (partidaError) throw partidaError;

      // Calculate effective defaults for the concepto
      const effectiveHonorarios = values.honorarios_pct_override ?? budgetDefaults.honorarios_pct_default;
      const effectiveDesperdicio = values.desperdicio_pct_override ?? budgetDefaults.desperdicio_pct_default;

      // Create initial empty concepto
      const { error: conceptoError } = await supabase
        .from('planning_conceptos')
        .insert({
          partida_id: partida.id,
          code: '',
          short_description: 'Concepto 1',
          long_description: '',
          unit: 'pza',
          cantidad_real: 0,
          desperdicio_pct: effectiveDesperdicio,
          precio_real: 0,
          honorarios_pct: effectiveHonorarios,
          provider: '',
          wbs_code: values.wbs_code || '',
          active: true,
          order_index: 0,
          props: {},
        });

      if (conceptoError) throw conceptoError;

      return partida;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-budget', budgetId] });
      toast.success('Partida creada correctamente');
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('Error creating partida:', error);
      toast.error('Error al crear la partida');
    },
  });

  const onSubmit = (values: FormValues) => {
    createPartidaMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva Partida</DialogTitle>
          <DialogDescription>
            Crea una nueva partida con configuración inicial y mapeo WBS
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la Partida *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Cimentación" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="wbs_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WBS (Opcional)</FormLabel>
                  <FormDescription>
                    Selecciona un Mayor/Subpartida del catálogo TU
                  </FormDescription>
                  <FormControl>
                    <WBSSelector
                      value={field.value || ''}
                      onChange={field.onChange}
                      required={false}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowOverrides(!showOverrides)}
              >
                {showOverrides ? 'Ocultar' : 'Mostrar'} configuración avanzada
              </Button>

              {showOverrides && (
                <div className="space-y-3 p-4 bg-muted/50 rounded-md">
                  <FormField
                    control={form.control}
                    name="honorarios_pct_override"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>% Honorarios</FormLabel>
                        <FormDescription>
                          Default: {(budgetDefaults.honorarios_pct_default * 100).toFixed(2)}%
                        </FormDescription>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            placeholder={(budgetDefaults.honorarios_pct_default * 100).toFixed(2)}
                            value={field.value !== null ? field.value * 100 : ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(val === '' ? null : parseFloat(val) / 100);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="desperdicio_pct_override"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>% Desperdicio</FormLabel>
                        <FormDescription>
                          Default: {(budgetDefaults.desperdicio_pct_default * 100).toFixed(2)}%
                        </FormDescription>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            placeholder={(budgetDefaults.desperdicio_pct_default * 100).toFixed(2)}
                            value={field.value !== null ? field.value * 100 : ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(val === '' ? null : parseFloat(val) / 100);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createPartidaMutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createPartidaMutation.isPending}>
                {createPartidaMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Crear Partida
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
