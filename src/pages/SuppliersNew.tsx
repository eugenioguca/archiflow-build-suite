import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit2, Trash2, Building2, CreditCard, FileText, Filter, Download, DollarSign, Calendar, Receipt, Upload, AlertTriangle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EditableField } from "@/components/EditableField";
import { XMLUploader } from "@/components/XMLUploader";

interface Supplier {
  id: string;
  company_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  tax_id?: string;
  rfc?: string;
  regimen_fiscal?: string;
  codigo_postal?: string;
  uso_cfdi_default?: string;
  dias_credito?: number;
  limite_credito?: number;
  saldo_actual?: number;
  supplier_category: string;
  status: string;
  payment_terms?: number;
  credit_limit?: number;
  current_balance?: number;
  rating?: number;
  bank_name?: string;
  bank_account?: string;
  website?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface AccountsPayable {
  id: string;
  supplier_id: string;
  invoice_number?: string;
  amount_due: number;
  amount_paid?: number;
  due_date: string;
  invoice_date?: string;
  payment_status: string;
  payment_date?: string;
  payment_reference?: string;
  notes?: string;
  expense_id?: string;
  created_at: string;
  updated_at: string;
  supplier?: Supplier;
}

interface CFDIDocument {
  id: string;
  uuid_fiscal: string;
  rfc_emisor: string;
  rfc_receptor: string;
  fecha_emision: string;
  forma_pago: string;
  total: number;
  status: string;
  requires_complement?: boolean;
  complement_received?: boolean;
  supplier?: Supplier;
}

interface SupplierPayment {
  id: string;
  supplier_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
  status: string;
  supplier?: Supplier;
}

const categoryLabels = {
  materials: 'Materiales',
  equipment: 'Equipos',
  services: 'Servicios',
  subcontractor: 'Subcontratista',
  utilities: 'Servicios Públicos',
  other: 'Otros'
};

const statusLabels = {
  active: 'Activo',
  inactive: 'Inactivo',
  blocked: 'Bloqueado',
  pending_approval: 'Pendiente Aprobación'
};

const paymentStatusLabels = {
  pending: 'Pendiente',
  partial: 'Parcial',
  paid: 'Pagado',
  overdue: 'Vencido',
  cancelled: 'Cancelado'
};

export default function SuppliersNew() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [accountsPayable, setAccountsPayable] = useState<AccountsPayable[]>([]);
  const [cfdiDocuments, setCfdiDocuments] = useState<CFDIDocument[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [showPayableDialog, setShowPayableDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const { toast } = useToast();

  const [supplierFormData, setSupplierFormData] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    postal_code: "",
    rfc: "",
    regimen_fiscal: "",
    codigo_postal: "",
    uso_cfdi_default: "G03",
    dias_credito: 30,
    limite_credito: 0,
    supplier_category: "materials" as "materials" | "equipment" | "services" | "subcontractor" | "utilities" | "other",
    rating: 0,
    notes: "",
    website: ""
  });

  const [payableFormData, setPayableFormData] = useState({
    supplier_id: "",
    invoice_number: "",
    invoice_date: "",
    due_date: "",
    amount_due: 0,
    notes: ""
  });

