import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/CurrencyInput';
import { useToast } from '@/hooks/use-toast';

interface PaymentPlanFormProps {
  onSubmit: (data: PaymentPlanFormData) => void;
  onCancel: () => void;
  initialData?: Partial<PaymentPlanFormData>;
  planType?: 'design_payment' | 'construction_payment';
  isSubmitting?: boolean;
}

interface PaymentPlanFormData {
  plan_name: string;
  plan_type: 'design_payment' | 'construction_payment';
  total_amount: number;
  notes: string;
}

export const PaymentPlanForm: React.FC<PaymentPlanFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  planType,
  isSubmitting = false
}) => {
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<PaymentPlanFormData>({
    plan_name: initialData?.plan_name || '',
    plan_type: planType || initialData?.plan_type || 'design_payment',
    total_amount: initialData?.total_amount || 0,
    notes: initialData?.notes || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.plan_name.trim()) {
      toast({
        title: "Error",
        description: "El nombre del plan es requerido",
        variant: "destructive"
      });
      return;
    }

    if (formData.total_amount <= 0) {
      toast({
        title: "Error", 
        description: "El monto total debe ser mayor a cero",
        variant: "destructive"
      });
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="plan_name">Nombre del Plan *</Label>
        <Input
          id="plan_name"
          value={formData.plan_name}
          onChange={(e) => setFormData(prev => ({ ...prev, plan_name: e.target.value }))}
          placeholder="Ej: Plan de Pago Diseño - Cliente"
          required
        />
      </div>

      {!planType && (
        <div>
          <Label htmlFor="plan_type">Tipo de Plan *</Label>
          <Select 
            value={formData.plan_type} 
            onValueChange={(value) => setFormData(prev => ({ 
              ...prev, 
              plan_type: value as 'design_payment' | 'construction_payment' 
            }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona el tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="design_payment">Pago de Diseño</SelectItem>
              <SelectItem value="construction_payment">Pago de Construcción</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label htmlFor="total_amount">Monto Total *</Label>
        <CurrencyInput
          value={formData.total_amount}
          onChange={(value) => setFormData(prev => ({ ...prev, total_amount: value }))}
          placeholder="0.00"
          required
        />
      </div>

      <div>
        <Label htmlFor="notes">Notas Adicionales</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Notas adicionales sobre el plan de pago..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Guardar Plan'}
        </Button>
      </div>
    </form>
  );
};