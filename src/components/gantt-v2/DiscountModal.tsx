import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/utils/gantt-v2/currency';

interface DiscountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (amount: number) => Promise<void>;
  currentDiscount?: number;
  subtotal: number;
  title: string;
}

export function DiscountModal({
  open,
  onOpenChange,
  onSubmit,
  currentDiscount,
  subtotal,
  title
}: DiscountModalProps) {
  const [amount, setAmount] = useState(currentDiscount?.toString() || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const numericAmount = parseFloat(amount);

    // Validaciones
    if (isNaN(numericAmount)) {
      setError('Por favor ingresa un valor válido');
      return;
    }

    if (numericAmount < 0) {
      setError('El descuento no puede ser negativo');
      return;
    }

    if (numericAmount > subtotal) {
      setError('El descuento no puede ser mayor al subtotal');
      return;
    }

    try {
      setIsLoading(true);
      await onSubmit(numericAmount);
      setAmount('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving discount:', error);
      setError('Error al guardar el descuento');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setAmount('');
      setError('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="discount-amount">Valor del descuento</Label>
            <Input
              id="discount-amount"
              type="number"
              step="0.01"
              min="0"
              max={subtotal}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              disabled={isLoading}
              className="text-right"
            />
            <div className="text-sm text-muted-foreground">
              Subtotal: {formatCurrency(subtotal)}
            </div>
            {error && (
              <div className="text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !amount}
            >
              {isLoading ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}