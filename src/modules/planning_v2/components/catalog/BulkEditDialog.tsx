/**
 * Bulk Edit Dialog - Edit multiple selected rows at once
 */
import { useState, useMemo } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Edit } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateConcepto } from '../../services/budgetService';
import { useSuppliers } from '../../hooks/useSuppliers';

const formSchema = z.object({
  updateHonorarios: z.boolean(),
  honorarios_pct: z.coerce.number().min(0).max(100).optional(),
  updateDesperdicio: z.boolean(),
  desperdicio_pct: z.coerce.number().min(0).max(100).optional(),
  updateProvider: z.boolean(),
  provider_id: z.string().optional(),
}).refine(
  data => data.updateHonorarios || data.updateDesperdicio || data.updateProvider,
  { message: 'Debes seleccionar al menos un campo para actualizar' }
);

type FormValues = z.infer<typeof formSchema>;

interface BulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedConceptos: any[];
  budgetId: string;
}

export function BulkEditDialog({
  open,
  onOpenChange,
  selectedConceptos,
  budgetId,
}: BulkEditDialogProps) {
  const queryClient = useQueryClient();
  const [isApplying, setIsApplying] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');

  // Fetch suppliers
  const { data: suppliersData = [], isLoading: isLoadingSuppliers } = useSuppliers(supplierSearch);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      updateHonorarios: false,
      updateDesperdicio: false,
      updateProvider: false,
    },
  });

  // Transform suppliers to combobox items
  const suppliers: SearchableComboboxItem[] = useMemo(() => {
    return suppliersData.map((supplier) => ({
      value: supplier.id,
      label: supplier.company_name,
      codigo: supplier.rfc || '',
      searchText: `${supplier.company_name} ${supplier.rfc || ''}`,
    }));
  }, [suppliersData]);

  const handleApply = async (values: FormValues) => {
    if (selectedConceptos.length === 0) {
      toast.error('No hay conceptos seleccionados');
      return;
    }

    setIsApplying(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const concepto of selectedConceptos) {
        try {
          const updates: any = {};

          if (values.updateHonorarios && values.honorarios_pct !== undefined) {
            updates.honorarios_pct = values.honorarios_pct / 100; // Convert to decimal
          }

          if (values.updateDesperdicio && values.desperdicio_pct !== undefined) {
            updates.desperdicio_pct = values.desperdicio_pct / 100; // Convert to decimal
          }

          if (values.updateProvider && values.provider_id !== undefined) {
            updates.provider_id = values.provider_id || null;
          }

          if (Object.keys(updates).length > 0) {
            await updateConcepto(concepto.id, updates);
            successCount++;
          }
        } catch (error) {
          console.error(`Error updating concepto ${concepto.id}:`, error);
          errorCount++;
        }
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['planning-budget', budgetId] });
      queryClient.invalidateQueries({ queryKey: ['planning-conceptos', budgetId] });

      if (successCount > 0) {
        toast.success(`${successCount} concepto(s) actualizados exitosamente`);
      }

      if (errorCount > 0) {
        toast.error(`Error al actualizar ${errorCount} concepto(s)`);
      }

      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error in bulk edit:', error);
      toast.error('Error al aplicar cambios masivos');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edición Masiva</DialogTitle>
          <DialogDescription>
            Aplicar cambios a {selectedConceptos.length} concepto(s) seleccionado(s)
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleApply)} className="space-y-4">
            {/* Honorarios */}
            <div className="space-y-2 p-3 border rounded-lg">
              <FormField
                control={form.control}
                name="updateHonorarios"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="cursor-pointer font-medium">
                      % Honorarios
                    </FormLabel>
                  </FormItem>
                )}
              />
              {form.watch('updateHonorarios') && (
                <FormField
                  control={form.control}
                  name="honorarios_pct"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="Ej: 17"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Valor en porcentaje (0-100)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Desperdicio */}
            <div className="space-y-2 p-3 border rounded-lg">
              <FormField
                control={form.control}
                name="updateDesperdicio"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="cursor-pointer font-medium">
                      % Desperdicio
                    </FormLabel>
                  </FormItem>
                )}
              />
              {form.watch('updateDesperdicio') && (
                <FormField
                  control={form.control}
                  name="desperdicio_pct"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="Ej: 5"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Valor en porcentaje (0-100)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Provider */}
            <div className="space-y-2 p-3 border rounded-lg">
              <FormField
                control={form.control}
                name="updateProvider"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="cursor-pointer font-medium">
                      Proveedor
                    </FormLabel>
                  </FormItem>
                )}
              />
              {form.watch('updateProvider') && (
                <FormField
                  control={form.control}
                  name="provider_id"
                  render={({ field }) => (
                    <FormItem>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isApplying}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isApplying}>
                {isApplying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Aplicando...
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Aplicar Cambios
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
