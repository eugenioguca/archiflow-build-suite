import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Building, Phone, Mail, MapPin, Star, Eye, Edit, Trash2 } from "lucide-react";
import { EditableField } from "@/components/EditableField";
import { CFDIViewer } from "@/components/CFDIViewer";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Supplier {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  postal_code: string | null;
  tax_id: string | null;
  bank_account: string | null;
  bank_name: string | null;
  payment_terms: number;
  credit_limit: number;
  current_balance: number;
  supplier_category: 'materials' | 'equipment' | 'services' | 'subcontractor' | 'utilities' | 'other';
  status: 'active' | 'inactive' | 'blocked' | 'pending_approval';
  rating: number | null;
  notes: string | null;
  website: string | null;
  created_at: string;
}

interface AccountsPayable {
  id: string;
  supplier_id: string;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  payment_status: string;
  payment_date: string | null;
  payment_reference: string | null;
  notes: string | null;
  supplier: Supplier;
}

interface CFDIDocument {
  id: string;
  uuid_fiscal: string;
  rfc_emisor: string;
  rfc_receptor: string;
  fecha_emision: string;
  total: number;
  tipo_comprobante: string;
  status: string;
  file_path: string;
  supplier_id: string | null;
  created_at: string;
  supplier?: {
    company_name: string;
  };
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

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [accountsPayable, setAccountsPayable] = useState<AccountsPayable[]>([]);
  const [cfdiDocuments, setCfdiDocuments] = useState<CFDIDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [showPayableDialog, setShowPayableDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [selectedCFDI, setSelectedCFDI] = useState<any>(null);
  const [showCFDIViewer, setShowCFDIViewer] = useState(false);
  const [deletingCFDI, setDeletingCFDI] = useState<string | null>(null);
  const { toast } = useToast();

  type SupplierCategory = 'materials' | 'equipment' | 'services' | 'subcontractor' | 'utilities' | 'other';
  
  const [formData, setFormData] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    postal_code: "",
    tax_id: "",
    bank_account: "",
    bank_name: "",
    payment_terms: 30,
    credit_limit: 0,
    supplier_category: "materials" as SupplierCategory,
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchSuppliers(), fetchAccountsPayable(), fetchCFDIDocuments()]);
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
    // Use expenses as accounts payable since the table was deleted
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        id,
        description,
        amount,
        created_at,
        supplier:suppliers(*)
      `)
      .not('supplier_id', 'is', null)
      .order('created_at');

    if (error) throw error;
    
    // Transform expenses to match AccountsPayable interface
    const transformedData = (data || []).map(expense => ({
      id: expense.id,
      supplier_id: '',
      invoice_number: null,
      invoice_date: null,
      due_date: expense.created_at,
      amount_due: expense.amount,
      amount_paid: 0,
      payment_status: 'pending',
      payment_date: null,
      payment_reference: null,
      notes: null,
      supplier: expense.supplier
    }));
    
    setAccountsPayable(transformedData);
  };

  const fetchCFDIDocuments = async () => {
    const { data, error } = await supabase
      .from('cfdi_documents')
      .select(`
        *,
        supplier:suppliers(company_name)
      `)
      .order('fecha_emision', { ascending: false });

    if (error) throw error;
    setCfdiDocuments(data || []);
  };

  const handleViewCFDI = (cfdi: CFDIDocument) => {
    const cfdiData = {
      uuid: cfdi.uuid_fiscal,
      rfcEmisor: cfdi.rfc_emisor,
      rfcReceptor: cfdi.rfc_receptor,
      fechaEmision: cfdi.fecha_emision,
      total: cfdi.total,
      tipoComprobante: cfdi.tipo_comprobante,
      status: cfdi.status,
      filePath: cfdi.file_path
    };
    setSelectedCFDI(cfdiData);
    setShowCFDIViewer(true);
  };

  const handleDeleteCFDI = async (cfdiId: string) => {
    setDeletingCFDI(cfdiId);
  };

  const confirmDeleteCFDI = async () => {
    if (!deletingCFDI) return;

    try {
      const { error } = await supabase
        .from('cfdi_documents')
        .delete()
        .eq('id', deletingCFDI);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Documento CFDI eliminado correctamente",
      });

      setDeletingCFDI(null);
      fetchCFDIDocuments();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Error al eliminar el documento CFDI",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
        ...formData,
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
          .insert([supplierData]);

        if (error) throw error;

        toast({
          title: "Éxito",
          description: "Proveedor creado correctamente",
        });
      }

      setShowDialog(false);
      setEditingSupplier(null);
      resetForm();
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
      // Create expense instead of accounts_payable since the table was deleted
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.user.id)
        .single();

      if (!profile) throw new Error('Perfil no encontrado');

      const expenseData = {
        description: `Factura ${payableFormData.invoice_number || 'Sin número'}`,
        amount: payableFormData.amount_due,
        category: 'administration' as const,
        invoice_date: payableFormData.due_date,
        supplier_id: payableFormData.supplier_id,
        created_by: profile.id,
        invoice_number: payableFormData.invoice_number
      };

      const { error } = await supabase
        .from('expenses')
        .insert(expenseData);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Gasto creado correctamente",
      });

      setShowPayableDialog(false);
      resetPayableForm();
      fetchAccountsPayable();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Error al crear el gasto",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este proveedor?")) return;

    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Proveedor eliminado correctamente",
      });

      fetchSuppliers();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Error al eliminar el proveedor",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      company_name: supplier.company_name,
      contact_name: supplier.contact_name || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      city: supplier.city || "",
      state: supplier.state || "",
      postal_code: supplier.postal_code || "",
      tax_id: supplier.tax_id || "",
      bank_account: supplier.bank_account || "",
      bank_name: supplier.bank_name || "",
      payment_terms: supplier.payment_terms,
      credit_limit: supplier.credit_limit,
      supplier_category: supplier.supplier_category as 'materials' | 'equipment' | 'services' | 'subcontractor' | 'utilities' | 'other',
      rating: supplier.rating || 0,
      notes: supplier.notes || "",
      website: supplier.website || ""
    });
    setShowDialog(true);
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

  const resetForm = () => {
    setFormData({
      company_name: "",
      contact_name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      postal_code: "",
      tax_id: "",
      bank_account: "",
      bank_name: "",
      payment_terms: 30,
      credit_limit: 0,
      supplier_category: "materials" as const,
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

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (supplier.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    const matchesCategory = categoryFilter === "all" || supplier.supplier_category === categoryFilter;
    const matchesStatus = statusFilter === "all" || supplier.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

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
          <h1 className="text-3xl font-bold">Gestión de Proveedores</h1>
          <p className="text-muted-foreground">Administra proveedores y cuentas por pagar</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showPayableDialog} onOpenChange={setShowPayableDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Cuenta por Pagar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Nueva Cuenta por Pagar</DialogTitle>
              </DialogHeader>
              <form onSubmit={handlePayableSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="supplier_id">Proveedor</Label>
                  <Select value={payableFormData.supplier_id} onValueChange={(value) => setPayableFormData({...payableFormData, supplier_id: value})}>
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

          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Proveedor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company_name">Empresa *</Label>
                    <Input
                      id="company_name"
                      value={formData.company_name}
                      onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="contact_name">Contacto</Label>
                    <Input
                      id="contact_name"
                      value={formData.contact_name}
                      onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="supplier_category">Categoría</Label>
                    <Select value={formData.supplier_category} onValueChange={(value) => setFormData({...formData, supplier_category: value as SupplierCategory})}>
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

                  <div>
                    <Label htmlFor="payment_terms">Términos de Pago (días)</Label>
                    <Input
                      id="payment_terms"
                      type="number"
                      value={formData.payment_terms}
                      onChange={(e) => setFormData({...formData, payment_terms: parseInt(e.target.value)})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="credit_limit">Límite de Crédito</Label>
                    <Input
                      id="credit_limit"
                      type="number"
                      step="0.01"
                      value={formData.credit_limit}
                      onChange={(e) => setFormData({...formData, credit_limit: parseFloat(e.target.value)})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="tax_id">RFC</Label>
                    <Input
                      id="tax_id"
                      value={formData.tax_id}
                      onChange={(e) => setFormData({...formData, tax_id: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">Ciudad</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({...formData, state: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="postal_code">Código Postal</Label>
                    <Input
                      id="postal_code"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bank_name">Banco</Label>
                    <Input
                      id="bank_name"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="bank_account">Cuenta Bancaria</Label>
                    <Input
                      id="bank_account"
                      value={formData.bank_account}
                      onChange={(e) => setFormData({...formData, bank_account: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="website">Sitio Web</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => {
                    setShowDialog(false);
                    setEditingSupplier(null);
                    resetForm();
                  }}>
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

      <Tabs defaultValue="suppliers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="suppliers">Proveedores</TabsTrigger>
          <TabsTrigger value="payables">Cuentas por Pagar</TabsTrigger>
          <TabsTrigger value="cfdi">Documentos CFDI</TabsTrigger>
          <TabsTrigger value="reports">Reportes</TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers" className="space-y-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar proveedores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por categoría" />
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
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-6">
            {filteredSuppliers.map((supplier) => (
              <Card key={supplier.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <Building className="h-8 w-8 text-primary" />
                      <div>
                        <EditableField
                          value={supplier.company_name}
                          onSave={(value) => updateSupplierField(supplier.id, 'company_name', value)}
                          className="text-xl font-semibold"
                        />
                        <EditableField
                          value={supplier.contact_name || 'Sin contacto'}
                          onSave={(value) => updateSupplierField(supplier.id, 'contact_name', value)}
                          className="text-sm text-muted-foreground"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(supplier.status)}>
                        {statusLabels[supplier.status as keyof typeof statusLabels]}
                      </Badge>
                      <Badge variant="outline">
                        {categoryLabels[supplier.supplier_category as keyof typeof categoryLabels]}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(supplier)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(supplier.id)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <EditableField
                          value={supplier.email || 'Sin email'}
                          onSave={(value) => updateSupplierField(supplier.id, 'email', value)}
                          type="email"
                        />
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <EditableField
                          value={supplier.phone || 'Sin teléfono'}
                          onSave={(value) => updateSupplierField(supplier.id, 'phone', value)}
                          type="phone"
                        />
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{supplier.city || 'Sin ciudad'}, {supplier.state || 'Sin estado'}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="font-medium">Límite de Crédito:</span>
                        <EditableField
                          value={formatCurrency(supplier.credit_limit)}
                          onSave={(value) => updateSupplierField(supplier.id, 'credit_limit', parseFloat(typeof value === 'string' ? value.replace(/[^\d.-]/g, '') : value.toString()))}
                          type="number"
                        />
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Balance Actual:</span> {formatCurrency(supplier.current_balance)}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Términos de Pago:</span>
                        <EditableField
                          value={`${supplier.payment_terms} días`}
                          onSave={(value) => updateSupplierField(supplier.id, 'payment_terms', parseInt(typeof value === 'string' ? value.replace(/\D/g, '') : value.toString().replace(/\D/g, '')))}
                          type="number"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="font-medium">RFC:</span> {supplier.tax_id || 'Sin RFC'}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Banco:</span> {supplier.bank_name || 'Sin banco'}
                      </div>
                      {supplier.rating && (
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium">Rating:</span>
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${i < supplier.rating! ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {supplier.notes && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="text-sm">{supplier.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {filteredSuppliers.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No se encontraron proveedores</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || categoryFilter !== "all" || statusFilter !== "all"
                      ? "Ajusta los filtros de búsqueda"
                      : "Crea tu primer proveedor para comenzar"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="payables" className="space-y-4">
          <div className="grid gap-4">
            {accountsPayable.map((payable) => (
              <Card key={payable.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{payable.supplier.company_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Factura: {payable.invoice_number || 'Sin número'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{formatCurrency(payable.amount_due)}</div>
                      <Badge className={getPaymentStatusColor(payable.payment_status)}>
                        {paymentStatusLabels[payable.payment_status as keyof typeof paymentStatusLabels]}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-between text-sm">
                    <span>Vencimiento: {formatDate(payable.due_date)}</span>
                    <span>Pagado: {formatCurrency(payable.amount_paid)}</span>
                  </div>
                  {payable.notes && (
                    <div className="mt-2 p-2 bg-muted rounded text-sm">
                      {payable.notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {accountsPayable.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <h3 className="text-lg font-medium mb-2">No hay cuentas por pagar</h3>
                  <p className="text-muted-foreground">
                    Las cuentas por pagar aparecerán aquí cuando las agregues
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="cfdi" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documentos CFDI de Proveedores</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>UUID</TableHead>
                     <TableHead>Proveedor</TableHead>
                     <TableHead>Emisor</TableHead>
                     <TableHead>Receptor</TableHead>
                     <TableHead>Tipo</TableHead>
                     <TableHead>Fecha</TableHead>
                     <TableHead>Total</TableHead>
                     <TableHead>Estado</TableHead>
                     <TableHead>Acciones</TableHead>
                   </TableRow>
                 </TableHeader>
                <TableBody>
                   {cfdiDocuments.map((cfdi) => (
                     <TableRow key={cfdi.id}>
                       <TableCell className="font-mono text-sm">
                         {cfdi.uuid_fiscal.substring(0, 8)}...
                       </TableCell>
                       <TableCell>
                         {cfdi.supplier?.company_name || 'Sin asignar'}
                       </TableCell>
                       <TableCell>{cfdi.rfc_emisor}</TableCell>
                       <TableCell>{cfdi.rfc_receptor}</TableCell>
                       <TableCell>
                         <Badge variant="outline">
                           {cfdi.tipo_comprobante === 'I' ? 'Ingreso' : 
                            cfdi.tipo_comprobante === 'E' ? 'Egreso' : 
                            cfdi.tipo_comprobante === 'T' ? 'Traslado' : 
                            cfdi.tipo_comprobante === 'N' ? 'Nómina' : 
                            cfdi.tipo_comprobante === 'P' ? 'Pago' : cfdi.tipo_comprobante}
                         </Badge>
                       </TableCell>
                       <TableCell>{formatDate(cfdi.fecha_emision)}</TableCell>
                       <TableCell>{formatCurrency(cfdi.total)}</TableCell>
                       <TableCell>
                         <Badge variant={cfdi.status === 'active' ? 'default' : 'secondary'}>
                           {cfdi.status === 'active' ? 'Activo' : 'Inactivo'}
                         </Badge>
                       </TableCell>
                       <TableCell>
                         <div className="flex items-center gap-2">
                           <Button 
                             size="sm" 
                             variant="outline" 
                             onClick={() => handleViewCFDI(cfdi)}
                           >
                             <Eye className="h-4 w-4 mr-1" />
                             Ver Detalles
                           </Button>
                           <Button 
                             size="sm" 
                             variant="ghost" 
                             onClick={() => handleDeleteCFDI(cfdi.id)}
                           >
                             <Trash2 className="h-4 w-4 text-red-600" />
                           </Button>
                         </div>
                       </TableCell>
                     </TableRow>
                   ))}
                </TableBody>
              </Table>

              {cfdiDocuments.length === 0 && (
                <div className="p-12 text-center">
                  <h3 className="text-lg font-medium mb-2">No hay documentos CFDI</h3>
                  <p className="text-muted-foreground">
                    Los documentos CFDI de proveedores aparecerán aquí cuando los cargues
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Total Proveedores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{suppliers.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Proveedores Activos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {suppliers.filter(s => s.status === 'active').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cuentas por Pagar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(accountsPayable.reduce((total, ap) => total + ap.amount_due - ap.amount_paid, 0))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* CFDI Viewer Modal */}
      <CFDIViewer
        isOpen={showCFDIViewer}
        onClose={() => setShowCFDIViewer(false)}
        cfdiData={selectedCFDI}
      />

      {/* Delete CFDI Confirmation Dialog */}
      <AlertDialog open={!!deletingCFDI} onOpenChange={() => setDeletingCFDI(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Eliminación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar este documento CFDI? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCFDI} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}