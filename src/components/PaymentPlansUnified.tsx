import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, DollarSign, Eye, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PaymentPlan {
  id: string;
  plan_name: string;
  total_amount: number;
  currency: string;
  status: string;
  client_name: string;
  project_name: string;
  client_id: string;
  client_project_id: string;
}

interface PaymentInstallment {
  id: string;
  payment_plan_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  status: string;
  paid_date?: string;
  description?: string;
}

interface PaymentPlansUnifiedProps {
  selectedClientId?: string;
  selectedProjectId?: string;
  mode: 'sales' | 'finance';
  onPaymentUpdate?: () => void;
}

export const PaymentPlansUnified: React.FC<PaymentPlansUnifiedProps> = ({
  selectedClientId,
  selectedProjectId,
  mode = 'finance',
  onPaymentUpdate
}) => {
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  const [installments, setInstallments] = useState<PaymentInstallment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchPaymentPlans();
  }, [selectedClientId, selectedProjectId]);

  const fetchPaymentPlans = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('payment_plans_with_sales')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (selectedProjectId) {
        query = query.eq('client_project_id', selectedProjectId);
      } else if (selectedClientId) {
        query = query.eq('client_id', selectedClientId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setPaymentPlans(data || []);
    } catch (error) {
      console.error('Error fetching payment plans:', error);
      toast.error('Error al cargar planes de pago');
    } finally {
      setLoading(false);
    }
  };

  const fetchInstallments = async (planId: string) => {
    try {
      const { data, error } = await supabase
        .from('payment_installments')
        .select('*')
        .eq('payment_plan_id', planId)
        .order('installment_number');

      if (error) throw error;

      setInstallments(data || []);
    } catch (error) {
      console.error('Error fetching installments:', error);
      toast.error('Error al cargar cuotas');
    }
  };

  const handleViewDetails = async (plan: PaymentPlan) => {
    setSelectedPlan(plan);
    await fetchInstallments(plan.id);
    setDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendiente', variant: 'secondary' as const },
      paid: { label: 'Pagado', variant: 'default' as const },
      overdue: { label: 'Vencido', variant: 'destructive' as const },
      partial: { label: 'Parcial', variant: 'outline' as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPlanCategoryBadge = (planName: string) => {
    // Derive category from plan name
    const lowerName = planName.toLowerCase();
    let category = 'general';
    let config = { label: 'General', color: 'bg-gray-500/10 text-gray-700' };
    
    if (lowerName.includes('diseño') || lowerName.includes('design')) {
      category = 'design';
      config = { label: 'Diseño', color: 'bg-blue-500/10 text-blue-700' };
    } else if (lowerName.includes('construcción') || lowerName.includes('construction')) {
      category = 'construction';
      config = { label: 'Construcción', color: 'bg-green-500/10 text-green-700' };
    }
    
    return (
      <Badge variant="outline" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const calculateProgress = (installments: PaymentInstallment[]) => {
    if (installments.length === 0) return 0;
    const paidCount = installments.filter(i => i.status === 'paid').length;
    return (paidCount / installments.length) * 100;
  };

  const calculateTotalPaid = (installments: PaymentInstallment[]) => {
    return installments
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + i.amount, 0);
  };

  const formatCurrency = (amount: number, currency: string = 'MXN') => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const handleInformativeAction = () => {
    if (mode === 'sales') {
      toast.info('Para marcar pagos, dirígete al módulo de Finanzas → Planes de Pago');
    }
  };

  const handleMarkPaid = async (installmentId: string, planId: string) => {
    if (mode === 'sales') {
      handleInformativeAction();
      return;
    }
    
    try {
      // Update payment installment status to paid
      const { error } = await supabase
        .from('payment_installments')
        .update({ 
          status: 'paid',
          paid_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', installmentId);

      if (error) throw error;

      // Refresh data
      await fetchPaymentPlans();
      onPaymentUpdate?.();

      toast.success('Pago marcado como pagado exitosamente');
    } catch (error) {
      console.error('Error marking payment as paid:', error);
      toast.error('Error al marcar el pago como pagado');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cargando planes de pago...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {paymentPlans.map((plan) => {
        const progress = calculateProgress(installments);
        const totalPaid = calculateTotalPaid(installments);
        
        return (
          <Card key={plan.id} className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{plan.plan_name}</CardTitle>
                    {getPlanCategoryBadge(plan.plan_name)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {plan.client_name} - {plan.project_name}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-lg font-semibold">
                    {formatCurrency(plan.total_amount, plan.currency)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Pagado: {formatCurrency(totalPaid, plan.currency)}
                  </p>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progreso de pagos</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{installments.filter(i => i.status === 'paid').length} pagados</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{installments.filter(i => i.status === 'pending').length} pendientes</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    <span>{installments.filter(i => i.status === 'overdue').length} vencidos</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewDetails(plan)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalles
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>
                          Detalles del Plan: {selectedPlan?.plan_name}
                        </DialogTitle>
                      </DialogHeader>
                      
                      {selectedPlan && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                            <div>
                              <p className="text-sm text-muted-foreground">Cliente</p>
                              <p className="font-medium">{selectedPlan.client_name}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Proyecto</p>
                              <p className="font-medium">{selectedPlan.project_name}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Total del Plan</p>
                              <p className="font-medium">{formatCurrency(selectedPlan.total_amount, selectedPlan.currency)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Categoría</p>
                              <div className="mt-1">{getPlanCategoryBadge(selectedPlan.plan_name)}</div>
                            </div>
                          </div>
                          
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Cuota</TableHead>
                                <TableHead>Monto</TableHead>
                                <TableHead>Fecha Vencimiento</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Fecha Pago</TableHead>
                                {mode === 'finance' && <TableHead>Acciones</TableHead>}
                                {mode === 'sales' && <TableHead>Acción</TableHead>}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {installments.map((installment) => (
                                <TableRow key={installment.id}>
                                  <TableCell>#{installment.installment_number}</TableCell>
                                  <TableCell>{formatCurrency(installment.amount)}</TableCell>
                                  <TableCell>{new Date(installment.due_date).toLocaleDateString()}</TableCell>
                                  <TableCell>{getStatusBadge(installment.status)}</TableCell>
                                   <TableCell>
                                     {installment.paid_date 
                                       ? new Date(installment.paid_date).toLocaleDateString()
                                       : '-'
                                     }
                                   </TableCell>
                                   {mode === 'finance' && (
                                     <TableCell>
                                       {installment.status !== 'paid' ? (
                                         <Button 
                                           variant="outline" 
                                           size="sm"
                                           onClick={() => handleMarkPaid(installment.id, plan.id)}
                                         >
                                           <DollarSign className="h-4 w-4 mr-1" />
                                           Marcar Pagado
                                         </Button>
                                       ) : (
                                         <Badge variant="default">Pagado</Badge>
                                       )}
                                     </TableCell>
                                   )}
                                   {mode === 'sales' && (
                                     <TableCell>
                                       {installment.status !== 'paid' && (
                                         <Button 
                                           variant="outline" 
                                           size="sm"
                                           onClick={handleInformativeAction}
                                         >
                                           <DollarSign className="h-4 w-4 mr-1" />
                                           Marcar Pagado
                                         </Button>
                                       )}
                                     </TableCell>
                                   )}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                  
                  {mode === 'sales' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleInformativeAction}
                    >
                      <DollarSign className="h-4 w-4 mr-1" />
                      Gestionar Pagos
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      
      {paymentPlans.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No se encontraron planes de pago activos</p>
            {selectedClientId || selectedProjectId ? (
              <p className="text-sm text-muted-foreground mt-2">
                Aplicando filtros: {selectedClientId ? 'Cliente específico' : ''} 
                {selectedProjectId ? 'Proyecto específico' : ''}
              </p>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
};