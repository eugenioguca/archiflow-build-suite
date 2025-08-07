import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/CurrencyInput';
import { useToast } from '@/hooks/use-toast';

interface PaymentInstallmentFormProps {
  onSubmit: (data: PaymentInstallmentFormData) => void;
  onCancel: () => void;
  initialData?: Partial<PaymentInstallmentFormData>;
  isSubmitting?: boolean;
  maxAmount?: number;
}

interface PaymentInstallmentFormData {
  installment_number: number;
  description: string;
  amount: number;
  due_date: string;
  notes: string;
}

export const PaymentInstallmentForm: React.FC<PaymentInstallmentFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  isSubmitting = false,
  maxAmount
}) => {
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<PaymentInstallmentFormData>({
    installment_number: initialData?.installment_number || 1,
    description: initialData?.description || '',
    amount: initialData?.amount || 0,
    due_date: initialData?.due_date || '',
    notes: initialData?.notes || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description.trim()) {
      toast({
        title: "Error",
        description: "La descripción es requerida",
        variant: "destructive"
      });
      return;
    }

    if (formData.amount <= 0) {
      toast({
        title: "Error",
        description: "El monto debe ser mayor a cero",
        variant: "destructive"
      });
      return;
    }

    if (maxAmount && formData.amount > maxAmount) {
      toast({
        title: "Error",
        description: `El monto no puede exceder ${maxAmount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}`,
        variant: "destructive"
      });
      return;
    }

    if (!formData.due_date) {
      toast({
        title: "Error",
        description: "La fecha de vencimiento es requerida",
        variant: "destructive"
      });
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="installment_number">Número de Parcialidad *</Label>
        <Input
          id="installment_number"
          type="number"
          min="1"
          value={formData.installment_number}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            installment_number: parseInt(e.target.value) || 1 
          }))}
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Descripción *</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Ej: Primer anticipo de diseño"
          required
        />
      </div>

      <div>
        <Label htmlFor="amount">Monto *</Label>
        <CurrencyInput
          value={formData.amount}
          onChange={(value) => setFormData(prev => ({ ...prev, amount: value }))}
          placeholder="0.00"
          required
        />
        {maxAmount && (
          <p className="text-sm text-muted-foreground mt-1">
            Máximo: {maxAmount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="due_date">Fecha de Vencimiento *</Label>
        <Input
          id="due_date"
          type="date"
          value={formData.due_date}
          onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
          required
        />
      </div>

      <div>
        <Label htmlFor="notes">Notas Adicionales</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Notas adicionales sobre esta parcialidad..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Guardar Parcialidad'}
        </Button>
      </div>
    </form>
  );
};