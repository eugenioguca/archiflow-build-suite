import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Package, 
  DollarSign, 
  CreditCard,
  Wallet,
  ArrowRight,
  Building2,
  Calendar
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface TreasuryMaterialPayment {
  id: string;
  reference_code: string;
  supplier_id: string | null;
  supplier_name: string;
  total_amount: number;
  material_count: number;
  status: string;
  created_at: string;
  items: MaterialPaymentItem[];
}

interface MaterialPaymentItem {
  id: string;
  material_finance_request_id: string;
  amount: number;
  material_name: string;
  quantity: number;
  unit_cost: number;
  client_name: string;
  project_name: string;
  client_id: string;
  project_id: string;
}

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  current_balance: number;
}

interface CashAccount {
  id: string;
  name: string;
  current_balance: number;
}

interface TreasuryMaterialsPaymentsProps {
  selectedClientId?: string;
  selectedProjectId?: string;
}

export const TreasuryMaterialsPayments: React.FC<TreasuryMaterialsPaymentsProps> = ({
  selectedClientId,
  selectedProjectId
}) => {
  const [payments, setPayments] = useState<TreasuryMaterialPayment[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<TreasuryMaterialPayment | null>(null);
  const [selectedAccountType, setSelectedAccountType] = useState<"bank" | "cash">("bank");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedClientId, selectedProjectId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchMaterialPayments(),
        fetchBankAccounts(),
        fetchCashAccounts()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterialPayments = async () => {
    let query = supabase
      .from('treasury_material_payments')
      .select(`
        *,
        treasury_material_payment_items (
          id,
          material_finance_request_id,
          amount
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    const formattedPayments: TreasuryMaterialPayment[] = (data || []).map(payment => ({
      id: payment.id,
      reference_code: payment.reference_code,
      supplier_id: payment.supplier_id,
      supplier_name: payment.supplier_name,
      total_amount: payment.total_amount,
      material_count: payment.material_count,
      status: payment.status,
      created_at: payment.created_at,
      items: (payment.treasury_material_payment_items || []).map((item: any) => ({
        id: item.id,
        material_finance_request_id: item.material_finance_request_id,
        amount: item.amount,
        material_name: 'Material',
        quantity: 1,
        unit_cost: item.amount,
        client_name: '',
        project_name: '',
        client_id: '',
        project_id: ''
      }))
    }));

    // Apply client/project filters
    const filteredPayments = formattedPayments.filter(payment => {
      if (selectedClientId) {
        return payment.items.some(item => item.client_id === selectedClientId);
      }
      if (selectedProjectId) {
        return payment.items.some(item => item.project_id === selectedProjectId);
      }
      return true;
    });

    setPayments(filteredPayments);
  };

  const fetchBankAccounts = async () => {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('id, bank_name, account_number, current_balance')
      .eq('status', 'active')
      .order('bank_name');

    if (error) throw error;
    setBankAccounts(data || []);
  };

  const fetchCashAccounts = async () => {
    const { data, error } = await supabase
      .from('cash_accounts')
      .select('id, name, current_balance')
      .eq('status', 'active')
      .order('name');

    if (error) throw error;
    setCashAccounts(data || []);
  };

  const handleProcessPayment = (payment: TreasuryMaterialPayment) => {
    setSelectedPayment(payment);
    setSelectedAccountType("bank");
    setSelectedAccountId("");
    setIsDialogOpen(true);
  };

  const handleCreateTransactions = async () => {
    if (!selectedPayment || !selectedAccountId) {
      toast.error('Seleccione una cuenta para procesar el pago');
      return;
    }

    setIsProcessing(true);
    try {
      // Get current user profile
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.user.id)
        .single();

      if (!profile) throw new Error('Perfil no encontrado');

      // Create treasury transactions for each material
      const transactions = selectedPayment.items.map(item => ({
        transaction_type: 'expense',
        account_type: selectedAccountType,
        account_id: selectedAccountId,
        client_id: item.client_id,
        project_id: item.project_id,
        supplier_id: selectedPayment.supplier_id,
        department: 'construccion',
        transaction_date: new Date().toISOString().split('T')[0],
        amount: item.amount,
        description: `Material: ${item.material_name} - Cantidad: ${item.quantity}`,
        cuenta_mayor: '5110', // Materiales
        partida: item.material_name,
        unit: 'pieza',
        quantity: item.quantity,
        cost_per_unit: item.unit_cost,
        material_payment_reference: selectedPayment.reference_code,
        comments: `Pago de material ref: ${selectedPayment.reference_code}`,
        status: 'completed',
        created_by: profile.id
      }));

      const { error: transError } = await supabase
        .from('treasury_transactions')
        .insert(transactions);

      if (transError) throw transError;

      // Update payment status
      const { error: updateError } = await supabase
        .from('treasury_material_payments')
        .update({
          status: 'processed',
          account_type: selectedAccountType,
          account_id: selectedAccountId,
          processed_by: profile.id,
          processed_at: new Date().toISOString()
        })
        .eq('id', selectedPayment.id);

      if (updateError) throw updateError;

      toast.success('Transacciones creadas exitosamente');
      setIsDialogOpen(false);
      fetchData();

    } catch (error) {
      console.error('Error creating transactions:', error);
      toast.error('Error al procesar el pago');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (payments.length === 0) {
    return null; // Don't show if no pending payments
  }

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Package className="h-5 w-5" />
          Materiales a Pagar
        </CardTitle>
        <p className="text-sm text-blue-600">
          {payments.length} agrupación{payments.length !== 1 ? 'es' : ''} de materiales pendientes de pago
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {payments.map((payment) => (
          <Card key={payment.id} className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{payment.supplier_name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Ref: {payment.reference_code} • {format(new Date(payment.created_at), "dd/MM/yyyy", { locale: es })}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-700">
                    {formatCurrency(payment.total_amount)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {payment.material_count} material{payment.material_count !== 1 ? 'es' : ''}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 mb-4 max-h-32 overflow-y-auto">
                {payment.items.map((item) => (
                  <div key={item.id} className="text-sm bg-white p-2 rounded border">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{item.material_name}</p>
                        <p className="text-muted-foreground text-xs">
                          {item.client_name} • {item.project_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(item.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} × {formatCurrency(item.unit_cost)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Dialog open={isDialogOpen && selectedPayment?.id === payment.id} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => handleProcessPayment(payment)}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Ingresar a Tabla
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Procesar Pago de Materiales</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-sm font-medium">Proveedor: {payment.supplier_name}</p>
                      <p className="text-lg font-bold text-blue-600">{formatCurrency(payment.total_amount)}</p>
                      <p className="text-xs text-gray-600">Ref: {payment.reference_code}</p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium">Tipo de Cuenta</label>
                        <Select value={selectedAccountType} onValueChange={(value: "bank" | "cash") => {
                          setSelectedAccountType(value);
                          setSelectedAccountId("");
                        }}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bank">
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4" />
                                Banco
                              </div>
                            </SelectItem>
                            <SelectItem value="cash">
                              <div className="flex items-center gap-2">
                                <Wallet className="h-4 w-4" />
                                Efectivo
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Cuenta</label>
                        <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar cuenta" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedAccountType === "bank" 
                              ? bankAccounts.map((account) => (
                                  <SelectItem key={account.id} value={account.id}>
                                    {account.bank_name} - {account.account_number} 
                                    ({formatCurrency(account.current_balance)})
                                  </SelectItem>
                                ))
                              : cashAccounts.map((account) => (
                                  <SelectItem key={account.id} value={account.id}>
                                    {account.name} ({formatCurrency(account.current_balance)})
                                  </SelectItem>
                                ))
                            }
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                        Cancelar
                      </Button>
                      <Button 
                        onClick={handleCreateTransactions}
                        disabled={isProcessing || !selectedAccountId}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                      >
                        {isProcessing ? "Procesando..." : "Procesar Pago"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
};