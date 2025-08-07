import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/CurrencyInput';
import { DatePicker } from '@/components/DatePicker';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';

import { Calculator, Plus, X, Edit3, Calendar, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { addDays } from 'date-fns';

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
  due_date: Date;
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
  const [customMode, setCustomMode] = useState(false);
  const [customInstallments, setCustomInstallments] = useState<InstallmentSuggestion[]>([
    { installment_number: 1, description: "Anticipo inicial", percentage: 50, amount: 0, due_date: new Date() }
  ]);

  // Sugerencias de planes de pago (reducido a 3)
  const paymentSuggestions = [
    {
      name: "50% - 50%",
      installments: [
        { installment_number: 1, description: "Anticipo inicial", percentage: 50, amount: 0, due_date: new Date() },
        { installment_number: 2, description: "Pago final", percentage: 50, amount: 0, due_date: addDays(new Date(), formData.plan_type === 'design_payment' ? 45 : 30) }
      ]
    },
    {
      name: "30% - 40% - 30%",
      installments: [
        { installment_number: 1, description: "Anticipo inicial", percentage: 30, amount: 0, due_date: new Date() },
        { installment_number: 2, description: "Pago intermedio", percentage: 40, amount: 0, due_date: addDays(new Date(), formData.plan_type === 'design_payment' ? 22 : 15) },
        { installment_number: 3, description: "Pago final", percentage: 30, amount: 0, due_date: addDays(new Date(), formData.plan_type === 'design_payment' ? 45 : 30) }
      ]
    },
    {
      name: "25% - 75%",
      installments: [
        { installment_number: 1, description: "Anticipo inicial", percentage: 25, amount: 0, due_date: new Date() },
        { installment_number: 2, description: "Pago final", percentage: 75, amount: 0, due_date: addDays(new Date(), formData.plan_type === 'design_payment' ? 45 : 30) }
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
    setCustomMode(false);
    
    // Actualizar el nombre del plan si está vacío
    if (!formData.plan_name.trim()) {
      const planTypeName = formData.plan_type === 'design_payment' ? 'Diseño' : 'Construcción';
      setFormData(prev => ({
        ...prev,
        plan_name: `Plan de ${planTypeName} - ${suggestion.name}`
      }));
    }
  };

  const startCustomMode = () => {
    if (formData.total_amount <= 0) {
      toast({
        title: "Error",
        description: "Primero ingresa el monto total del plan",
        variant: "destructive"
      });
      return;
    }

    setCustomMode(true);
    setSelectedSuggestion(null);
    
    // Recalcular montos basados en porcentajes actuales
    const updatedInstallments = customInstallments.map(inst => ({
      ...inst,
      amount: Math.round((formData.total_amount * inst.percentage) / 100)
    }));
    setCustomInstallments(updatedInstallments);

    // Actualizar el nombre del plan si está vacío
    if (!formData.plan_name.trim()) {
      const planTypeName = formData.plan_type === 'design_payment' ? 'Diseño' : 'Construcción';
      setFormData(prev => ({
        ...prev,
        plan_name: `Plan de ${planTypeName} - Customizable`
      }));
    }
  };

  const addCustomInstallment = () => {
    const lastDate = customInstallments.length > 0 
      ? customInstallments[customInstallments.length - 1].due_date 
      : new Date();
    
    const newInstallment: InstallmentSuggestion = {
      installment_number: customInstallments.length + 1,
      description: `Parcialidad ${customInstallments.length + 1}`,
      percentage: 0,
      amount: 0,
      due_date: addDays(lastDate, 15)
    };
    setCustomInstallments([...customInstallments, newInstallment]);
  };

  const removeCustomInstallment = (index: number) => {
    if (customInstallments.length <= 1) {
      toast({
        title: "Error",
        description: "Debe existir al menos una parcialidad",
        variant: "destructive"
      });
      return;
    }

    const updated = customInstallments.filter((_, i) => i !== index);
    // Renumerar parcialidades
    const renumbered = updated.map((inst, i) => ({
      ...inst,
      installment_number: i + 1
    }));
    setCustomInstallments(renumbered);
  };

  const updateCustomInstallment = (index: number, field: keyof InstallmentSuggestion, value: any) => {
    const updated = [...customInstallments];
    updated[index] = { ...updated[index], [field]: value };
    
    // Si se actualiza el porcentaje, recalcular el monto
    if (field === 'percentage') {
      updated[index].amount = Math.round((formData.total_amount * value) / 100);
    }
    
    setCustomInstallments(updated);
  };

  const applyCustomPlan = () => {
    const totalPercentage = customInstallments.reduce((sum, inst) => sum + inst.percentage, 0);
    
    if (Math.abs(totalPercentage - 100) > 0.1) {
      toast({
        title: "Error de Validación",
        description: `Los porcentajes deben sumar 100%. Actualmente suman ${totalPercentage.toFixed(1)}%`,
        variant: "destructive"
      });
      return;
    }

    setSelectedSuggestion(customInstallments);
    setCustomMode(false);
  };

  const getTotalPercentage = () => {
    return customInstallments.reduce((sum, inst) => sum + inst.percentage, 0);
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
    <div className="flex flex-col h-full min-h-0">
      <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[85vh]">
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="space-y-4 p-4">
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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={startCustomMode}
                      className="text-xs flex items-center gap-1"
                    >
                      <Edit3 className="h-3 w-3" />
                      Plan Customizable
                    </Button>
                  </div>
                  
                  {/* Editor de Plan Customizable */}
                  {customMode && (
                    <TooltipProvider>
                      <div className="space-y-4 border-t pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Edit3 className="h-4 w-4 text-primary" />
                            <p className="text-sm font-medium">Plan Customizable</p>
                          </div>
                          <span className={`text-sm font-medium px-2 py-1 rounded-md ${
                            Math.abs(getTotalPercentage() - 100) < 0.1 
                              ? 'text-green-700 bg-green-100' 
                              : 'text-red-700 bg-red-100'
                          }`}>
                            Total: {getTotalPercentage().toFixed(1)}%
                          </span>
                        </div>
                        
                        {/* Headers */}
                        <div className="grid grid-cols-12 gap-3 px-2 py-1 bg-muted/50 rounded-md text-xs font-medium text-muted-foreground">
                          <div className="col-span-4 flex items-center gap-1">
                            Descripción
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-3 w-3" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Ej: Anticipo inicial, Pago intermedio</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <div className="col-span-2 flex items-center gap-1">
                            Porcentaje
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-3 w-3" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>% del total que representa esta parcialidad</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <div className="col-span-3">Monto Calculado</div>
                          <div className="col-span-2 flex items-center gap-1">
                            Fecha de Vencimiento
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-3 w-3" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Para planes de diseño se sugieren 45 días máximo</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <div className="col-span-1">Acciones</div>
                        </div>
                        
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                          {customInstallments.map((installment, index) => (
                            <div key={index} className="grid grid-cols-12 gap-3 items-center p-3 border rounded-lg bg-background hover:bg-muted/20 transition-colors">
                              <div className="col-span-4">
                                <Input
                                  placeholder="Ej: Anticipo inicial"
                                  value={installment.description}
                                  onChange={(e) => updateCustomInstallment(index, 'description', e.target.value)}
                                  className="text-sm"
                                />
                              </div>
                              <div className="col-span-2">
                                <div className="relative">
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    value={installment.percentage}
                                    onChange={(e) => updateCustomInstallment(index, 'percentage', Number(e.target.value))}
                                    className="text-sm pr-6"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                                </div>
                              </div>
                              <div className="col-span-3">
                                <div className="text-sm font-medium text-primary bg-primary/5 px-2 py-1 rounded">
                                  ${installment.amount.toLocaleString('es-MX')}
                                </div>
                              </div>
                              <div className="col-span-2">
                                <DatePicker
                                  date={installment.due_date}
                                  onDateChange={(date) => updateCustomInstallment(index, 'due_date', date || new Date())}
                                  placeholder="Fecha"
                                  className="w-full text-sm"
                                />
                              </div>
                              <div className="col-span-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeCustomInstallment(index)}
                                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Eliminar parcialidad</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                          ))}
                        </div>
                      
                        <div className="flex gap-2 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={addCustomInstallment}
                            className="flex items-center gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Agregar Parcialidad
                          </Button>
                          <Button
                            type="button"
                            variant="default"
                            onClick={applyCustomPlan}
                            disabled={Math.abs(getTotalPercentage() - 100) > 0.1}
                            className="flex-1"
                          >
                            {Math.abs(getTotalPercentage() - 100) < 0.1 ? 'Aplicar Plan Customizable' : `Falta ${(100 - getTotalPercentage()).toFixed(1)}%`}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setCustomMode(false)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </TooltipProvider>
                  )}

                  {selectedSuggestion && !customMode && (
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
                        Limpiar Plan
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div>
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notas adicionales sobre el plan..."
                rows={3}
              />
            </div>

            {/* Resumen de plan seleccionado */}
            {(selectedSuggestion || customMode) && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3 text-primary">Plan Seleccionado</h4>
                  <div className="space-y-2">
                    {(selectedSuggestion || customInstallments).map((installment, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span>Parcialidad {installment.installment_number}: {installment.description}</span>
                        <div className="text-right">
                          <span className="font-medium">${installment.amount.toLocaleString('es-MX')}</span>
                          <span className="text-muted-foreground ml-2">({installment.percentage}%)</span>
                        </div>
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between items-center font-medium">
                        <span>Total:</span>
                        <span className="text-primary">
                          ${((selectedSuggestion || customInstallments).reduce((sum, inst) => sum + inst.amount, 0)).toLocaleString('es-MX')}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Footer con botones fijos */}
        <div className="flex gap-3 pt-4 mt-4 border-t bg-background flex-shrink-0 sticky bottom-0">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || (!selectedSuggestion && !customMode)}
            className="flex-1"
          >
            {isSubmitting ? 'Guardando...' : 'Crear Plan'}
          </Button>
        </div>
      </form>
    </div>
  );
};