import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/CurrencyInput';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Calculator } from 'lucide-react';

interface PaymentPlanFormProps {
  onSubmit: (data: PaymentPlanFormData & { installments?: InstallmentSuggestion[] }) => void;
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

interface InstallmentSuggestion {
  installment_number: number;
  description: string;
  percentage: number;
  amount: number;
  due_days: number;
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

  const [selectedSuggestion, setSelectedSuggestion] = useState<InstallmentSuggestion[] | null>(null);

  // Sugerencias de planes de pago
  const paymentSuggestions = [
    {
      name: "50% - 50%",
      installments: [
        { installment_number: 1, description: "Anticipo inicial", percentage: 50, amount: 0, due_days: 0 },
        { installment_number: 2, description: "Pago final", percentage: 50, amount: 0, due_days: 30 }
      ]
    },
    {
      name: "30% - 40% - 30%",
      installments: [
        { installment_number: 1, description: "Anticipo inicial", percentage: 30, amount: 0, due_days: 0 },
        { installment_number: 2, description: "Pago intermedio", percentage: 40, amount: 0, due_days: 15 },
        { installment_number: 3, description: "Pago final", percentage: 30, amount: 0, due_days: 30 }
      ]
    },
    {
      name: "25% - 75%",
      installments: [
        { installment_number: 1, description: "Anticipo inicial", percentage: 25, amount: 0, due_days: 0 },
        { installment_number: 2, description: "Pago final", percentage: 75, amount: 0, due_days: 30 }
      ]
    },
    {
      name: "40% - 30% - 30%",
      installments: [
        { installment_number: 1, description: "Anticipo inicial", percentage: 40, amount: 0, due_days: 0 },
        { installment_number: 2, description: "Pago intermedio", percentage: 30, amount: 0, due_days: 15 },
        { installment_number: 3, description: "Pago final", percentage: 30, amount: 0, due_days: 30 }
      ]
    }
  ];

  const applyPaymentSuggestion = (suggestion: { name: string; installments: InstallmentSuggestion[] }) => {
    if (formData.total_amount <= 0) {
      toast({
        title: "Error",
        description: "Primero ingresa el monto total del plan",
        variant: "destructive"
      });
      return;
    }

    const installmentsWithAmounts = suggestion.installments.map(inst => ({
      ...inst,
      amount: Math.round((formData.total_amount * inst.percentage) / 100)
    }));

    setSelectedSuggestion(installmentsWithAmounts);
    
    // Actualizar el nombre del plan si está vacío
    if (!formData.plan_name.trim()) {
      const planTypeName = formData.plan_type === 'design_payment' ? 'Diseño' : 'Construcción';
      setFormData(prev => ({
        ...prev,
        plan_name: `Plan de ${planTypeName} - ${suggestion.name}`
      }));
    }
  };

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

    onSubmit({
      ...formData,
      installments: selectedSuggestion || undefined
    });
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

      {/* Sugerencias de planes de pago */}
      <div>
        <Label className="flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          Sugerencias de Parcialidades
        </Label>
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-2 mb-3">
              {paymentSuggestions.map((suggestion) => (
                <Button
                  key={suggestion.name}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPaymentSuggestion(suggestion)}
                  className="text-xs"
                >
                  {suggestion.name}
                </Button>
              ))}
            </div>
            
            {selectedSuggestion && (
              <div className="space-y-2 border-t pt-3">
                <p className="text-sm font-medium text-muted-foreground">Parcialidades Generadas:</p>
                {selectedSuggestion.map((inst) => (
                  <div key={inst.installment_number} className="flex justify-between items-center text-sm bg-muted/50 p-2 rounded">
                    <span>{inst.description}</span>
                    <div className="text-right">
                      <span className="font-medium">${inst.amount.toLocaleString('es-MX')}</span>
                      <span className="text-muted-foreground ml-2">({inst.percentage}%)</span>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSuggestion(null)}
                  className="w-full"
                >
                  Limpiar Sugerencias
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
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