import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  DollarSign,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  CreditCard,
  Calculator,
  FileText,
  Download,
  Send,
  CheckCircle,
  AlertTriangle,
  Edit,
  Copy
} from "lucide-react";
import { format, addMonths, addWeeks, addDays } from "date-fns";
import { es } from "date-fns/locale";

interface PaymentPlan {
  id: string;
  client_project_id: string;
  plan_name: string;
  total_amount: number;
  currency: string;
  status: 'draft' | 'approved' | 'active' | 'completed';
  created_at: string;
  updated_at: string;
  payments: PaymentInstallment[];
}

interface PaymentInstallment {
  id: string;
  payment_plan_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  description: string;
  status: 'pending' | 'paid' | 'overdue' | 'partial';
  paid_amount?: number;
  paid_date?: string;
  payment_method?: string;
  notes?: string;
}

interface PaymentTemplate {
  id: string;
  name: string;
  description: string;
  installments: {
    percentage: number;
    months_offset: number;
    description: string;
  }[];
}

interface PaymentPlanBuilderProps {
  clientProjectId: string;
  clientName: string;
  onPlanUpdate?: () => void;
}

const PAYMENT_TEMPLATES: PaymentTemplate[] = [
  {
    id: 'template_50_50',
    name: '50% - 50%',
    description: 'Anticipo 50% y 50% al finalizar',
    installments: [
      { percentage: 50, months_offset: 0, description: 'Anticipo para inicio de proyecto' },
      { percentage: 50, months_offset: 3, description: 'Pago final al completar proyecto' }
    ]
  },
  {
    id: 'template_30_40_30',
    name: '30% - 40% - 30%',
    description: 'Anticipo, avance y finalización',
    installments: [
      { percentage: 30, months_offset: 0, description: 'Anticipo para inicio' },
      { percentage: 40, months_offset: 1.5, description: 'Pago por avance del 50%' },
      { percentage: 30, months_offset: 3, description: 'Pago final' }
    ]
  },
  {
    id: 'template_25_25_25_25',
    name: '25% x 4 pagos',
    description: 'Cuatro pagos iguales trimestrales',
    installments: [
      { percentage: 25, months_offset: 0, description: 'Primer pago' },
      { percentage: 25, months_offset: 1, description: 'Segundo pago' },
      { percentage: 25, months_offset: 2, description: 'Tercer pago' },
      { percentage: 25, months_offset: 3, description: 'Pago final' }
    ]
  },
  {
    id: 'template_custom',
    name: 'Personalizado',
    description: 'Crear plan personalizado',
    installments: []
  }
];

