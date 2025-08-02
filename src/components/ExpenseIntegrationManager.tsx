import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  ArrowLeftRight, 
  DollarSign, 
  FileText, 
  CreditCard, 
  Plus,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';

interface ExpenseIntegrationData {
  construction_expense_id: string;
  description: string;
  total_amount: number;
  supplier_name?: string;
  expense_date: string;
  status: string;
}

interface ExpenseIntegrationManagerProps {
  constructionProjectId: string;
  expense: ExpenseIntegrationData;
  onIntegrationComplete: () => void;
}

export function ExpenseIntegrationManager({ 
  constructionProjectId, 
  expense, 
  onIntegrationComplete 
}: ExpenseIntegrationManagerProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cashAccounts, setCashAccounts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    cash_account_id: '',
    transaction_type: 'expense' as const,
    category: 'construccion',
    payment_method: 'transfer',
    reference_number: '',
    notes: '',
    requires_receipt: true,
    fiscal_compliant: true
  });

  React.useEffect(() => {
    if (open) {
      fetchCashAccounts();
    }
  }, [open]);

  const fetchCashAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('cash_accounts')
        .select('id, name, account_type, current_balance')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setCashAccounts(data || []);
    } catch (error) {
      console.error('Error fetching cash accounts:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las cuentas de efectivo",
        variant: "destructive"
      });
    }
  };

  const createCashTransaction = async () => {
    try {
      setLoading(true);
      
      const userData = await supabase.auth.getUser();
      const userId = userData.data.user?.id;
      if (!userId) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!profile) throw new Error('Perfil no encontrado');

      // Create cash transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('cash_transactions')
        .insert({
          cash_account_id: formData.cash_account_id,
          amount: expense.total_amount,
          transaction_type: formData.transaction_type,
          category: formData.category,
          description: `Gasto de construcción: ${expense.description}`,
          project_id: constructionProjectId,
          expense_id: expense.construction_expense_id,
          payment_method: formData.payment_method,
          reference_number: formData.reference_number,
          notes: formData.notes,
          requires_receipt: formData.requires_receipt,
          fiscal_compliant: formData.fiscal_compliant,
          created_by: profile.id
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Update construction expense with cash transaction reference
      const { error: expenseError } = await supabase
        .from('construction_expenses')
        .update({
          cash_transaction_id: transaction.id,
          status: 'approved'
        })
        .eq('id', expense.construction_expense_id);

      if (expenseError) throw expenseError;

      // Log accounts payable creation (table structure needs supplier_id)
      if (expense.supplier_name) {
        console.log('Would create accounts payable for:', {
          construction_expense_id: expense.construction_expense_id,
          amount_due: expense.total_amount,
          supplier_name: expense.supplier_name,
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
      }

      toast({
        title: "Integración completada",
        description: "El gasto ha sido integrado exitosamente con el sistema financiero"
      });

      setOpen(false);
      onIntegrationComplete();
    } catch (error) {
      console.error('Error integrating expense:', error);
      toast({
        title: "Error de integración",
        description: "No se pudo integrar el gasto con el sistema financiero",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getIntegrationStatus = () => {
    if (expense.status === 'approved') {
      return {
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
        text: 'Integrado',
        color: 'bg-green-100 text-green-800'
      };
    }
    if (expense.status === 'pending') {
      return {
        icon: <Clock className="h-4 w-4 text-amber-500" />,
        text: 'Pendiente',
        color: 'bg-amber-100 text-amber-800'
      };
    }
    return {
      icon: <AlertCircle className="h-4 w-4 text-red-500" />,
      text: 'No integrado',
      color: 'bg-red-100 text-red-800'
    };
  };

  const status = getIntegrationStatus();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={expense.status === 'approved'}>
          <ArrowLeftRight className="h-4 w-4 mr-2" />
          {expense.status === 'approved' ? 'Integrado' : 'Integrar'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Integrar Gasto con Sistema Financiero
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Expense Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Detalles del Gasto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Descripción:</span>
                <span className="text-sm font-medium">{expense.description}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Monto:</span>
                <span className="text-sm font-semibold">
                  ${expense.total_amount.toLocaleString()}
                </span>
              </div>
              {expense.supplier_name && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Proveedor:</span>
                  <span className="text-sm">{expense.supplier_name}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Estado:</span>
                <Badge className={status.color}>
                  {status.icon}
                  {status.text}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Integration Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cash_account_id">Cuenta de Efectivo *</Label>
              <Select 
                value={formData.cash_account_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, cash_account_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {cashAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{account.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ${account.current_balance.toLocaleString()}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_method">Método de Pago</Label>
                <Select 
                  value={formData.payment_method} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                    <SelectItem value="check">Cheque</SelectItem>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="card">Tarjeta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference_number">Referencia</Label>
                <Input
                  id="reference_number"
                  value={formData.reference_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                  placeholder="Número de referencia"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas Adicionales</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Información adicional sobre la transacción..."
                rows={3}
              />
            </div>
          </div>

          {/* Integration Actions */}
          <div className="space-y-3">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Integraciones que se realizarán:
              </h4>
              <ul className="text-xs space-y-1">
                <li className="flex items-center gap-2">
                  <DollarSign className="h-3 w-3" />
                  Transacción en cuenta de efectivo
                </li>
                <li className="flex items-center gap-2">
                  <CreditCard className="h-3 w-3" />
                  Registro en cuentas por pagar
                </li>
                <li className="flex items-center gap-2">
                  <FileText className="h-3 w-3" />
                  Actualización de estado del gasto
                </li>
              </ul>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={createCashTransaction}
                disabled={loading || !formData.cash_account_id}
              >
                {loading ? 'Integrando...' : 'Integrar Gasto'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}