import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CurrencyInput } from "@/components/CurrencyInput";
import { DatePicker } from "@/components/DatePicker";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar, DollarSign, FileText, User, Building } from "lucide-react";

interface TreasuryTransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  accountType: "bank" | "cash";
  transactionType: "income" | "expense";
  selectedClientId?: string;
  selectedProjectId?: string;
}

interface FormData {
  transaction_date: Date;
  account_id: string;
  client_id: string;
  project_id: string;
  supplier_id: string;
  department: string;
  amount: number;
  description: string;
  cuenta_mayor: string;
  partida: string;
  sub_partida: string;
  unit: string;
  quantity: string;
  cost_per_unit: number;
  invoice_number: string;
  invoice_url: string;
  comments: string;
  requires_approval: boolean;
}

interface Account {
  id: string;
  name?: string; // cash accounts
  bank_name?: string; // bank accounts
  account_number?: string;
  current_balance: number;
}

interface Client {
  id: string;
  full_name: string;
}

interface Project {
  id: string;
  project_name: string;
  client_id: string;
}

interface Supplier {
  id: string;
  company_name: string;
}

interface GeneralLedgerAccount {
  id: string;
  account_code: string;
  account_name: string;
}

export const TreasuryTransactionForm: React.FC<TreasuryTransactionFormProps> = ({
  isOpen,
  onClose,
  accountType,
  transactionType,
  selectedClientId,
  selectedProjectId
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [generalLedgerAccounts, setGeneralLedgerAccounts] = useState<GeneralLedgerAccount[]>([]);
  const [partidas, setPartidas] = useState<Array<{id: string; code: string; name: string}>>([]);

  const [formData, setFormData] = useState<FormData>({
    transaction_date: new Date(),
    account_id: "",
    client_id: selectedClientId || "",
    project_id: selectedProjectId || "",
    supplier_id: "",
    department: "",
    amount: 0,
    description: "",
    cuenta_mayor: "",
    partida: "",
    sub_partida: "",
    unit: "",
    quantity: "0",
    cost_per_unit: 0,
    invoice_number: "",
    invoice_url: "",
    comments: "",
    requires_approval: false
  });

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, accountType]);

  const fetchData = async () => {
    try {
      // Fetch accounts based on type
      const accountTable = accountType === 'bank' ? 'bank_accounts' : 'cash_accounts';
      const { data: accountsData } = await supabase
        .from(accountTable)
        .select('*')
        .eq('status', 'active');

      // Fetch clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, full_name')
        .order('full_name');

      // Fetch projects
      const { data: projectsData } = await supabase
        .from('client_projects')
        .select('id, project_name, client_id')
        .order('project_name');

      // Fetch suppliers
      const { data: suppliersData } = await supabase
        .from('suppliers')
        .select('id, company_name')
        .order('company_name');

      // Fetch general ledger accounts
      const { data: ledgerData } = await supabase
        .from('general_ledger_accounts')
        .select('*')
        .eq('is_active', true)
        .order('account_code');

      // Fetch partidas
      const { data: partidasData } = await supabase
        .from('partidas_catalog')
        .select('id, codigo, nombre')
        .eq('activo', true)
        .order('codigo');

      setAccounts(accountsData || []);
      setClients(clientsData || []);
      setProjects(projectsData || []);
      setSuppliers(suppliersData || []);
      setGeneralLedgerAccounts(ledgerData || []);
      setPartidas((partidasData || []).map(p => ({ id: p.id, code: p.codigo, name: p.nombre })));
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const filteredProjects = projects.filter(project => 
    !formData.client_id || project.client_id === formData.client_id
  );

  const departments = [
    { value: "ventas", label: "Ventas" },
    { value: "diseño", label: "Diseño" },
    { value: "construccion", label: "Construcción" },
    { value: "finanzas", label: "Finanzas" },
    { value: "contabilidad", label: "Contabilidad" },
    { value: "direccion_general", label: "Dirección General" }
  ];

  const units = [
    "Pieza", "Kg", "M2", "M3", "Litro", "Bulto", "Caja", "Salida", "Global", "Lote"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const transactionData = {
        transaction_type: transactionType,
        account_type: accountType,
        account_id: formData.account_id,
        client_id: formData.client_id || null,
        project_id: formData.project_id || null,
        supplier_id: formData.supplier_id || null,
        department: formData.department,
        transaction_date: formData.transaction_date.toISOString().split('T')[0],
        amount: formData.amount,
        description: formData.description,
        cuenta_mayor: formData.cuenta_mayor,
        partida: formData.partida,
        sub_partida: formData.sub_partida,
        unit: formData.unit,
        quantity: formData.quantity ? parseFloat(formData.quantity) : null,
        cost_per_unit: formData.cost_per_unit || null,
        invoice_number: formData.invoice_number,
        invoice_url: formData.invoice_url,
        comments: formData.comments,
        requires_approval: formData.requires_approval,
        created_by: profile.id
      };

      const { error } = await supabase
        .from('treasury_transactions')
        .insert([transactionData]);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `${transactionType === 'income' ? 'Ingreso' : 'Egreso'} registrado correctamente`
      });

      onClose();
      // Reset form
      setFormData({
        transaction_date: new Date(),
        account_id: "",
        client_id: selectedClientId || "",
        project_id: selectedProjectId || "",
        supplier_id: "",
        department: "",
        amount: 0,
        description: "",
        cuenta_mayor: "",
        partida: "",
        sub_partida: "",
        unit: "",
        quantity: "0",
        cost_per_unit: 0,
        invoice_number: "",
        invoice_url: "",
        comments: "",
        requires_approval: false
      });
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast({
        title: "Error",
        description: "No se pudo registrar la transacción",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getAccountDisplayName = (account: Account) => {
    if (accountType === 'bank') {
      return `${account.bank_name} - ****${account.account_number?.slice(-4)}`;
    }
    return account.name;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0 pb-4">
          <DialogTitle className="flex items-center gap-2">
            {transactionType === 'income' ? (
              <DollarSign className="h-5 w-5 text-green-600" />
            ) : (
              <DollarSign className="h-5 w-5 text-red-600" />
            )}
            {transactionType === 'income' ? 'Nuevo Ingreso' : 'Nuevo Egreso'} - {accountType === 'bank' ? 'Banco' : 'Efectivo'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 max-h-[calc(90vh-200px)]">
          <form id="treasury-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Información Básica
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Fecha de Transacción</Label>
                <DatePicker
                  date={formData.transaction_date}
                  onDateChange={(date) => setFormData({ ...formData, transaction_date: date || new Date() })}
                />
              </div>

              <div>
                <Label>Cuenta</Label>
                <Select
                  value={formData.account_id}
                  onValueChange={(value) => setFormData({ ...formData, account_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Seleccionar cuenta ${accountType === 'bank' ? 'bancaria' : 'de efectivo'}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {getAccountDisplayName(account)} - ${account.current_balance.toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Cliente</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value, project_id: "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Proyecto</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                  disabled={!formData.client_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredProjects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.project_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Departamento</Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => setFormData({ ...formData, department: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.value} value={dept.value}>
                        {dept.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Proveedor</Label>
                <Select
                  value={formData.supplier_id}
                  onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Financial Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Detalles Financieros
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Monto Total</Label>
                <CurrencyInput
                  value={formData.amount}
                  onChange={(value) => setFormData({ ...formData, amount: value })}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <Label>Descripción</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  placeholder="Descripción de la transacción"
                />
              </div>

              <div>
                <Label>Cuenta de Mayor</Label>
                <Select
                  value={formData.cuenta_mayor}
                  onValueChange={(value) => setFormData({ ...formData, cuenta_mayor: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cuenta de mayor" />
                  </SelectTrigger>
                  <SelectContent>
                    {generalLedgerAccounts.map(account => (
                      <SelectItem key={account.id} value={account.account_code}>
                        {account.account_code} - {account.account_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Partida</Label>
                <Select
                  value={formData.partida}
                  onValueChange={(value) => setFormData({ ...formData, partida: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar partida" />
                  </SelectTrigger>
                  <SelectContent>
                    {partidas.map(partida => (
                      <SelectItem key={partida.id} value={partida.code}>
                        {partida.code} - {partida.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Sub-partida</Label>
                <Input
                  value={formData.sub_partida}
                  onChange={(e) => setFormData({ ...formData, sub_partida: e.target.value })}
                  placeholder="Sub-partida"
                />
              </div>

              <div>
                <Label>Unidad</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) => setFormData({ ...formData, unit: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map(unit => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="Cantidad"
                />
              </div>

              <div>
                <Label>Costo Unitario</Label>
                <CurrencyInput
                  value={formData.cost_per_unit}
                  onChange={(value) => setFormData({ ...formData, cost_per_unit: value })}
                  placeholder="Costo por unidad"
                />
              </div>
            </CardContent>
          </Card>

          {/* Invoice and Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Facturación y Documentos
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Número de Factura {accountType === 'cash' && <span className="text-muted-foreground">(Opcional)</span>}</Label>
                <Input
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  placeholder="Número de factura"
                  required={accountType === 'bank'}
                />
              </div>

              <div>
                <Label>URL de Factura</Label>
                <Input
                  type="url"
                  value={formData.invoice_url}
                  onChange={(e) => setFormData({ ...formData, invoice_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="md:col-span-2">
                <Label>Comentarios</Label>
                <Textarea
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  placeholder="Comentarios adicionales..."
                  rows={3}
                />
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="requires_approval"
                    checked={formData.requires_approval}
                    onCheckedChange={(checked) => setFormData({ ...formData, requires_approval: !!checked })}
                  />
                  <Label htmlFor="requires_approval">
                    Requiere aprobación adicional
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          </form>
        </div>
        
        {/* Fixed Footer with Actions */}
        <div className="shrink-0 border-t pt-4 mt-4">
          <div className="flex gap-2">
            <Button type="submit" disabled={loading} className="flex-1" form="treasury-form">
              {loading ? "Procesando..." : `Registrar ${transactionType === 'income' ? 'Ingreso' : 'Egreso'}`}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};