/**
 * Dialog para crear Partida desde TU (Mayor + Partida)
 * Filtrado por budget.settings.tu_mayores si existe
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  tu_mayor_id: z.string().uuid('Selecciona un Mayor'),
  tu_partida_id: z.string().uuid('Selecciona una Partida'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface NewPartidaFromTUDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  orderIndex: number;
  tuMayoresWhitelist?: string[]; // budget.settings.tu_mayores
  preselectedMayorId?: string; // For pre-selecting a Mayor from group header
}

export function NewPartidaFromTUDialog({
  open,
  onOpenChange,
  budgetId,
  orderIndex,
  tuMayoresWhitelist,
  preselectedMayorId,
}: NewPartidaFromTUDialogProps) {
  const queryClient = useQueryClient();
  const [selectedMayorId, setSelectedMayorId] = useState<string | undefined>(preselectedMayorId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tu_mayor_id: preselectedMayorId || '',
      tu_partida_id: '',
      notes: '',
    },
  });

  // Reset selected mayor when dialog closes or when preselectedMayorId changes
  useEffect(() => {
    if (!open) {
      setSelectedMayorId(undefined);
      form.reset();
    } else if (preselectedMayorId) {
      setSelectedMayorId(preselectedMayorId);
      form.setValue('tu_mayor_id', preselectedMayorId);
    }
  }, [open, preselectedMayorId, form]);

  // Cargar Mayores (filtrado si hay whitelist)
  const { data: allMayores = [], isLoading: loadingMayores } = useQuery({
    queryKey: ['tu-mayores', 'CONSTRUCCIÓN'],
    queryFn: () => tuAdapter.getMayores('CONSTRUCCIÓN'),
  });

  const mayoresFiltered = tuMayoresWhitelist && tuMayoresWhitelist.length > 0
    ? allMayores.filter(m => tuMayoresWhitelist.includes(m.id))
    : allMayores;

  const mayoresItems: SearchableComboboxItem[] = mayoresFiltered.map(m => ({
    value: m.id,
    label: m.nombre,
    codigo: m.codigo,
    searchText: `${m.codigo} ${m.nombre}`.toLowerCase(),
  }));

  // Cargar Partidas del Mayor seleccionado
  const { data: partidas = [], isLoading: loadingPartidas } = useQuery({
    queryKey: ['tu-partidas', selectedMayorId],
    queryFn: () => tuAdapter.getPartidas(selectedMayorId),
    enabled: !!selectedMayorId,
  });

  const partidasItems: SearchableComboboxItem[] = partidas.map(p => ({
    value: p.id,
    label: p.nombre,
    codigo: p.codigo,
    searchText: `${p.codigo} ${p.nombre}`.toLowerCase(),
  }));

  const createPartidaMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Obtener detalles del Mayor y Partida TU
      const mayor = allMayores.find(m => m.id === values.tu_mayor_id);
      const partida = partidas.find(p => p.id === values.tu_partida_id);

      if (!mayor || !partida) throw new Error('Mayor o Partida no encontrado');

      // Usar el código de la Partida TU como name (no sintético)
      const partidaCode = partida.codigo;

      // Crear Partida en planning_partidas
      const { data: newPartida, error: partidaError } = await supabase
        .from('planning_partidas')
        .insert({
          budget_id: budgetId,
          name: partidaCode, // Solo el código, no sintético
          order_index: orderIndex,
          active: true,
          notes: values.notes || null,
          honorarios_pct_override: null,
          desperdicio_pct_override: null,
        })
        .select()
        .single();

      if (partidaError) throw partidaError;

      // Crear mapeo TU
      const { data: { user } } = await supabase.auth.getUser();
      const { error: mappingError } = await supabase
        .from('planning_tu_mapping')
        .insert({
          budget_id: budgetId,
          partida_id: newPartida.id,
          tu_departamento: 'CONSTRUCCIÓN',
          tu_mayor_id: values.tu_mayor_id,
          tu_partida_id: values.tu_partida_id,
          created_by: user?.id || '',
          notes: `${mayor.codigo}.${partida.codigo} - ${partida.nombre}`,
        });

      if (mappingError) throw mappingError;

      return newPartida;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-budget', budgetId] });
      queryClient.invalidateQueries({ queryKey: ['planning-tu-mappings', budgetId] });
      toast.success('Partida desde TU creada correctamente');
      form.reset();
      setSelectedMayorId(undefined);
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('Error creating partida from TU:', error);
      toast.error('Error al crear la partida desde TU');
    },
  });

  const onSubmit = (values: FormValues) => {
    createPartidaMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva Partida (desde TU)</DialogTitle>
          <DialogDescription>
            Selecciona un Mayor y Partida del catálogo de Construcción
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tu_mayor_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mayor (TU) *</FormLabel>
                  {tuMayoresWhitelist && tuMayoresWhitelist.length > 0 && (
                    <FormDescription className="text-xs">
                      Filtrado por Mayores seleccionados en el presupuesto
                    </FormDescription>
                  )}
                  {preselectedMayorId && (
                    <FormDescription className="text-xs text-primary">
                      Mayor preseleccionado desde el grupo
                    </FormDescription>
                  )}
                  <FormControl>
                    <SearchableCombobox
                      items={mayoresItems}
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedMayorId(value);
                        form.setValue('tu_partida_id', ''); // Reset partida
                      }}
                      placeholder="Seleccionar Mayor..."
                      searchPlaceholder="Buscar por código o nombre..."
                      emptyText="No se encontraron Mayores"
                      loading={loadingMayores}
                      showCodes={true}
                      searchFields={['label', 'codigo', 'searchText']}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tu_partida_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Partida (TU) *</FormLabel>
                  <FormDescription className="text-xs">
                    {!selectedMayorId && 'Primero selecciona un Mayor'}
                  </FormDescription>
                  <FormControl>
                    <SearchableCombobox
                      items={partidasItems}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Seleccionar Partida..."
                      searchPlaceholder="Buscar por código o nombre..."
                      emptyText={selectedMayorId ? "No se encontraron Partidas" : "Selecciona un Mayor primero"}
                      loading={loadingPartidas}
                      disabled={!selectedMayorId}
                      showCodes={true}
                      searchFields={['label', 'codigo', 'searchText']}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas adicionales sobre esta partida..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
