import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit2, Trash2, Calendar, DollarSign, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface PaymentPlan {
  plan_name: string;
  total_amount: number;
  installments: PaymentInstallment[];
  notes?: string;
  service_type: string;
}

interface PaymentInstallment {
  id: string;
  payment_number: number;
  amount: number;
  due_date: string;
  description: string;
  payment_status: 'pending' | 'paid' | 'overdue';
  paid_date?: string;
}

interface PaymentPlanManagerProps {
  clientId: string;
  clientName: string;
  currentPlan?: PaymentPlan;
  onPlanUpdate: (plan: PaymentPlan) => void;
}

export function PaymentPlanManager({ 
  clientId, 
  clientName, 
  currentPlan, 
  onPlanUpdate 
}: PaymentPlanManagerProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInstallment, setEditingInstallment] = useState<string | null>(null);
  
  const [planForm, setPlanForm] = useState<PaymentPlan>({
    plan_name: currentPlan?.plan_name || `Plan de Pagos - ${clientName}`,
    total_amount: currentPlan?.total_amount || 0,
    service_type: currentPlan?.service_type || 'diseño',
    installments: currentPlan?.installments || [],
    notes: currentPlan?.notes || ''
  });

  const [newInstallment, setNewInstallment] = useState({
    amount: 0,
    due_date: '',
    description: '',
    payment_number: 1
  });

  const addInstallment = () => {
    const installment: PaymentInstallment = {
      id: Date.now().toString(),
      payment_number: planForm.installments.length + 1,
      amount: newInstallment.amount,
      due_date: newInstallment.due_date,
      description: newInstallment.description,
      payment_status: 'pending'
    };

    setPlanForm(prev => ({
      ...prev,
      installments: [...prev.installments, installment]
    }));

    setNewInstallment({
      amount: 0,
      due_date: '',
      description: '',
      payment_number: planForm.installments.length + 2
    });
  };

  const removeInstallment = (id: string) => {
    setPlanForm(prev => ({
      ...prev,
      installments: prev.installments.filter(inst => inst.id !== id)
        .map((inst, index) => ({ ...inst, payment_number: index + 1 }))
    }));
  };

  const calculateTotal = () => {
    return planForm.installments.reduce((sum, inst) => sum + inst.amount, 0);
  };

  const generateAutomaticPlan = (months: number, firstPaymentPercentage: number = 30) => {
    if (!planForm.total_amount || months <= 0) return;

    const firstPayment = planForm.total_amount * (firstPaymentPercentage / 100);
    const remainingAmount = planForm.total_amount - firstPayment;
    const monthlyPayment = months > 1 ? remainingAmount / (months - 1) : 0;

    const installments: PaymentInstallment[] = [];
    const today = new Date();

    // Primer pago (anticipo)
    installments.push({
      id: Date.now().toString(),
      payment_number: 1,
      amount: firstPayment,
      due_date: today.toISOString().split('T')[0],
      description: `Anticipo (${firstPaymentPercentage}%)`,
      payment_status: 'pending'
    });

    // Pagos mensuales
    for (let i = 1; i < months; i++) {
      const dueDate = new Date(today);
      dueDate.setMonth(dueDate.getMonth() + i);
      
      installments.push({
        id: (Date.now() + i).toString(),
        payment_number: i + 1,
        amount: monthlyPayment,
        due_date: dueDate.toISOString().split('T')[0],
        description: `Pago ${i} de ${months - 1}`,
        payment_status: 'pending'
      });
    }

    setPlanForm(prev => ({ ...prev, installments }));
  };

  const savePlan = async () => {
    try {
      const totalCalculated = calculateTotal();
      
      const finalPlan = {
        ...planForm,
        total_amount: totalCalculated
      };

      const { error } = await supabase
        .from('clients')
        .update({ payment_plan: finalPlan as any })
        .eq('id', clientId);

      if (error) throw error;

      onPlanUpdate(finalPlan);
      setIsDialogOpen(false);

      toast({
        title: "Plan de pagos guardado",
        description: "El plan de pagos se ha guardado correctamente",
      });
    } catch (error) {
      console.error('Error saving payment plan:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el plan de pagos",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Pagado';
      case 'overdue': return 'Vencido';
      default: return 'Pendiente';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Plan de Pagos
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                {currentPlan?.installments?.length ? <Edit2 className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                {currentPlan?.installments?.length ? 'Editar Plan' : 'Crear Plan'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {currentPlan?.installments?.length ? 'Editar' : 'Crear'} Plan de Pagos
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Información general */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="plan_name">Nombre del Plan</Label>
                    <Input
                      id="plan_name"
                      value={planForm.plan_name}
                      onChange={(e) => setPlanForm(prev => ({ ...prev, plan_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="service_type">Tipo de Servicio</Label>
                    <Select 
                      value={planForm.service_type} 
                      onValueChange={(value) => setPlanForm(prev => ({ ...prev, service_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diseño">Diseño</SelectItem>
                        <SelectItem value="construccion_directa">Construcción Directa</SelectItem>
                        <SelectItem value="diseño_construccion">Diseño + Construcción</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Generación automática */}
                <div className="p-4 border rounded-lg bg-gray-50">
                  <h4 className="font-medium mb-3">Generación Automática de Plan</h4>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <Label>Monto Total</Label>
                      <Input
                        type="number"
                        value={planForm.total_amount}
                        onChange={(e) => setPlanForm(prev => ({ ...prev, total_amount: Number(e.target.value) }))}
                        placeholder="$0.00"
                      />
                    </div>
                    <div>
                      <Label>Anticipate (%)</Label>
                      <Input type="number" defaultValue="30" id="advance-percentage" />
                    </div>
                    <div>
                      <Label>Meses</Label>
                      <Input type="number" defaultValue="6" id="payment-months" />
                    </div>
                    <div className="flex items-end">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => {
                          const months = Number((document.getElementById('payment-months') as HTMLInputElement)?.value || 6);
                          const advance = Number((document.getElementById('advance-percentage') as HTMLInputElement)?.value || 30);
                          generateAutomaticPlan(months, advance);
                        }}
                      >
                        Generar
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Nuevo pago */}
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3">Agregar Pago</h4>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <Label>Monto</Label>
                      <Input
                        type="number"
                        value={newInstallment.amount}
                        onChange={(e) => setNewInstallment(prev => ({ ...prev, amount: Number(e.target.value) }))}
                        placeholder="$0.00"
                      />
                    </div>
                    <div>
                      <Label>Fecha de Vencimiento</Label>
                      <Input
                        type="date"
                        value={newInstallment.due_date}
                        onChange={(e) => setNewInstallment(prev => ({ ...prev, due_date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Descripción</Label>
                      <Input
                        value={newInstallment.description}
                        onChange={(e) => setNewInstallment(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Descripción del pago"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button type="button" onClick={addInstallment} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Lista de pagos */}
                <div>
                  <h4 className="font-medium mb-3">Pagos Programados</h4>
                  {planForm.installments.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No hay pagos programados</p>
                  ) : (
                    <div className="space-y-2">
                      {planForm.installments.map((installment) => (
                        <div key={installment.id} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex-1 grid grid-cols-4 gap-4">
                            <div>
                              <span className="text-sm font-medium">Pago #{installment.payment_number}</span>
                            </div>
                            <div>
                              <span className="text-sm">${installment.amount.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-sm">{format(new Date(installment.due_date), "dd/MM/yyyy")}</span>
                            </div>
                            <div>
                              <span className="text-sm">{installment.description}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeInstallment(installment.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <div className="pt-2 border-t">
                        <div className="flex justify-between font-medium">
                          <span>Total:</span>
                          <span>${calculateTotal().toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Notas */}
                <div>
                  <Label htmlFor="notes">Notas Adicionales</Label>
                  <Textarea
                    id="notes"
                    value={planForm.notes}
                    onChange={(e) => setPlanForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Términos y condiciones, notas especiales..."
                    rows={3}
                  />
                </div>

                {/* Botones */}
                <div className="flex gap-2 pt-4">
                  <Button onClick={savePlan} className="flex-1">
                    Guardar Plan de Pagos
                  </Button>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {currentPlan?.installments?.length ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Plan</p>
                <p className="font-medium">{currentPlan.plan_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="font-medium text-lg">${currentPlan.total_amount.toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-2">
              {currentPlan.installments.map((installment) => (
                <div key={installment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Pago</p>
                      <p className="font-medium">#{installment.payment_number}</p>
                    </div>
                    <div>
                      <p className="font-medium">${installment.amount.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">{installment.description}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(installment.due_date), "dd/MM/yyyy")}
                    </p>
                    <Badge className={getStatusColor(installment.payment_status)}>
                      {getStatusLabel(installment.payment_status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {currentPlan.notes && (
              <div className="p-3 bg-blue-50 border-l-4 border-blue-200 rounded">
                <p className="text-sm text-blue-800">{currentPlan.notes}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No hay plan de pagos configurado</p>
            <p className="text-sm">Crea un plan para gestionar los pagos del cliente</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}