export const PaymentPlanBuilder = ({ 
  clientProjectId, 
  clientName, 
  onPlanUpdate 
}: PaymentPlanBuilderProps) => {
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customInstallments, setCustomInstallments] = useState<PaymentInstallment[]>([]);
  const [planName, setPlanName] = useState('');
  const [planAmount, setPlanAmount] = useState<string>('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPaymentPlans();
  }, [clientProjectId]);

  const fetchPaymentPlans = async () => {
    try {
      setLoading(true);
      
      const { data: projectData, error } = await supabase
        .from('client_projects')
        .select('payment_plan')
        .eq('id', clientProjectId)
        .single();

      if (error) throw error;

      // Cargar planes desde el campo payment_plan del proyecto
      if (projectData?.payment_plan && typeof projectData.payment_plan === 'object') {
        try {
          const plans = Array.isArray(projectData.payment_plan) ? projectData.payment_plan : [projectData.payment_plan];
          // Asegurar que cada plan tenga un array de payments válido y campos numéricos válidos
          const validPlans = plans.map((plan: any) => ({
            ...plan,
            payments: Array.isArray(plan.payments) ? plan.payments.map((payment: any) => ({
              ...payment,
              amount: typeof payment.amount === 'number' ? payment.amount : 0,
              paid_amount: typeof payment.paid_amount === 'number' ? payment.paid_amount : 0
            })) : [],
            total_amount: typeof plan.total_amount === 'number' ? plan.total_amount : 0
          }));
          setPaymentPlans(validPlans as unknown as PaymentPlan[]);
        } catch (e) {
          console.error('Error parsing payment plans:', e);
          setPaymentPlans([]);
        }
      } else {
        setPaymentPlans([]);
      }
    } catch (error) {
      console.error('Error fetching payment plans:', error);
      setPaymentPlans([]);
      toast({
        title: "Error",
        description: "No se pudieron cargar los planes de pago",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createPaymentPlan = async () => {
    try {
      const planAmountNumber = parseCurrency(planAmount);
      if (!planName || !planAmount || planAmountNumber === 0 || customInstallments.length === 0) {
        toast({
          title: "Error",
          description: "Por favor completa todos los campos incluyendo el monto del plan",
          variant: "destructive",
        });
        return;
      }

      // Verificar que las cuotas sumen el total del plan
      const totalInstallments = customInstallments.reduce((sum, inst) => sum + inst.amount, 0);
      if (Math.abs(totalInstallments - planAmountNumber) > 0.01) {
        toast({
          title: "Error",
          description: `Las cuotas deben sumar exactamente $${formatCurrencyDisplay(planAmountNumber)}`,
          variant: "destructive",
        });
        return;
      }

      // Crear nuevo plan
      const newPlan: PaymentPlan = {
        id: Math.random().toString(),
        client_project_id: clientProjectId,
        plan_name: planName,
        total_amount: planAmountNumber,
        currency: 'MXN',
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        payments: customInstallments.map((inst, index) => ({
          ...inst,
          id: Math.random().toString(),
          payment_plan_id: Math.random().toString(),
          installment_number: index + 1
        }))
      };

      // Guardar en la base de datos
      const updatedPlans = [...paymentPlans, newPlan];
      
      const { error } = await supabase
        .from('client_projects')
        .update({ 
          payment_plan: updatedPlans as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientProjectId);

      if (error) throw error;

      setPaymentPlans(updatedPlans);

      toast({
        title: "Éxito",
        description: "Plan de pago creado y guardado exitosamente",
      });

      setShowCreateDialog(false);
      resetForm();
      onPlanUpdate?.();
    } catch (error) {
      console.error('Error creating payment plan:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el plan de pago",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setPlanName('');
    setPlanAmount('');
    setSelectedTemplate('');
    setCustomInstallments([]);
    setStartDate(new Date());
  };

  const formatCurrency = (value: string) => {
    // Remover todo excepto dígitos
    const numericValue = value.replace(/[^\d]/g, '');
    if (!numericValue) return '';
    
    // Convertir a número y formatear con comas
    const number = parseInt(numericValue);
    return number.toLocaleString('es-MX');
  };

  const parseCurrency = (value: string): number => {
    const numericValue = value.replace(/[^\d]/g, '');
    return numericValue ? parseInt(numericValue) : 0;
  };

  const handlePlanAmountChange = (value: string) => {
    const formatted = formatCurrency(value);
    setPlanAmount(formatted);
  };

  const applyTemplate = (templateId: string) => {
    const template = PAYMENT_TEMPLATES.find(t => t.id === templateId);
    if (!template || template.id === 'template_custom') {
      setCustomInstallments([]);
      return;
    }

    const installments = template.installments.map((inst, index) => {
      const planAmountNumber = parseCurrency(planAmount);
      const amount = planAmountNumber > 0 ? Math.round((planAmountNumber * inst.percentage) / 100) : 0;
      
      let dueDate: Date;
      if (index === template.installments.length - 1) {
        // Para el último pago, siempre usar 45 días después del primer pago
        dueDate = addDays(startDate, 45);
      } else {
        // Para los demás pagos, usar el offset original de la plantilla
        dueDate = addMonths(startDate, inst.months_offset);
      }
      
      return {
        id: `temp_${index}`,
        payment_plan_id: '',
        installment_number: index + 1,
        amount,
        due_date: dueDate.toISOString().split('T')[0],
        description: inst.description,
        status: 'pending' as const
      };
    });

    setCustomInstallments(installments);
    if (!planName) {
      setPlanName(`${template.name} - ${clientName}`);
    }
  };

  const addCustomInstallment = () => {
    const newInstallment: PaymentInstallment = {
      id: `temp_${Date.now()}`,
      payment_plan_id: '',
      installment_number: customInstallments.length + 1,
      amount: 0,
      due_date: new Date().toISOString().split('T')[0],
      description: '',
      status: 'pending'
    };
    setCustomInstallments([...customInstallments, newInstallment]);
  };

  const updateInstallment = (index: number, field: keyof PaymentInstallment, value: any) => {
    const updated = [...customInstallments];
    updated[index] = { ...updated[index], [field]: value };
    setCustomInstallments(updated);
  };

  const removeInstallment = (index: number) => {
    const updated = customInstallments.filter((_, i) => i !== index);
    setCustomInstallments(updated);
  };

  const deletePlan = async (planId: string) => {
    try {
      const updatedPlans = paymentPlans.filter(plan => plan.id !== planId);
      
      const { error } = await supabase
        .from('client_projects')
        .update({ 
          payment_plan: updatedPlans as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientProjectId);

      if (error) throw error;
      
      setPaymentPlans(updatedPlans);
      toast({
        title: "Éxito",
        description: "Plan de pago eliminado correctamente",
      });
    } catch (error) {
      console.error('Error deleting payment plan:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el plan de pago",
        variant: "destructive",
      });
    }
  };

  const updatePaymentStatus = async (installmentId: string, status: string, paidAmount?: number) => {
    try {
      const updatedPlans = paymentPlans.map(plan => ({
        ...plan,
        payments: plan.payments.map(payment => 
          payment.id === installmentId 
            ? { 
                ...payment, 
                status: status as any,
                paid_amount: paidAmount,
                paid_date: new Date().toISOString()
              }
            : payment
        )
      }));

      const { error } = await supabase
        .from('client_projects')
        .update({ 
          payment_plan: updatedPlans as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientProjectId);

      if (error) throw error;

      setPaymentPlans(updatedPlans);

      // Notify parent component about the update
      if (onPlanUpdate) {
        onPlanUpdate();
      }

      toast({
        title: "Éxito",
        description: "Estado de pago actualizado y guardado",
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive",
      });
    }
  };

  const getTotalPaid = (payments: PaymentInstallment[]) => {
    if (!payments || !Array.isArray(payments)) {
      return 0;
    }
    return payments.reduce((sum, payment) => {
      return sum + (payment.paid_amount || 0);
    }, 0);
  };

  const formatCurrencyDisplay = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0';
    }
    return value.toLocaleString();
  };

  const getPaymentProgress = (payments: PaymentInstallment[], totalAmount: number) => {
    if (!payments || !Array.isArray(payments) || totalAmount === 0) {
      return 0;
    }
    const totalPaid = getTotalPaid(payments);
    return Math.round((totalPaid / totalAmount) * 100);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Plan de Pagos
            </CardTitle>
            <div className="flex items-center gap-2">
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Plan
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Crear Plan de Pagos</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    {/* Configuración básica */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium">Nombre del Plan</label>
                        <Input
                          value={planName}
                          onChange={(e) => setPlanName(e.target.value)}
                          placeholder="Ej: Plan diseño arquitectónico"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Monto Total del Plan</label>
                        <Input
                          value={planAmount}
                          onChange={(e) => handlePlanAmountChange(e.target.value)}
                          placeholder="Ingresa el monto"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Fecha de Inicio</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start">
                              <CalendarIcon className="h-4 w-4 mr-2" />
                              {format(startDate, 'dd/MM/yyyy', { locale: es })}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={startDate}
                              onSelect={(date) => date && setStartDate(date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {/* Plantillas */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Plantillas Predefinidas</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {PAYMENT_TEMPLATES.map((template) => (
                          <Button
                            key={template.id}
                            variant={selectedTemplate === template.id ? "default" : "outline"}
                            className="h-auto p-4 flex-col items-start"
                            onClick={() => {
                              setSelectedTemplate(template.id);
                              applyTemplate(template.id);
                            }}
                          >
                            <div className="font-medium">{template.name}</div>
                            <div className="text-xs text-muted-foreground text-left">
                              {template.description}
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Cuotas personalizadas */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <label className="text-sm font-medium">Cuotas de Pago</label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={addCustomInstallment}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Agregar Cuota
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {customInstallments.map((installment, index) => (
                          <div key={installment.id} className="flex items-center gap-4 p-4 border rounded-lg">
                            <div className="w-16">
                              <Badge variant="outline">#{index + 1}</Badge>
                            </div>
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <Input
                                  type="number"
                                  placeholder="Monto"
                                  value={installment.amount}
                                  onChange={(e) => updateInstallment(index, 'amount', parseFloat(e.target.value) || 0)}
                                />
                              </div>
                              <div>
                                <Input
                                  type="date"
                                  value={installment.due_date}
                                  onChange={(e) => updateInstallment(index, 'due_date', e.target.value)}
                                />
                              </div>
                              <div>
                                <Input
                                  placeholder="Descripción"
                                  value={installment.description}
                                  onChange={(e) => updateInstallment(index, 'description', e.target.value)}
                                />
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeInstallment(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      {customInstallments.length > 0 && (
                        <div className="mt-4 p-4 bg-muted rounded-lg">
                          <div className="flex justify-between text-sm">
                            <span>Total de cuotas:</span>
                            <span className="font-medium">
                              ${formatCurrencyDisplay(customInstallments.reduce((sum, inst) => sum + inst.amount, 0))}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Monto del plan:</span>
                            <span className="font-medium">${formatCurrencyDisplay(parseCurrency(planAmount))}</span>
                          </div>
                          <div className="flex justify-between text-sm font-medium border-t pt-2 mt-2">
                            <span>Diferencia:</span>
                            <span className={customInstallments.reduce((sum, inst) => sum + inst.amount, 0) === parseCurrency(planAmount) ? 'text-green-600' : 'text-red-600'}>
                              ${formatCurrencyDisplay(customInstallments.reduce((sum, inst) => sum + inst.amount, 0) - parseCurrency(planAmount))}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={createPaymentPlan} className="flex-1">
                        Crear Plan de Pagos
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowCreateDialog(false)}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Lista de planes de pago */}
      <div className="space-y-4">
        {paymentPlans.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Calculator className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium">No hay planes de pago</h3>
              <p className="text-muted-foreground">
                Crea un plan de pagos para organizar los cobros del proyecto
              </p>
            </CardContent>
          </Card>
        ) : (
          paymentPlans.map((plan) => {
            const payments = Array.isArray(plan.payments) ? plan.payments : [];
            const progress = getPaymentProgress(payments, plan.total_amount);
            const totalPaid = getTotalPaid(payments);
            
            return (
              <Card key={plan.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{plan.plan_name}</CardTitle>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
                          {plan.status === 'draft' && 'Borrador'}
                          {plan.status === 'approved' && 'Aprobado'}
                          {plan.status === 'active' && 'Activo'}
                          {plan.status === 'completed' && 'Completado'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {payments.length} cuotas
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                         <div className="text-2xl font-bold">
                           ${formatCurrencyDisplay(totalPaid)} / ${formatCurrencyDisplay(plan.total_amount)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {progress}% completado
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deletePlan(plan.id)}
                        className="ml-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Barra de progreso */}
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>

                    {/* Lista de cuotas */}
                    <div className="space-y-2">
                      {payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">
                              #{payment.installment_number}
                            </Badge>
                            <div>
                               <div className="font-medium">
                                 ${formatCurrencyDisplay(payment.amount)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Vence: {format(new Date(payment.due_date), 'dd/MM/yyyy', { locale: es })}
                              </div>
                              {payment.description && (
                                <div className="text-xs text-muted-foreground">
                                  {payment.description}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={payment.status === 'paid' ? 'default' : 'secondary'}
                              className={
                                payment.status === 'paid' 
                                  ? 'bg-green-100 text-green-700' 
                                  : payment.status === 'overdue'
                                  ? 'bg-red-100 text-red-700'
                                  : ''
                              }
                            >
                              {payment.status === 'pending' && 'Pendiente'}
                              {payment.status === 'paid' && 'Pagado'}
                              {payment.status === 'overdue' && 'Vencido'}
                              {payment.status === 'partial' && 'Parcial'}
                            </Badge>
                            
                            {payment.status !== 'paid' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updatePaymentStatus(payment.id, 'paid', payment.amount)}
                              >
                                Marcar Pagado
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};