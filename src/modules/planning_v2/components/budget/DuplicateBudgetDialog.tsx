/**
 * Dialog for duplicating a budget with options
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { duplicateBudget, DuplicateBudgetOptions } from '../../services/budgetDuplicationService';
import { toast } from 'sonner';

interface DuplicateBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  budgetName: string;
}

export function DuplicateBudgetDialog({
  open,
  onOpenChange,
  budgetId,
  budgetName,
}: DuplicateBudgetDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState(`${budgetName} (Copia)`);
  const [preserveQuantities, setPreserveQuantities] = useState(true);
  const [preservePrices, setPreservePrices] = useState(true);

  const duplicateMutation = useMutation({
    mutationFn: async (options: DuplicateBudgetOptions) => {
      return duplicateBudget(budgetId, options);
    },
    onSuccess: (newBudgetId) => {
      queryClient.invalidateQueries({ queryKey: ['planning-budgets'] });
      toast.success('Presupuesto duplicado exitosamente');
      onOpenChange(false);
      navigate(`/planning-v2/budgets/${newBudgetId}`);
    },
    onError: (error) => {
      console.error('Error duplicating budget:', error);
      toast.error('Error al duplicar el presupuesto');
    },
  });

  const handleDuplicate = () => {
    if (!newName.trim()) {
      toast.error('El nombre no puede estar vacío');
      return;
    }

    duplicateMutation.mutate({
      newName: newName.trim(),
      preserveQuantities,
      preservePrices,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Duplicar Presupuesto
          </DialogTitle>
          <DialogDescription>
            Crea una copia del presupuesto con las opciones seleccionadas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="new-name">Nombre del nuevo presupuesto</Label>
            <Input
              id="new-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre del presupuesto"
              disabled={duplicateMutation.isPending}
            />
          </div>

          <div className="space-y-3 pt-2">
            <Label>Opciones de duplicación</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="preserve-quantities"
                checked={preserveQuantities}
                onCheckedChange={(checked) => setPreserveQuantities(checked as boolean)}
                disabled={duplicateMutation.isPending}
              />
              <label
                htmlFor="preserve-quantities"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Conservar cantidades
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="preserve-prices"
                checked={preservePrices}
                onCheckedChange={(checked) => setPreservePrices(checked as boolean)}
                disabled={duplicateMutation.isPending}
              />
              <label
                htmlFor="preserve-prices"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Conservar precios
              </label>
            </div>

            {!preserveQuantities && (
              <p className="text-xs text-muted-foreground mt-2">
                Las cantidades reales se resetearán a 0
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={duplicateMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleDuplicate}
            disabled={duplicateMutation.isPending || !newName.trim()}
          >
            {duplicateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Duplicando...
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Duplicar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
