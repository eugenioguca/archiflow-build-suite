import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, DollarSign, Clock, CheckCircle, AlertTriangle, Search, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface PaymentPlan {
  id: string;
  client_project_id: string;
  plan_name: string;
  total_amount: number;
  currency: string;
  status: string;
  created_at: string;
  client_projects?: {
    project_name: string;
    clients?: {
      full_name: string;
    }
  } | null;
}

interface PaymentInstallment {
  id: string;
  payment_plan_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  paid_date?: string;
  status: string;
  description?: string;
  reference_number?: string;
}

interface PaymentDialogData {
  installment: PaymentInstallment;
  planName: string;
  clientName: string;
}

interface PaymentPlansFinanceProps {
  selectedClientId?: string;
  selectedProjectId?: string;
}

export const PaymentPlansFinance = ({ selectedClientId, selectedProjectId }: PaymentPlansFinanceProps) => {
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [installments, setInstallments] = useState<PaymentInstallment[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentDialog, setPaymentDialog] = useState<PaymentDialogData | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    paid_date: '',
    payment_method: '',
    reference_number: '',
    notes: ''
  });
  
  const { toast } = useToast();

  useEffect(() => {
    fetchPaymentPlans();
  }, [selectedClientId, selectedProjectId]);

  useEffect(() => {
    if (selectedPlan) {
      fetchInstallments(selectedPlan);
    }
  }, [selectedPlan]);

  const fetchPaymentPlans = async () => {
    try {
      let query = supabase
        .from('payment_plans')
        .select(`
          id,
          plan_name,
          client_project_id,
          total_amount,
          currency,
          status,
          created_at,
          client_projects(
            project_name,
            client_id,
            clients(full_name)
          )
        `)
        .in('status', ['active', 'draft']);

      // Apply filters
      if (selectedProjectId) {
        query = query.eq('client_project_id', selectedProjectId);
      } else if (selectedClientId) {
        query = query.eq('client_projects.client_id', selectedClientId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform data to match the interface
      const transformedData = (data || []).map((plan: any) => ({
        id: plan.id,
        client_project_id: plan.client_project_id || '',
        plan_name: plan.plan_name,
        total_amount: plan.total_amount,
        currency: plan.currency,
        status: plan.status,
        created_at: plan.created_at,
        client_projects: plan.client_projects ? {
          project_name: plan.client_projects.project_name,
          clients: plan.client_projects.clients ? {
            full_name: plan.client_projects.clients.full_name
          } : undefined
        } : null
      }));

      setPaymentPlans(transformedData);
    } catch (error) {
      console.error('Error fetching payment plans:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los planes de pago",
        variant: "destructive",
      });
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
      toast({
        title: "Error",
        description: "No se pudieron cargar las cuotas",
        variant: "destructive",
      });
    }
  };

  const handleMarkAsPaid = async () => {
    if (!paymentDialog) return;

    try {
      const { error } = await supabase
        .from('payment_installments')
        .update({
          status: 'paid',
          paid_date: paymentForm.paid_date,
          reference_number: paymentForm.reference_number,
        })
        .eq('id', paymentDialog.installment.id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Cuota marcada como pagada correctamente",
      });

      // Refresh installments
      if (selectedPlan) {
        fetchInstallments(selectedPlan);
      }
      
      setPaymentDialog(null);
      setPaymentForm({
        paid_date: '',
        payment_method: '',
        reference_number: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error marking payment:', error);
      toast({
        title: "Error",
        description: "No se pudo marcar la cuota como pagada",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendiente', variant: 'secondary' as const },
      overdue: { label: 'Vencido', variant: 'destructive' as const },
      paid: { label: 'Pagado', variant: 'default' as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number, currency: string = 'MXN') => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const filteredPlans = paymentPlans.filter(plan => {
    const matchesSearch = plan.plan_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (plan.client_projects?.clients?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (plan.client_projects?.project_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const filteredInstallments = installments.filter(installment => {
    if (statusFilter === 'all') return true;
    return installment.status === statusFilter;
  });

  const openPaymentDialog = (installment: PaymentInstallment) => {
    const plan = paymentPlans.find(p => p.id === installment.payment_plan_id);
    if (plan) {
      setPaymentDialog({
        installment,
        planName: plan.plan_name,
        clientName: plan.client_projects?.clients?.full_name || 'Cliente no encontrado'
      });
      setPaymentForm({
        paid_date: new Date().toISOString().split('T')[0],
        payment_method: '',
        reference_number: '',
        notes: ''
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Planes de Pago</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Cargando...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Planes Activos</p>
                <p className="text-2xl font-bold">{paymentPlans.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-sm font-medium">Pagos Pendientes</p>
                <p className="text-2xl font-bold">
                  {installments.filter(i => i.status === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium">Vencidos</p>
                <p className="text-2xl font-bold">
                  {installments.filter(i => i.status === 'overdue').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Completados</p>
                <p className="text-2xl font-bold">
                  {installments.filter(i => i.status === 'paid').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment Plans List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Planes de Pago</CardTitle>
                <CardDescription>Gestión de planes de pago activos</CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente o proyecto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedPlan === plan.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{plan.plan_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {plan.client_projects?.clients?.full_name || 'Cliente no encontrado'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {plan.client_projects?.project_name || 'Proyecto no encontrado'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatCurrency(plan.total_amount, plan.currency)}
                      </p>
                      {getStatusBadge(plan.status)}
                    </div>
                  </div>
                </div>
              ))}
              {filteredPlans.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No se encontraron planes de pago
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Installments Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Cuotas de Pago</CardTitle>
                <CardDescription>
                  {selectedPlan ? 'Cuotas del plan seleccionado' : 'Selecciona un plan para ver las cuotas'}
                </CardDescription>
              </div>
              {selectedPlan && (
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pending">Pendientes</SelectItem>
                      <SelectItem value="overdue">Vencidos</SelectItem>
                      <SelectItem value="paid">Pagados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedPlan ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredInstallments.map((installment) => (
                  <div
                    key={installment.id}
                    className="p-3 rounded-lg border flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">Cuota #{installment.installment_number}</span>
                        {getStatusBadge(installment.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Vence: {format(new Date(installment.due_date), 'dd/MM/yyyy')}
                      </p>
                      {installment.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {installment.description}
                        </p>
                      )}
                      {installment.paid_date && (
                        <p className="text-xs text-green-600">
                          Pagado: {format(new Date(installment.paid_date), 'dd/MM/yyyy')}
                        </p>
                      )}
                    </div>
                    <div className="text-right space-y-2">
                      <p className="font-semibold">
                        {formatCurrency(installment.amount)}
                      </p>
                      {installment.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => openPaymentDialog(installment)}
                        >
                          Marcar Pagado
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {filteredInstallments.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No hay cuotas para mostrar
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Selecciona un plan de pago para ver sus cuotas
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Dialog */}
      <Dialog open={!!paymentDialog} onOpenChange={() => setPaymentDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar Cuota como Pagada</DialogTitle>
            <DialogDescription>
              {paymentDialog && (
                <>
                  Plan: {paymentDialog.planName} | Cliente: {paymentDialog.clientName}
                  <br />
                  Cuota #{paymentDialog.installment.installment_number} - {formatCurrency(paymentDialog.installment.amount)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="paid_date">Fecha de Pago</Label>
              <Input
                id="paid_date"
                type="date"
                value={paymentForm.paid_date}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, paid_date: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="payment_method">Método de Pago</Label>
              <Select
                value={paymentForm.payment_method}
                onValueChange={(value) => setPaymentForm(prev => ({ ...prev, payment_method: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="reference_number">Número de Referencia</Label>
              <Input
                id="reference_number"
                placeholder="Número de transferencia, cheque, etc."
                value={paymentForm.reference_number}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, reference_number: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="notes">Notas (Opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Observaciones adicionales..."
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setPaymentDialog(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleMarkAsPaid}
              disabled={!paymentForm.paid_date || !paymentForm.payment_method}
            >
              Confirmar Pago
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};