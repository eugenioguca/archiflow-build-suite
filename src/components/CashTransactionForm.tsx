import { useState, useEffect } from 'react';
import { ArrowDownCircle, ArrowUpCircle, RefreshCw, Receipt, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CashAccount {
  id: string;
  name: string;
  account_type: string;
  current_balance: number;
}

interface Project {
  id: string;
  name: string;
}

interface Client {
  id: string;
  full_name: string;
}

interface Supplier {
  id: string;
  company_name: string;
}

export function CashTransactionForm() {
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    cash_account_id: '',
    transaction_type: 'expense',
    category: '',
    amount: '',
    description: '',
    reference_number: '',
    project_id: '',
    supplier_id: '',
    client_id: '',
    employee_name: '',
    requires_receipt: true,
    receipt_provided: false,
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [accountsResult, projectsResult, clientsResult, suppliersResult] = await Promise.all([
        supabase
          .from('cash_accounts')
          .select('id, name, account_type, current_balance')
          .eq('status', 'active')
          .order('name'),
          
        supabase
          .from('projects')
          .select('id, name')
          .order('name'),
          
        supabase
          .from('clients')
          .select('id, full_name')
          .eq('status', 'active')
          .order('full_name'),
          
        supabase
          .from('suppliers')
          .select('id, company_name')
          .eq('status', 'active')
          .order('company_name')
      ]);

      if (accountsResult.error) throw accountsResult.error;
      if (projectsResult.error) throw projectsResult.error;
      if (clientsResult.error) throw clientsResult.error;
      if (suppliersResult.error) throw suppliersResult.error;

      setCashAccounts(accountsResult.data || []);
      setProjects(projectsResult.data || []);
      setClients(clientsResult.data || []);
      setSuppliers(suppliersResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      cash_account_id: '',
      transaction_type: 'expense',
      category: '',
      amount: '',
      description: '',
      reference_number: '',
      project_id: '',
      supplier_id: '',
      client_id: '',
      employee_name: '',
      requires_receipt: true,
      receipt_provided: false,
      notes: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('El monto debe ser un número válido mayor a 0');
      }

      const selectedAccount = cashAccounts.find(acc => acc.id === formData.cash_account_id);
      if (!selectedAccount) {
        throw new Error('Debe seleccionar una cuenta de efectivo');
      }

      // Validar balance para gastos
      if ((formData.transaction_type === 'expense' || formData.transaction_type === 'transfer_out') 
          && selectedAccount.current_balance < amount) {
        throw new Error('Saldo insuficiente en la cuenta seleccionada');
      }

      const transactionData = {
        cash_account_id: formData.cash_account_id,
        transaction_type: formData.transaction_type,
        category: formData.category,
        amount: amount,
        description: formData.description,
        reference_number: formData.reference_number || null,
        project_id: formData.project_id === 'none' ? null : (formData.project_id || null),
        supplier_id: formData.supplier_id === 'none' ? null : (formData.supplier_id || null),
        client_id: formData.client_id === 'none' ? null : (formData.client_id || null),
        employee_name: formData.employee_name || null,
        requires_receipt: formData.requires_receipt,
        receipt_provided: formData.receipt_provided,
        notes: formData.notes || null,
        approval_status: 'pending',
        fiscal_compliant: true,
        created_by: (await supabase.auth.getUser()).data.user?.id
      };

      const { error } = await supabase
        .from('cash_transactions')
        .insert(transactionData);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Transacción registrada correctamente"
      });

      resetForm();
      fetchData(); // Actualizar balances
    } catch (error: any) {
      console.error('Error saving transaction:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar la transacción",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'income':
      case 'transfer_in':
        return <ArrowDownCircle className="h-5 w-5 text-green-600" />;
      case 'expense':
      case 'transfer_out':
        return <ArrowUpCircle className="h-5 w-5 text-red-600" />;
      default:
        return <RefreshCw className="h-5 w-5" />;
    }
  };

  const getCategories = (transactionType: string) => {
    if (transactionType === 'income' || transactionType === 'transfer_in') {
      return [
        { value: 'client_payment', label: 'Pago de Cliente' },
        { value: 'loan', label: 'Préstamo' },
        { value: 'investment', label: 'Inversión' },
        { value: 'refund', label: 'Reembolso' },
        { value: 'other_income', label: 'Otros Ingresos' }
      ];
    } else {
      return [
        { value: 'construction_expense', label: 'Gastos de Construcción' },
        { value: 'materials', label: 'Materiales' },
        { value: 'payroll', label: 'Nómina' },
        { value: 'advance_payment', label: 'Anticipo a Empleado' },
        { value: 'administrative', label: 'Gastos Administrativos' },
        { value: 'transport', label: 'Transporte' },
        { value: 'tools', label: 'Herramientas' },
        { value: 'services', label: 'Servicios' },
        { value: 'other_expense', label: 'Otros Gastos' }
      ];
    }
  };

  const selectedAccount = cashAccounts.find(acc => acc.id === formData.cash_account_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Registro de Transacciones de Efectivo</h2>
          <p className="text-muted-foreground">
            Registra ingresos y gastos de efectivo
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Saldos de Cuentas */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Saldos Disponibles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cashAccounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between p-2 border rounded">
                <div>
                  <div className="font-medium text-sm">{account.name}</div>
                  <div className="text-xs text-muted-foreground">{account.account_type}</div>
                </div>
                <div className="font-semibold">
                  {formatCurrency(account.current_balance)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Formulario */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getTransactionIcon(formData.transaction_type)}
              Nueva Transacción
            </CardTitle>
            <CardDescription>
              Complete los datos de la transacción de efectivo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Tipo de Transacción y Cuenta */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transaction_type">Tipo de Transacción</Label>
                  <Select 
                    value={formData.transaction_type} 
                    onValueChange={(value) => setFormData({ ...formData, transaction_type: value, category: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Ingreso</SelectItem>
                      <SelectItem value="expense">Gasto</SelectItem>
                      <SelectItem value="transfer_in">Transferencia Entrada</SelectItem>
                      <SelectItem value="transfer_out">Transferencia Salida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cash_account_id">Cuenta de Efectivo</Label>
                  <Select value={formData.cash_account_id} onValueChange={(value) => setFormData({ ...formData, cash_account_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cuenta" />
                    </SelectTrigger>
                    <SelectContent>
                      {cashAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} - {formatCurrency(account.current_balance)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedAccount && (
                    <div className="text-sm text-muted-foreground">
                      Saldo actual: {formatCurrency(selectedAccount.current_balance)}
                    </div>
                  )}
                </div>
              </div>

              {/* Categoría y Monto */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Categoría</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {getCategories(formData.transaction_type).map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Monto</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              {/* Descripción y Referencia */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción de la transacción"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reference_number">Número de Referencia</Label>
                  <Input
                    id="reference_number"
                    value={formData.reference_number}
                    onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                    placeholder="Folio, recibo, etc."
                  />
                </div>
              </div>

              {/* Relaciones */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="project_id">Proyecto (Opcional)</Label>
                  <Select value={formData.project_id} onValueChange={(value) => setFormData({ ...formData, project_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sin proyecto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin proyecto específico</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {(formData.transaction_type === 'expense' || formData.transaction_type === 'transfer_out') && (
                  <div className="space-y-2">
                    <Label htmlFor="supplier_id">Proveedor (Opcional)</Label>
                    <Select value={formData.supplier_id} onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin proveedor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin proveedor específico</SelectItem>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.company_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(formData.transaction_type === 'income' || formData.transaction_type === 'transfer_in') && (
                  <div className="space-y-2">
                    <Label htmlFor="client_id">Cliente (Opcional)</Label>
                    <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin cliente específico</SelectItem>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.category === 'advance_payment' && (
                  <div className="space-y-2">
                    <Label htmlFor="employee_name">Nombre del Empleado</Label>
                    <Input
                      id="employee_name"
                      value={formData.employee_name}
                      onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
                      placeholder="Nombre completo"
                    />
                  </div>
                )}
              </div>

              {/* Opciones de Comprobante */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="requires_receipt" className="flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      Requiere Comprobante Fiscal
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Marca si esta transacción necesita un comprobante fiscal
                    </p>
                  </div>
                  <Switch
                    id="requires_receipt"
                    checked={formData.requires_receipt}
                    onCheckedChange={(checked) => setFormData({ ...formData, requires_receipt: checked })}
                  />
                </div>

                {formData.requires_receipt && (
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="receipt_provided">Comprobante Proporcionado</Label>
                      <p className="text-sm text-muted-foreground">
                        ¿Ya se proporcionó el comprobante fiscal?
                      </p>
                    </div>
                    <Switch
                      id="receipt_provided"
                      checked={formData.receipt_provided}
                      onCheckedChange={(checked) => setFormData({ ...formData, receipt_provided: checked })}
                    />
                  </div>
                )}
              </div>

              {/* Notas */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notas Adicionales</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Información adicional sobre la transacción"
                  rows={3}
                />
              </div>

              {/* Alertas */}
              {selectedAccount && formData.amount && 
               ((formData.transaction_type === 'expense' || formData.transaction_type === 'transfer_out') && 
                selectedAccount.current_balance < parseFloat(formData.amount)) && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive font-medium">
                    ⚠️ Saldo insuficiente en la cuenta seleccionada
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Limpiar
                </Button>
                <Button type="submit" disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Guardando...' : 'Registrar Transacción'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}