  const [paymentFormData, setPaymentFormData] = useState({
    supplier_id: "",
    amount: 0,
    payment_date: "",
    payment_method: "transferencia",
    reference_number: "",
    notes: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchSuppliers(),
        fetchAccountsPayable(),
        fetchCFDIDocuments(),
        fetchSupplierPayments()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Error al cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('company_name');

    if (error) throw error;
    setSuppliers(data || []);
  };

  const fetchAccountsPayable = async () => {
    const { data, error } = await supabase
      .from('accounts_payable')
      .select(`
        *,
        supplier:suppliers(*)
      `)
      .order('due_date');

    if (error) throw error;
    setAccountsPayable(data || []);
  };

  const fetchCFDIDocuments = async () => {
    const { data, error } = await supabase
      .from('cfdi_documents')
      .select(`
        *,
        supplier:suppliers(*)
      `)
      .eq('tipo_comprobante', 'I')
      .order('fecha_emision', { ascending: false });

    if (error) throw error;
    setCfdiDocuments(data || []);
  };

  const fetchSupplierPayments = async () => {
    const { data, error } = await supabase
      .from('supplier_payments')
      .select(`
        *,
        supplier:suppliers(*)
      `)
      .order('payment_date', { ascending: false });

    if (error) throw error;
    setSupplierPayments(data || []);
  };

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "Usuario no autenticado",
          variant: "destructive",
        });
        return;
      }

      const supplierData = {
        ...supplierFormData,
        created_by: user.id,
        country: 'México'
      };

      if (editingSupplier) {
        const { error } = await supabase
          .from('suppliers')
          .update(supplierData)
          .eq('id', editingSupplier.id);

        if (error) throw error;

        toast({
          title: "Éxito",
          description: "Proveedor actualizado correctamente",
        });
      } else {
        const { error } = await supabase
          .from('suppliers')
          .insert(supplierData);

        if (error) throw error;

        toast({
          title: "Éxito",
          description: "Proveedor creado correctamente",
        });
      }

      setShowSupplierDialog(false);
      setEditingSupplier(null);
      resetSupplierForm();
      fetchSuppliers();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Error al procesar la solicitud",
        variant: "destructive",
      });
    }
  };

  const handlePayableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase
        .from('accounts_payable')
        .insert([payableFormData]);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Cuenta por pagar creada correctamente",
      });

      setShowPayableDialog(false);
      resetPayableForm();
      fetchAccountsPayable();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Error al crear la cuenta por pagar",
        variant: "destructive",
      });
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { error } = await supabase
        .from('supplier_payments')
        .insert([{
          ...paymentFormData,
          created_by: user.id
        }]);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Pago registrado correctamente",
      });

      setShowPaymentDialog(false);
      resetPaymentForm();
      fetchSupplierPayments();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Error al registrar el pago",
        variant: "destructive",
      });
    }
  };

  const updateSupplierField = async (supplierId: string, field: string, value: any) => {
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({ [field]: value })
        .eq('id', supplierId);

      if (error) throw error;

      setSuppliers(suppliers.map(s => 
        s.id === supplierId ? { ...s, [field]: value } : s
      ));

      toast({
        title: "Actualizado",
        description: "Campo actualizado correctamente",
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Error al actualizar el campo",
        variant: "destructive",
      });
    }
  };

  const resetSupplierForm = () => {
    setSupplierFormData({
      company_name: "",
      contact_name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      postal_code: "",
      rfc: "",
      regimen_fiscal: "",
      codigo_postal: "",
      uso_cfdi_default: "G03",
      dias_credito: 30,
      limite_credito: 0,
      supplier_category: "materials",
      rating: 0,
      notes: "",
      website: ""
    });
  };

  const resetPayableForm = () => {
    setPayableFormData({
      supplier_id: "",
      invoice_number: "",
      invoice_date: "",
      due_date: "",
      amount_due: 0,
      notes: ""
    });
  };

  const resetPaymentForm = () => {
    setPaymentFormData({
      supplier_id: "",
      amount: 0,
      payment_date: "",
      payment_method: "transferencia",
      reference_number: "",
      notes: ""
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'partial': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (supplier.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                         (supplier.rfc?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    const matchesCategory = categoryFilter === "all" || supplier.supplier_category === categoryFilter;
    const matchesStatus = statusFilter === "all" || supplier.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalPayable = accountsPayable.reduce((sum, payable) => sum + payable.amount_due, 0);
  const overduPayables = accountsPayable.filter(p => new Date(p.due_date) < new Date() && p.payment_status !== 'paid');
  const pendingCFDI = cfdiDocuments.filter(doc => doc.forma_pago === 'PPD' && !doc.complement_received);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión Avanzada de Proveedores</h1>
          <p className="text-muted-foreground">Sistema ERP integral con soporte CFDI mexicano</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <DollarSign className="h-4 w-4 mr-2" />
                Registrar Pago
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Registrar Pago a Proveedor</DialogTitle>
              </DialogHeader>
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                {/* Payment form fields */}
                <div>
                  <Label htmlFor="payment_supplier_id">Proveedor</Label>
                  <Select value={paymentFormData.supplier_id} onValueChange={(value) => setPaymentFormData({...paymentFormData, supplier_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="payment_amount">Monto del Pago</Label>
                  <Input
                    id="payment_amount"
                    type="number"
                    step="0.01"
                    value={paymentFormData.amount}
                    onChange={(e) => setPaymentFormData({...paymentFormData, amount: parseFloat(e.target.value)})}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="payment_date">Fecha de Pago</Label>
                  <Input
                    id="payment_date"
                    type="date"
                    value={paymentFormData.payment_date}
                    onChange={(e) => setPaymentFormData({...paymentFormData, payment_date: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="payment_method">Método de Pago</Label>
                  <Select value={paymentFormData.payment_method} onValueChange={(value) => setPaymentFormData({...paymentFormData, payment_method: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="payment_reference">Referencia</Label>
                  <Input
                    id="payment_reference"
                    value={paymentFormData.reference_number}
                    onChange={(e) => setPaymentFormData({...paymentFormData, reference_number: e.target.value})}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowPaymentDialog(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Registrar Pago</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={showPayableDialog} onOpenChange={setShowPayableDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Cuenta por Pagar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nueva Cuenta por Pagar</DialogTitle>
                <DialogDescription>
                  Puedes cargar un XML de CFDI para extraer automáticamente los datos fiscales
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handlePayableSubmit} className="space-y-4">
                <XMLUploader 
                  onSuccess={(cfdiData) => {
                    // Auto-fill form with CFDI data
                    const supplier = suppliers.find(s => s.rfc === cfdiData.rfc_emisor);
                    if (supplier) {
                      setPayableFormData({
                        ...payableFormData,
                        supplier_id: supplier.id,
                        invoice_number: cfdiData.folio || cfdiData.uuid_fiscal,
                        amount_due: cfdiData.total,
                        invoice_date: cfdiData.fecha_emision.split('T')[0]
                      });
                    }
                  }}
                  className="mb-4"
                />

                <div>
                  <Label htmlFor="supplier_id">Proveedor</Label>
                  <Select value={payableFormData.supplier_id} onValueChange={(value) => setPayableFormData({...payableFormData, supplier_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.company_name} {supplier.rfc && `(${supplier.rfc})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="invoice_number">Número de Factura</Label>
                    <Input
                      id="invoice_number"
                      value={payableFormData.invoice_number}
                      onChange={(e) => setPayableFormData({...payableFormData, invoice_number: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="amount_due">Monto a Pagar</Label>
                    <Input
                      id="amount_due"
                      type="number"
                      step="0.01"
                      value={payableFormData.amount_due}
                      onChange={(e) => setPayableFormData({...payableFormData, amount_due: parseFloat(e.target.value)})}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="invoice_date">Fecha de Factura</Label>
                    <Input
                      id="invoice_date"
                      type="date"
                      value={payableFormData.invoice_date}
                      onChange={(e) => setPayableFormData({...payableFormData, invoice_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="due_date">Fecha de Vencimiento</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={payableFormData.due_date}
                      onChange={(e) => setPayableFormData({...payableFormData, due_date: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="payable_notes">Notas</Label>
                  <Textarea
                    id="payable_notes"
                    value={payableFormData.notes}
                    onChange={(e) => setPayableFormData({...payableFormData, notes: e.target.value})}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowPayableDialog(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Crear Cuenta por Pagar</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={showSupplierDialog} onOpenChange={setShowSupplierDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Proveedor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingSupplier ? 'Editar' : 'Nuevo'} Proveedor</DialogTitle>
                <DialogDescription>
                  Información fiscal completa para cumplimiento CFDI mexicano
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSupplierSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company_name">Razón Social *</Label>
                    <Input
                      id="company_name"
                      value={supplierFormData.company_name}
                      onChange={(e) => setSupplierFormData({...supplierFormData, company_name: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact_name">Nombre de Contacto</Label>
                    <Input
                      id="contact_name"
                      value={supplierFormData.contact_name}
                      onChange={(e) => setSupplierFormData({...supplierFormData, contact_name: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="rfc">RFC *</Label>
                    <Input
                      id="rfc"
                      value={supplierFormData.rfc}
                      onChange={(e) => setSupplierFormData({...supplierFormData, rfc: e.target.value.toUpperCase()})}
                      placeholder="ABCD123456ABC"
                      maxLength={13}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="regimen_fiscal">Régimen Fiscal</Label>
                    <Input
                      id="regimen_fiscal"
                      value={supplierFormData.regimen_fiscal}
                      onChange={(e) => setSupplierFormData({...supplierFormData, regimen_fiscal: e.target.value})}
                      placeholder="601 - General de Ley Personas Morales"
                    />
                  </div>
                  <div>
                    <Label htmlFor="uso_cfdi_default">Uso CFDI por Defecto</Label>
                    <Select value={supplierFormData.uso_cfdi_default} onValueChange={(value) => setSupplierFormData({...supplierFormData, uso_cfdi_default: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="G01">G01 - Adquisición de mercancías</SelectItem>
                        <SelectItem value="G02">G02 - Devoluciones, descuentos o bonificaciones</SelectItem>
                        <SelectItem value="G03">G03 - Gastos en general</SelectItem>
                        <SelectItem value="P01">P01 - Por definir</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={supplierFormData.email}
                      onChange={(e) => setSupplierFormData({...supplierFormData, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={supplierFormData.phone}
                      onChange={(e) => setSupplierFormData({...supplierFormData, phone: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="dias_credito">Días de Crédito</Label>
                    <Input
                      id="dias_credito"
                      type="number"
                      value={supplierFormData.dias_credito}
                      onChange={(e) => setSupplierFormData({...supplierFormData, dias_credito: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="limite_credito">Límite de Crédito</Label>
                    <Input
                      id="limite_credito"
                      type="number"
                      step="0.01"
                      value={supplierFormData.limite_credito}
                      onChange={(e) => setSupplierFormData({...supplierFormData, limite_credito: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="supplier_category">Categoría</Label>
                    <Select value={supplierFormData.supplier_category} onValueChange={(value) => setSupplierFormData({...supplierFormData, supplier_category: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(categoryLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Dirección Completa</Label>
                  <Textarea
                    id="address"
                    value={supplierFormData.address}
                    onChange={(e) => setSupplierFormData({...supplierFormData, address: e.target.value})}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">Ciudad</Label>
                    <Input
                      id="city"
                      value={supplierFormData.city}
                      onChange={(e) => setSupplierFormData({...supplierFormData, city: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      value={supplierFormData.state}
                      onChange={(e) => setSupplierFormData({...supplierFormData, state: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="codigo_postal">Código Postal</Label>
                    <Input
                      id="codigo_postal"
                      value={supplierFormData.codigo_postal}
                      onChange={(e) => setSupplierFormData({...supplierFormData, codigo_postal: e.target.value})}
                      maxLength={5}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    value={supplierFormData.notes}
                    onChange={(e) => setSupplierFormData({...supplierFormData, notes: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowSupplierDialog(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingSupplier ? 'Actualizar' : 'Crear'} Proveedor
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Proveedores</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers.length}</div>
            <p className="text-xs text-muted-foreground">
              {suppliers.filter(s => s.status === 'active').length} activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cuentas por Pagar</CardTitle>
            <CreditCard className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalPayable)}</div>
            <p className="text-xs text-muted-foreground">
              {accountsPayable.length} facturas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturas Vencidas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overduPayables.length}</div>
            <p className="text-xs text-muted-foreground">
              Requieren atención inmediata
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CFDI PPD Pendientes</CardTitle>
            <Receipt className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCFDI.length}</div>
            <p className="text-xs text-muted-foreground">
              Complementos de pago pendientes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar proveedores..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(statusLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="suppliers" className="space-y-6">
        <TabsList>
          <TabsTrigger value="suppliers">Proveedores</TabsTrigger>
          <TabsTrigger value="payables">Cuentas por Pagar</TabsTrigger>
          <TabsTrigger value="cfdi">Documentos CFDI</TabsTrigger>
          <TabsTrigger value="payments">Pagos</TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers">
          <Card>
            <CardHeader>
              <CardTitle>Lista de Proveedores</CardTitle>
              <CardDescription>
                Gestión completa de proveedores con información fiscal mexicana
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredSuppliers.map((supplier) => (
                  <Card key={supplier.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center space-x-4">
                            <h3 className="text-lg font-semibold">{supplier.company_name}</h3>
                            <Badge className={getStatusColor(supplier.status)}>
                              {statusLabels[supplier.status as keyof typeof statusLabels]}
                            </Badge>
                            <Badge variant="outline">
                              {categoryLabels[supplier.supplier_category as keyof typeof categoryLabels]}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-muted-foreground">RFC:</span>
                              <EditableField
                                value={supplier.rfc || ''}
                                onSave={(value) => updateSupplierField(supplier.id, 'rfc', value)}
                                className="font-mono"
                              />
                            </div>
                            <div>
                              <span className="font-medium text-muted-foreground">Contacto:</span>
                              <EditableField
                                value={supplier.contact_name || ''}
                                onSave={(value) => updateSupplierField(supplier.id, 'contact_name', value)}
                              />
                            </div>
                            <div>
                              <span className="font-medium text-muted-foreground">Email:</span>
                              <EditableField
                                value={supplier.email || ''}
                                onSave={(value) => updateSupplierField(supplier.id, 'email', value)}
                                type="email"
                              />
                            </div>
                            <div>
                              <span className="font-medium text-muted-foreground">Teléfono:</span>
                              <EditableField
                                value={supplier.phone || ''}
                                onSave={(value) => updateSupplierField(supplier.id, 'phone', value)}
                                type="phone"
                              />
                            </div>
                            <div>
                              <span className="font-medium text-muted-foreground">Días Crédito:</span>
                              <EditableField
                                value={supplier.dias_credito || 30}
                                onSave={(value) => updateSupplierField(supplier.id, 'dias_credito', value)}
                                type="number"
                                displayTransform={(value) => `${value} días`}
                              />
                            </div>
                            <div>
                              <span className="font-medium text-muted-foreground">Límite Crédito:</span>
                              <EditableField
                                value={supplier.limite_credito || 0}
                                onSave={(value) => updateSupplierField(supplier.id, 'limite_credito', value)}
                                type="number"
                                displayTransform={(value) => formatCurrency(Number(value))}
                              />
                            </div>
                            <div>
                              <span className="font-medium text-muted-foreground">Saldo Actual:</span>
                              <span className={`font-medium ${(supplier.saldo_actual || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(supplier.saldo_actual || 0)}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-muted-foreground">Uso CFDI:</span>
                              <EditableField
                                value={supplier.uso_cfdi_default || 'G03'}
                                onSave={(value) => updateSupplierField(supplier.id, 'uso_cfdi_default', value)}
                                type="select"
                                options={[
                                  { value: 'G01', label: 'G01 - Adquisición de mercancías' },
                                  { value: 'G02', label: 'G02 - Devoluciones, descuentos' },
                                  { value: 'G03', label: 'G03 - Gastos en general' },
                                  { value: 'P01', label: 'P01 - Por definir' }
                                ]}
                              />
                            </div>
                          </div>

                          {supplier.address && (
                            <div className="text-sm">
                              <span className="font-medium text-muted-foreground">Dirección:</span>
                              <p className="text-muted-foreground">{supplier.address}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingSupplier(supplier);
                              setSupplierFormData({
                                company_name: supplier.company_name,
                                contact_name: supplier.contact_name || "",
                                email: supplier.email || "",
                                phone: supplier.phone || "",
                                address: supplier.address || "",
                                city: supplier.city || "",
                                state: supplier.state || "",
                                postal_code: supplier.postal_code || "",
                                rfc: supplier.rfc || "",
                                regimen_fiscal: supplier.regimen_fiscal || "",
                                codigo_postal: supplier.codigo_postal || "",
                                uso_cfdi_default: supplier.uso_cfdi_default || "G03",
                                dias_credito: supplier.dias_credito || 30,
                                limite_credito: supplier.limite_credito || 0,
                                supplier_category: supplier.supplier_category as "materials" | "equipment" | "services" | "subcontractor" | "utilities" | "other",
                                rating: supplier.rating || 0,
                                notes: supplier.notes || "",
                                website: supplier.website || ""
                              });
                              setShowSupplierDialog(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedSupplier(supplier)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payables">
          <Card>
            <CardHeader>
              <CardTitle>Cuentas por Pagar</CardTitle>
              <CardDescription>
                Gestión de facturas y obligaciones con proveedores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Factura</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accountsPayable.map((payable) => (
                    <TableRow key={payable.id}>
                      <TableCell className="font-medium">
                        {payable.supplier?.company_name}
                        {payable.supplier?.rfc && (
                          <div className="text-xs text-muted-foreground font-mono">
                            {payable.supplier.rfc}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {payable.invoice_number || 'Sin número'}
                        {payable.invoice_date && (
                          <div className="text-xs text-muted-foreground">
                            {formatDate(payable.invoice_date)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{formatCurrency(payable.amount_due)}</div>
                        {payable.amount_paid && payable.amount_paid > 0 && (
                          <div className="text-xs text-green-600">
                            Pagado: {formatCurrency(payable.amount_paid)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className={`text-sm ${new Date(payable.due_date) < new Date() ? 'text-red-600 font-medium' : ''}`}>
                          {formatDate(payable.due_date)}
                        </div>
                        {new Date(payable.due_date) < new Date() && payable.payment_status !== 'paid' && (
                          <Badge variant="destructive" className="text-xs">
                            Vencida
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getPaymentStatusColor(payable.payment_status)}>
                          {paymentStatusLabels[payable.payment_status as keyof typeof paymentStatusLabels]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Receipt className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cfdi">
          <Card>
            <CardHeader>
              <CardTitle>Documentos CFDI</CardTitle>
              <CardDescription>
                Facturas electrónicas y control de complementos de pago
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>UUID</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Forma Pago</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cfdiDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-mono text-xs">
                        {doc.uuid_fiscal.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        {doc.supplier?.company_name}
                        <div className="text-xs text-muted-foreground font-mono">
                          {doc.rfc_emisor}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(doc.fecha_emision)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(doc.total)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={doc.forma_pago === 'PUE' ? 'default' : 'secondary'}>
                          {doc.forma_pago}
                        </Badge>
                        {doc.forma_pago === 'PPD' && doc.requires_complement && (
                          <div className="text-xs text-yellow-600 mt-1">
                            {doc.complement_received ? (
                              <div className="flex items-center">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Complemento recibido
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Pendiente complemento
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={doc.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {doc.status === 'active' ? 'Vigente' : 'Cancelado'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Pagos</CardTitle>
              <CardDescription>
                Registro de pagos realizados a proveedores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Referencia</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {payment.supplier?.company_name}
                      </TableCell>
                      <TableCell className="font-medium text-red-600">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        {formatDate(payment.payment_date)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {payment.payment_method === 'transferencia' ? 'Transferencia' :
                           payment.payment_method === 'cheque' ? 'Cheque' : 'Efectivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {payment.reference_number || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge className={payment.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                          {payment.status === 'completed' ? 'Completado' : 'Pendiente'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}