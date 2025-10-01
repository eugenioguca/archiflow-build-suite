/**
 * Dialog para crear Subpartida (Concepto) desde TU
 * Dependiente de la Partida de Planning V2
 */
import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSubpartidasByPartida } from '../../hooks/useSubpartidasByPartida';
import { useSuppliers } from '../../hooks/useSuppliers';
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
import { Loader2, AlertCircle } from 'lucide-react';

const formSchema = z.object({
  tu_subpartida_id: z.string().uuid('Selecciona una Subpartida'),
  unit: z.string().min(1, 'La unidad es requerida'),
  cantidad_real: z.number().min(0).default(0),
  precio_real: z.number().min(0).default(0),
  provider_id: z.string().optional(),
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
  const [subpartidaSearch, setSubpartidaSearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tu_subpartida_id: '',
      unit: 'PZA',
      cantidad_real: 0,
      precio_real: 0,
      provider_id: '',
    },
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset();
      setSubpartidaSearch('');
      setSupplierSearch('');
    }
  }, [open, form]);

  // Cargar Subpartidas de la Partida TU con búsqueda
  const { data: tuSubpartidas = [], isLoading: isLoadingSubpartidas } = useSubpartidasByPartida(
    tuPartidaId,
    subpartidaSearch
  );

  // Fetch suppliers
  const { data: suppliersData = [], isLoading: isLoadingSuppliers } = useSuppliers(supplierSearch);

  const subpartidasItems: SearchableComboboxItem[] = useMemo(() => {
    return tuSubpartidas.map(s => ({
      value: s.id,
      label: s.nombre,
      codigo: s.codigo,
      searchText: `${s.codigo} ${s.nombre}`.toLowerCase(),
    }));
  }, [tuSubpartidas]);

  const suppliers: SearchableComboboxItem[] = useMemo(() => {
    return suppliersData.map((supplier) => ({
      value: supplier.id,
      label: supplier.company_name,
      codigo: supplier.rfc || '',
      searchText: `${supplier.company_name} ${supplier.rfc || ''}`,
    }));
  }, [suppliersData]);

  const createConceptoMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Obtener detalles de la Subpartida TU
      const subpartida = tuSubpartidas.find(s => s.id === values.tu_subpartida_id);
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
          provider_id: values.provider_id || null,
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
              No se puede agregar subpartida desde TU
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-destructive mb-1">
                Esta partida no está vinculada al catálogo TU
              </p>
              <p className="text-muted-foreground">
                Para agregar subpartidas desde TU, primero crea una partida usando el botón "Nueva Partida (desde TU)" en los encabezados de grupo.
              </p>
            </div>
          </div>
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
            Selecciona una Subpartida del catálogo TU para esta partida
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
                  <FormDescription className="text-xs">
                    {isLoadingSubpartidas ? (
                      'Cargando subpartidas...'
                    ) : tuSubpartidas.length === 0 ? (
                      'No hay subpartidas disponibles para esta partida'
                    ) : (
                      `${tuSubpartidas.length} subpartida${tuSubpartidas.length === 1 ? '' : 's'} disponible${tuSubpartidas.length === 1 ? '' : 's'}`
                    )}
                  </FormDescription>
                  <FormControl>
                    <SearchableCombobox
                      items={subpartidasItems}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Seleccionar Subpartida..."
                      searchPlaceholder="Buscar por código o nombre..."
                      emptyText="No se encontraron Subpartidas"
                      loading={isLoadingSubpartidas}
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
              name="provider_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proveedor (opcional)</FormLabel>
                  <FormControl>
                    <SearchableCombobox
                      items={suppliers}
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      placeholder="Seleccionar proveedor..."
                      searchPlaceholder="Buscar por nombre o RFC..."
                      emptyText="No se encontraron proveedores"
                      loading={isLoadingSuppliers}
                      showCodes={true}
                      searchFields={['label', 'codigo']}
                    />
                  </FormControl>
                  <FormDescription>
                    {suppliers.length} proveedores disponibles (búsqueda optimizada)
                  </FormDescription>
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
