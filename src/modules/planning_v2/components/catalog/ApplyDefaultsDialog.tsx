/**
 * Dialog for applying budget defaults to existing conceptos
 */
import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { applyDefaults } from '../../services/defaultsService';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const formSchema = z.object({
  applyHonorarios: z.boolean(),
  applyDesperdicio: z.boolean(),
}).refine(data => data.applyHonorarios || data.applyDesperdicio, {
  message: 'Debes seleccionar al menos un campo para aplicar',
});

interface ApplyDefaultsDialogProps {
  open: boolean;
  onClose: () => void;
  budgetId: string;
  budgetSettings: any;
}

export function ApplyDefaultsDialog({ 
  open, 
  onClose, 
  budgetId,
  budgetSettings
}: ApplyDefaultsDialogProps) {
  const [applying, setApplying] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      applyHonorarios: false,
      applyDesperdicio: false,
    },
  });

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const handleApply = async (values: z.infer<typeof formSchema>) => {
    setApplying(true);
    try {
      const result = await applyDefaults({
        budgetId,
        applyHonorarios: values.applyHonorarios,
        applyDesperdicio: values.applyDesperdicio,
      });

      if (result.errors.length > 0) {
        toast.error(`Aplicado con errores: ${result.errors.join(', ')}`);
      } else {
        toast.success(`Defaults aplicados a ${result.updated} conceptos`);
      }

      // Invalidate queries to refresh the catalog
      queryClient.invalidateQueries({ queryKey: ['planning-budget', budgetId] });
      
      handleClose();
    } catch (error: any) {
      console.error('Error applying defaults:', error);
      toast.error(`Error al aplicar defaults: ${error.message}`);
    } finally {
      setApplying(false);
    }
  };

  const honorariosDefault = budgetSettings?.honorarios_pct_default ?? 0.17;
  const desperdicioDefault = budgetSettings?.desperdicio_pct_default ?? 0.05;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Aplicar Defaults del Presupuesto</DialogTitle>
          <DialogDescription>
            Aplica los valores por defecto a los conceptos que tengan campos vacíos (en cero).
            No se sobrescribirán valores ya existentes.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleApply)} className="space-y-4">
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="applyHonorarios"
                render={({ field }) => (
                  <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={applying}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-medium">
                        % Honorarios
                      </FormLabel>
                      <FormDescription>
                        Aplicar {(honorariosDefault * 100).toFixed(2)}% a conceptos con honorarios en 0
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="applyDesperdicio"
                render={({ field }) => (
                  <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={applying}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-medium">
                        % Desperdicio
                      </FormLabel>
                      <FormDescription>
                        Aplicar {(desperdicioDefault * 100).toFixed(2)}% a conceptos con desperdicio en 0
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {form.formState.errors.root && (
              <p className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose} 
                disabled={applying}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={applying}>
                {applying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Aplicando...
                  </>
                ) : (
                  'Aplicar Defaults'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
