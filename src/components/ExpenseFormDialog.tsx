import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { XMLUploader } from "./XMLUploader"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Upload, Save, X } from "lucide-react"

interface ExpenseFormData {
  description: string
  amount: string
  category: string
  invoice_date: string
  supplier_id: string
  project_id: string
  client_id: string
  payment_method: string
  bank_account: string
  reference_number: string
  invoice_number: string
}

interface ExpenseFormDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  suppliers: Array<{ id: string; company_name: string; rfc?: string }>
  projects: Array<{ id: string; name: string }>
  clients: Array<{ id: string; full_name: string }>
}

const expenseCategories = [
  { value: 'construction', label: 'Construcción' },
  { value: 'administration', label: 'Administrativos' },
  { value: 'sales', label: 'Ventas' },
  { value: 'financial', label: 'Financieros' }
]

const paymentMethods = [
  { value: 'transfer', label: 'Transferencia' },
  { value: 'check', label: 'Cheque' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'other', label: 'Otro' }
]

export function ExpenseFormDialog({ 
  isOpen, 
  onClose, 
  onSuccess, 
  suppliers,
  projects,
  clients 
}: ExpenseFormDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [cfdiData, setCfdiData] = useState<any>(null)
  const [formData, setFormData] = useState<ExpenseFormData>({
    description: '',
    amount: '',
    category: '',
    invoice_date: '',
    supplier_id: '',
    project_id: '',
    client_id: '',
    payment_method: '',
    bank_account: '',
    reference_number: '',
    invoice_number: ''
  })

  const handleInputChange = (field: keyof ExpenseFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleXMLSuccess = (data: any) => {
    setCfdiData(data)
    // Auto-fill form with CFDI data
    setFormData(prev => ({
      ...prev,
      amount: data.total?.toString() || '',
      invoice_date: data.fecha_emision ? new Date(data.fecha_emision).toISOString().split('T')[0] : '',
      invoice_number: data.folio || '',
      description: data.conceptos?.[0]?.descripcion || ''
    }))

    toast({
      title: "XML procesado exitosamente",
      description: "Los datos del CFDI se han cargado automáticamente"
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Validate required fields
      if (!formData.description || !formData.amount || !formData.category) {
        throw new Error('Faltan campos requeridos')
      }

      const expenseData = {
        description: formData.description,
        amount: parseFloat(formData.amount),
        category: formData.category as 'construction' | 'administration' | 'sales' | 'financial',
        invoice_date: formData.invoice_date || null,
        supplier_id: formData.supplier_id || null,
        project_id: formData.project_id || null,
        client_id: formData.client_id || null,
        payment_method: formData.payment_method || null,
        bank_account: formData.bank_account || null,
        reference_number: formData.reference_number || null,
        invoice_number: formData.invoice_number || null,
        cfdi_document_id: cfdiData?.cfdi_document_id || null,
        uuid_fiscal: cfdiData?.uuid_fiscal || null,
        rfc_emisor: cfdiData?.rfc_emisor || null,
        forma_pago: cfdiData?.forma_pago || null,
        status_cfdi: cfdiData ? 'processed' : 'pending',
        requires_complement: cfdiData?.metodo_pago === 'PPD' || false,
        complement_received: false,
        tax_amount: cfdiData?.iva || 0,
        created_by: (await supabase.auth.getUser()).data.user?.id
      }

      const { error } = await supabase
        .from('expenses')
        .insert([expenseData])

      if (error) throw error

      toast({
        title: "Gasto creado exitosamente",
        description: cfdiData ? "Gasto vinculado con CFDI" : "Gasto registrado manualmente"
      })

      // Reset form
      setFormData({
        description: '',
        amount: '',
        category: '',
        invoice_date: '',
        supplier_id: '',
        project_id: '',
        client_id: '',
        payment_method: '',
        bank_account: '',
        reference_number: '',
        invoice_number: ''
      })
      setCfdiData(null)
      onSuccess?.()
      onClose()
    } catch (error: any) {
      toast({
        title: "Error al crear gasto",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Gasto</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Form */}
          <div className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="description">Descripción *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Descripción del gasto"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Monto *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Categoría *</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => handleInputChange('category', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoice_date">Fecha de Factura</Label>
                  <Input
                    id="invoice_date"
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) => handleInputChange('invoice_date', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="invoice_number">Número de Factura</Label>
                  <Input
                    id="invoice_number"
                    value={formData.invoice_number}
                    onChange={(e) => handleInputChange('invoice_number', e.target.value)}
                    placeholder="Ej: A-123"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="supplier_id">Proveedor</Label>
                <Select 
                  value={formData.supplier_id} 
                  onValueChange={(value) => handleInputChange('supplier_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers
                      .filter(supplier => supplier.id && supplier.id.trim() !== '')
                      .map(supplier => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.company_name} {supplier.rfc && `(${supplier.rfc})`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="project_id">Proyecto</Label>
                  <Select 
                    value={formData.project_id} 
                    onValueChange={(value) => handleInputChange('project_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona proyecto" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects
                        .filter(project => project.id && project.id.trim() !== '')
                        .map(project => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="client_id">Cliente</Label>
                  <Select 
                    value={formData.client_id} 
                    onValueChange={(value) => handleInputChange('client_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients
                        .filter(client => client.id && client.id.trim() !== '')
                        .map(client => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.full_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="payment_method">Método de Pago</Label>
                  <Select 
                    value={formData.payment_method} 
                    onValueChange={(value) => handleInputChange('payment_method', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona método" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map(method => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="reference_number">Referencia</Label>
                  <Input
                    id="reference_number"
                    value={formData.reference_number}
                    onChange={(e) => handleInputChange('reference_number', e.target.value)}
                    placeholder="Número de referencia"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bank_account">Cuenta Bancaria</Label>
                <Input
                  id="bank_account"
                  value={formData.bank_account}
                  onChange={(e) => handleInputChange('bank_account', e.target.value)}
                  placeholder="Número de cuenta"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Guardar Gasto
                </Button>
                <Button type="button" variant="outline" onClick={onClose}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </form>
          </div>

          {/* Right Column - XML Upload & CFDI Data */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Subir XML (CFDI)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <XMLUploader 
                  onSuccess={handleXMLSuccess}
                  className="border-dashed"
                />
              </CardContent>
            </Card>

            {cfdiData && (
              <Card>
                <CardHeader>
                  <CardTitle>Datos del CFDI</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {cfdiData.tipo_comprobante === 'I' ? 'Ingreso' : 
                       cfdiData.tipo_comprobante === 'E' ? 'Egreso' : 
                       cfdiData.tipo_comprobante}
                    </Badge>
                    {cfdiData.metodo_pago === 'PPD' && (
                      <Badge variant="secondary">PPD - Requiere Complemento</Badge>
                    )}
                    {cfdiData.metodo_pago === 'PUE' && (
                      <Badge variant="default">PUE - Pago Único</Badge>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">UUID:</span>
                      <span className="font-mono text-xs">{cfdiData.uuid_fiscal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">RFC Emisor:</span>
                      <span className="font-mono">{cfdiData.rfc_emisor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>{formatCurrency(cfdiData.subtotal || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IVA:</span>
                      <span>{formatCurrency(cfdiData.iva || 0)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span>{formatCurrency(cfdiData.total || 0)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
