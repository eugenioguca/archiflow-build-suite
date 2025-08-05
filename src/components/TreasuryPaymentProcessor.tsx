import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, CreditCard, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface PaymentReference {
  id: string;
  reference_code: string;
  supplier_id: string;
  total_amount: number;
  account_type: string;
  account_id: string;
  status: string;
  created_at: string;
  notes: string;
  suppliers?: {
    company_name: string;
  };
  treasury_transactions?: Array<{
    id: string;
    description: string;
    amount: number;
    partida: string;
  }>;
}

interface BankAccount {
  id: string;
  account_holder: string;
  bank_name: string;
  account_number: string;
  current_balance: number;
}

interface PaymentProcessDialog {
  reference: PaymentReference;
  selectedBankId: string;
  paymentDate: string;
  notes: string;
}

interface TreasuryPaymentProcessorProps {
  selectedClientId?: string;
  selectedProjectId?: string;
}

export const TreasuryPaymentProcessor: React.FC<TreasuryPaymentProcessorProps> = ({
  selectedClientId,
  selectedProjectId
}) => {
  const [paymentReferences, setPaymentReferences] = useState<PaymentReference[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<PaymentProcessDialog | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [selectedClientId, selectedProjectId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchPaymentReferences(),
        fetchBankAccounts()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentReferences = async () => {
    try {
      let query = supabase
        .from('treasury_payment_references')
        .select(`
          *,
          suppliers (company_name),
          treasury_transactions (id, description, amount, partida)
        `)
        .eq('status', 'pending');

      if (selectedClientId) {
        query = query.eq('client_id', selectedClientId);
      }
      if (selectedProjectId) {
        query = query.eq('project_id', selectedProjectId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      setPaymentReferences((data || []) as any);
    } catch (error) {
      console.error('Error fetching payment references:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las referencias de pago",
        variant: "destructive",
      });
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('id, account_holder, bank_name, account_number, current_balance')
        .eq('status', 'active')
        .order('bank_name');

      if (error) throw error;
      setBankAccounts(data || []);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las cuentas bancarias",
        variant: "destructive",
      });
    }
  };

  const openPaymentDialog = (reference: PaymentReference) => {
    setPaymentDialog({
      reference,
      selectedBankId: '',
      paymentDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  const processPayment = async () => {
    if (!paymentDialog) return;

    try {
      setProcessing(true);

      // Get current user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Update payment reference status and assign bank account
      const { error: updateRefError } = await supabase
        .from('treasury_payment_references')
        .update({
          account_id: paymentDialog.selectedBankId,
          status: 'processed',
          notes: `${paymentDialog.reference.notes}\n\nProcesado: ${paymentDialog.notes}`
        })
        .eq('id', paymentDialog.reference.id);

      if (updateRefError) throw updateRefError;

      // Update all related treasury transactions
      const { error: updateTransError } = await supabase
        .from('treasury_transactions')
        .update({
          account_id: paymentDialog.selectedBankId,
          transaction_date: paymentDialog.paymentDate,
          status: 'completed'
        })
        .eq('payment_reference_id', paymentDialog.reference.id);

      if (updateTransError) throw updateTransError;

      // Create a single bank expense for the total amount to the supplier
      const { error: expenseError } = await supabase
        .from('expenses')
        .insert([{
          client_id: null, // This is a general supplier payment
          project_id: null,
          category: 'construction',
          description: `Pago a proveedor - Ref: ${paymentDialog.reference.reference_code}`,
          amount: paymentDialog.reference.total_amount,
          expense_date: paymentDialog.paymentDate,
          reference_number: paymentDialog.reference.reference_code,
          created_by: profile.id
        }]);

      if (expenseError) throw expenseError;

      toast({
        title: "Éxito",
        description: `Pago procesado correctamente. Total: $${paymentDialog.reference.total_amount.toLocaleString()}`,
      });

      // Refresh data
      fetchData();
      setPaymentDialog(null);
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar el pago",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendiente', variant: 'secondary' as const, icon: Clock },
      processed: { label: 'Procesado', variant: 'default' as const, icon: CheckCircle },
      cancelled: { label: 'Cancelado', variant: 'destructive' as const, icon: AlertCircle },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Procesador de Pagos de Tesorería</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Cargando...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Referencias de Pago Pendientes
          </CardTitle>
          <CardDescription>
            Procesa los pagos agrupados por proveedor desde las solicitudes de materiales
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentReferences.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-muted-foreground">
                No hay referencias de pago pendientes
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Materiales</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentReferences.map((reference) => (
                  <TableRow key={reference.id}>
                    <TableCell className="font-mono text-sm">
                      {reference.reference_code}
                    </TableCell>
                    <TableCell>
                      {reference.suppliers?.company_name || 'Proveedor no encontrado'}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(reference.total_amount)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {reference.treasury_transactions?.length || 0} materiales
                        {reference.treasury_transactions && reference.treasury_transactions.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {reference.treasury_transactions.slice(0, 2).map(t => t.partida).join(', ')}
                            {reference.treasury_transactions.length > 2 && ` +${reference.treasury_transactions.length - 2} más`}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(reference.status)}
                    </TableCell>
                    <TableCell>
                      {format(new Date(reference.created_at), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      {reference.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => openPaymentDialog(reference)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Building2 className="h-4 w-4 mr-2" />
                          Procesar Pago
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment Processing Dialog */}
      <Dialog open={!!paymentDialog} onOpenChange={() => setPaymentDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Procesar Pago a Proveedor</DialogTitle>
            <DialogDescription>
              {paymentDialog && (
                <>
                  Referencia: {paymentDialog.reference.reference_code}
                  <br />
                  Proveedor: {paymentDialog.reference.suppliers?.company_name}
                  <br />
                  Total: {formatCurrency(paymentDialog.reference.total_amount)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="bank_account">Cuenta Bancaria</Label>
              <Select
                value={paymentDialog?.selectedBankId || ''}
                onValueChange={(value) => setPaymentDialog(prev => 
                  prev ? { ...prev, selectedBankId: value } : null
                )}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cuenta bancaria" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex flex-col">
                        <span>{account.bank_name} - {account.account_holder}</span>
                        <span className="text-xs text-muted-foreground">
                          {account.account_number} | {formatCurrency(account.current_balance)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="payment_date">Fecha de Pago</Label>
              <Input
                id="payment_date"
                type="date"
                value={paymentDialog?.paymentDate || ''}
                onChange={(e) => setPaymentDialog(prev => 
                  prev ? { ...prev, paymentDate: e.target.value } : null
                )}
              />
            </div>

            <div>
              <Label htmlFor="notes">Notas Adicionales</Label>
              <Input
                id="notes"
                placeholder="Número de transferencia, observaciones..."
                value={paymentDialog?.notes || ''}
                onChange={(e) => setPaymentDialog(prev => 
                  prev ? { ...prev, notes: e.target.value } : null
                )}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setPaymentDialog(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={processPayment}
              disabled={!paymentDialog?.selectedBankId || processing}
            >
              {processing ? 'Procesando...' : 'Confirmar Pago'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};