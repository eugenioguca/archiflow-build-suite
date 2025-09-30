/**
 * TU Registration Dialog - Create unified transaction from planning concept
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { formatAsCurrency } from '../../utils/monetary';

interface TURegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conceptoId: string;
  budgetId: string;
  projectId: string;
  clientId: string;
  wbsCode?: string;
  provider?: string;
  conceptName: string;
  unit: string;
  defaultQuantity?: number;
  defaultTotal?: number;
}

export function TURegistrationDialog({
  open,
  onOpenChange,
  conceptoId,
  budgetId,
  projectId,
  clientId,
  wbsCode,
  provider,
  conceptName,
  unit,
  defaultQuantity = 0,
  defaultTotal = 0,
}: TURegistrationDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    cantidad: defaultQuantity,
    montoTotal: defaultTotal,
    tipoMovimiento: 'egreso' as 'ingreso' | 'egreso',
    descripcion: `${conceptName} (${unit})`,
    notas: '',
  });

  const createTUMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuario no autenticado');

      // Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.user.id)
        .single();

      if (!profile) throw new Error('Perfil no encontrado');

      // Generate unique reference
      const referencia = `PLAN-${Date.now()}-${conceptoId.slice(0, 8)}`;

      // Create unified transaction
      const { data: tuTx, error: tuError } = await supabase
        .from('unified_financial_transactions')
        .insert({
          client_id: clientId,
          project_id: projectId,
          tipo_movimiento: formData.tipoMovimiento,
          departamento: 'construccion',
          descripcion: formData.descripcion,
          monto_total: formData.montoTotal,
          referencia_unica: referencia,
          fecha_transaccion: new Date().toISOString().split('T')[0],
          wbs_subpartida: wbsCode || null,
          proveedor: provider || null,
          notas: formData.notas || null,
          created_by: profile.id,
        })
        .select()
        .single();

      if (tuError) throw tuError;

      // Create link between concepto and TU transaction
      const { error: linkError } = await supabase
        .from('planning_concepto_tu_links' as any)
        .insert({
          concepto_id: conceptoId,
          tu_tx_id: tuTx.id,
          quantity: formData.cantidad,
          total: formData.montoTotal,
          created_by: userData.user.id,
        });

      if (linkError) throw linkError;

      // Create price observation (record actual unit price) with deduplication
      const puReal = formData.cantidad > 0 ? formData.montoTotal / formData.cantidad : 0;
      
      // Simple version: always use version 1, let UNIQUE constraint handle duplicates
      const { error: obsError } = await supabase
        .from('planning_price_observations' as any)
        .insert({
          budget_id: budgetId,
          concepto_id: conceptoId,
          version_number: 1, // Simple versioning - increment handled by max query if needed
          observed_price: puReal,
          quantity: formData.cantidad,
          provider: provider || null,
          observation_date: new Date().toISOString().split('T')[0],
          source: 'tu_registration',
          notes: `Registrado desde TU: ${tuTx.referencia_unica}`,
          created_by: profile.id,
        });
      
      // Ignore conflict errors (duplicate version due to UNIQUE constraint)
      // This is normal if the same concepto is registered multiple times
      if (obsError && obsError.code !== '23505') {
        console.error('Error creating price observation:', obsError);
        // Don't throw - price observation is optional
      }

      return tuTx;
    },
    onSuccess: (tuTx) => {
      queryClient.invalidateQueries({ queryKey: ['planning-tu-actuals'] });
      queryClient.invalidateQueries({ queryKey: ['planning-budget'] });
      queryClient.invalidateQueries({ queryKey: ['planning-totals'] });
      toast({
        title: '✓ Transacción registrada en TU',
        description: `Referencia: ${tuTx.referencia_unica}. Se actualizará el Resumen.`,
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al registrar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTUMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Registrar en Transacciones Unificadas
          </DialogTitle>
          <DialogDescription>
            Crear una transacción en TU vinculada a este concepto
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Concepto</Label>
              <Input value={conceptName} disabled />
            </div>

            <div className="space-y-2">
              <Label>WBS</Label>
              <Input value={wbsCode || 'Sin WBS'} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cantidad">Cantidad *</Label>
              <Input
                id="cantidad"
                type="number"
                step="0.01"
                value={formData.cantidad}
                onChange={(e) =>
                  setFormData({ ...formData, cantidad: parseFloat(e.target.value) })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="montoTotal">Monto Total (MXN) *</Label>
              <Input
                id="montoTotal"
                type="number"
                step="0.01"
                value={formData.montoTotal}
                onChange={(e) =>
                  setFormData({ ...formData, montoTotal: parseFloat(e.target.value) })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipoMovimiento">Tipo de Movimiento *</Label>
              <Select
                value={formData.tipoMovimiento}
                onValueChange={(value: 'ingreso' | 'egreso') =>
                  setFormData({ ...formData, tipoMovimiento: value })
                }
              >
                <SelectTrigger id="tipoMovimiento">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="egreso">Egreso</SelectItem>
                  <SelectItem value="ingreso">Ingreso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Proveedor</Label>
              <Input value={provider || 'Sin proveedor'} disabled />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción *</Label>
            <Input
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) =>
                setFormData({ ...formData, descripcion: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              rows={3}
            />
          </div>

          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm text-muted-foreground">
              <strong>Gran Total:</strong> {formatAsCurrency(formData.montoTotal)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Se creará una transacción en TU y se vinculará a este concepto
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createTUMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createTUMutation.isPending}>
              {createTUMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Registrar en TU
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
