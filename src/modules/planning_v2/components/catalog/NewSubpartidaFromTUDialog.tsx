/**
 * Dialog para crear Subpartida (Concepto) desde TU
 * Dependiente de la Partida de Planning V2
 */
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { tuAdapter } from '../../adapters/tu';
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
import { SearchableCombobox, type SearchableComboboxItem } from '@/components/ui/searchable-combobox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  tu_subpartida_id: z.string().uuid('Selecciona una Subpartida'),
  unit: z.string().min(1, 'La unidad es requerida'),
  cantidad_real: z.number().min(0).default(0),
  precio_real: z.number().min(0).default(0),
  provider: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface NewSubpartidaFromTUDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  partidaId: string;
  tuPartidaId?: string; // Del mapping de la partida
  orderIndex: number;
  budgetDefaults: {
    honorarios_pct_default: number;
    desperdicio_pct_default: number;
  };
}

export function NewSubpartidaFromTUDialog({
  open,
  onOpenChange,
  budgetId,
  partidaId,
  tuPartidaId,
  orderIndex,
  budgetDefaults,
}: NewSubpartidaFromTUDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tu_subpartida_id: '',
      unit: 'PZA',
      cantidad_real: 0,
      precio_real: 0,
      provider: '',
    },
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  // Cargar Subpartidas de la Partida TU
  const { data: subpartidas = [], isLoading: loadingSubpartidas } = useQuery({
    queryKey: ['tu-subpartidas', tuPartidaId],
    queryFn: () => tuAdapter.getSubpartidas(tuPartidaId),
    enabled: !!tuPartidaId && open,
  });

  const subpartidasItems: SearchableComboboxItem[] = subpartidas.map(s => ({
    value: s.id,
    label: s.nombre,
    codigo: s.codigo,
    searchText: `${s.codigo} ${s.nombre}`.toLowerCase(),
  }));

  const createConceptoMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Obtener detalles de la Subpartida TU
      const subpartida = subpartidas.find(s => s.id === values.tu_subpartida_id);
      if (!subpartida) throw new Error('Subpartida no encontrada');

      const conceptoCode = subpartida.codigo;
      const conceptoDescription = subpartida.nombre;

      // Crear Concepto en planning_conceptos
      const { data: newConcepto, error: conceptoError } = await supabase
        .from('planning_conceptos')
        .insert({
          partida_id: partidaId,
          code: conceptoCode,
          short_description: conceptoDescription,
          long_description: `Subpartida TU: ${subpartida.nombre}`,
          unit: values.unit,
          cantidad_real: values.cantidad_real,
          desperdicio_pct: budgetDefaults.desperdicio_pct_default,
          precio_real: values.precio_real,
          honorarios_pct: budgetDefaults.honorarios_pct_default,
          provider: values.provider || null,
          active: true,
          sumable: true,
          order_index: orderIndex,
          props: {
            tu_import: {
              subpartida_id: values.tu_subpartida_id,
              departamento: 'CONSTRUCCIÓN',
            }
          },
        })
        .select()
        .single();

      if (conceptoError) throw conceptoError;

      return newConcepto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-budget', budgetId] });
      toast.success('Subpartida desde TU agregada correctamente');
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('Error creating concepto from TU:', error);
      toast.error('Error al agregar la subpartida desde TU');
    },
  });

  const onSubmit = (values: FormValues) => {
    createConceptoMutation.mutate(values);
  };

  if (!tuPartidaId) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Agregar Subpartida (desde TU)</DialogTitle>
            <DialogDescription>
              Esta partida no está vinculada a TU. Usa "Nueva Partida (desde TU)" para crear partidas con vinculación TU.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar Subpartida (desde TU)</DialogTitle>
          <DialogDescription>
            Selecciona una Subpartida del catálogo TU e ingresa valores iniciales
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tu_subpartida_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subpartida (TU) *</FormLabel>
                  <FormControl>
                    <SearchableCombobox
                      items={subpartidasItems}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Seleccionar Subpartida..."
                      searchPlaceholder="Buscar por código o nombre..."
                      emptyText="No se encontraron Subpartidas"
                      loading={loadingSubpartidas}
                      showCodes={true}
                      searchFields={['label', 'codigo', 'searchText']}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidad *</FormLabel>
                    <FormControl>
                      <Input placeholder="PZA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cantidad_real"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantidad Real</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="precio_real"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio Real (unitario)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proveedor (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del proveedor..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="p-3 bg-muted/50 rounded-md text-xs space-y-1">
              <p><strong>% Honorarios:</strong> {(budgetDefaults.honorarios_pct_default * 100).toFixed(2)}% (default del presupuesto)</p>
              <p><strong>% Desperdicio:</strong> {(budgetDefaults.desperdicio_pct_default * 100).toFixed(2)}% (default del presupuesto)</p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createConceptoMutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createConceptoMutation.isPending}>
                {createConceptoMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Agregar Concepto
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
