import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SmartCombobox } from "@/components/SmartCombobox"
import { CurrencyInput } from "@/components/CurrencyInput"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { SmartScrollArea } from "@/components/ui/smart-scroll-area"
import { FieldGroup } from "@/components/ui/field-group"
import { ResponsiveGrid } from "@/components/ui/responsive-grid"

interface MaterialRequirementFormProps {
  projectId: string
  initialData?: any
  onSuccess: () => void
  onCancel: () => void
}

interface DropdownOption {
  value: string
  label: string
  id?: string
}

interface Supplier {
  id: string
  company_name: string
}

export function MaterialRequirementForm({ 
  projectId, 
  initialData, 
  onSuccess, 
  onCancel 
}: MaterialRequirementFormProps) {
  const [loading, setLoading] = useState(false)
  const [cuentasMayorOptions, setCuentasMayorOptions] = useState<DropdownOption[]>([])
  const [partidasOptions, setPartidasOptions] = useState<DropdownOption[]>([])
  const [descripcionesOptions, setDescripcionesOptions] = useState<DropdownOption[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    cuenta_mayor: initialData?.cuenta_mayor || "",
    partida: initialData?.partida || "",
    sub_partida: initialData?.sub_partida || "",
    descripcion_producto: initialData?.descripcion_producto || "",
    unit_of_measure: initialData?.unit_of_measure || "",
    quantity_required: initialData?.quantity_required || "",
    unit_cost: initialData?.unit_cost || "",
    adjustment_additive: initialData?.adjustment_additive || "",
    adjustment_deductive: initialData?.adjustment_deductive || "",
    supplier_id: initialData?.supplier_id || "",
    notas_procuracion: initialData?.notas_procuracion || "",
    requisito_almacenamiento: initialData?.requisito_almacenamiento || "",
  })

  // Load dropdown options and suppliers
  useEffect(() => {
    fetchDropdownOptions()
    fetchSuppliers()
  }, [])

  const fetchDropdownOptions = async () => {
    try {
      const { data: options, error } = await supabase
        .from('material_dropdown_options')
        .select('id, dropdown_type, option_value, option_label')
        .eq('is_active', true)
        .order('order_index')

      if (error) throw error

      const cuentasMayor = options
        ?.filter(opt => opt.dropdown_type === 'cuentas_mayor')
        ?.map(opt => ({ value: opt.option_value, label: opt.option_label, id: opt.id })) || []

      const partidas = options
        ?.filter(opt => opt.dropdown_type === 'partidas')
        ?.map(opt => ({ value: opt.option_value, label: opt.option_label, id: opt.id })) || []

      const descripciones = options
        ?.filter(opt => opt.dropdown_type === 'descripciones_producto')
        ?.map(opt => ({ value: opt.option_value, label: opt.option_label, id: opt.id })) || []

      setCuentasMayorOptions(cuentasMayor)
      setPartidasOptions(partidas)
      setDescripcionesOptions(descripciones)
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Error al cargar las opciones: " + error.message,
        variant: "destructive",
      })
    }
  }

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, company_name')
        .eq('status', 'active')
        .order('company_name')

      if (error) throw error
      setSuppliers(data || [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Error al cargar proveedores: " + error.message,
        variant: "destructive",
      })
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Get current user's profile
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error("No authenticated user")

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.user.id)
        .single()

      if (!profile) throw new Error("Profile not found")

      // Calculate final cost with adjustments
      const baseCost = parseFloat(formData.unit_cost) || 0
      const additiveAmount = parseFloat(formData.adjustment_additive) || 0
      const deductiveAmount = parseFloat(formData.adjustment_deductive) || 0
      const finalUnitCost = baseCost + additiveAmount - deductiveAmount

      // Prepare material data
      const materialData = {
        project_id: projectId,
        cuenta_mayor: formData.cuenta_mayor,
        partida: formData.partida || null,
        sub_partida: parseInt(formData.sub_partida) || null,
        descripcion_producto: formData.descripcion_producto,
        unit_of_measure: formData.unit_of_measure,
        quantity_required: parseFloat(formData.quantity_required) || 0,
        unit_cost: finalUnitCost,
        total_cost: finalUnitCost * (parseFloat(formData.quantity_required) || 0),
        adjustment_additive: additiveAmount,
        adjustment_deductive: deductiveAmount,
        supplier_id: formData.supplier_id || null,
        notas_procuracion: formData.notas_procuracion || null,
        requisito_almacenamiento: formData.requisito_almacenamiento || null,
        material_name: formData.descripcion_producto, // For compatibility
        material_type: formData.cuenta_mayor || 'general', // For compatibility
        status: 'cotizado', // Default status in Spanish
        priority: 'medium', // Default priority
        created_by: profile.id
      }

      if (initialData?.id) {
        // Update existing material
        const { error } = await supabase
          .from('material_requirements')
          .update(materialData)
          .eq('id', initialData.id)

        if (error) throw error

        toast({
          title: "Material actualizado",
          description: "Los datos del material han sido actualizados exitosamente.",
        })
      } else {
        // Create new material
        const { error } = await supabase
          .from('material_requirements')
          .insert(materialData)

        if (error) throw error

        toast({
          title: "Material creado",
          description: "El nuevo material ha sido creado exitosamente.",
        })
      }

      onSuccess()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al procesar la solicitud.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <SmartScrollArea className="w-full" maxHeight="calc(100vh - 200px)">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>
            {initialData ? "Editar Material" : "Nuevo Material"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <FieldGroup 
              title="Información Principal" 
              description="Datos básicos del material"
            >
              <ResponsiveGrid cols={{ default: 1, md: 2 }}>
            <SmartCombobox
              label="Cuentas de Mayor"
              value={formData.cuenta_mayor}
              onValueChange={(value) => handleInputChange("cuenta_mayor", value)}
              items={cuentasMayorOptions}
              placeholder="Seleccione cuenta de mayor"
              dropdownType="cuentas_mayor"
              onItemsChange={fetchDropdownOptions}
              allowEdit
              required
            />

            <SmartCombobox
              label="Partida"
              value={formData.partida}
              onValueChange={(value) => handleInputChange("partida", value)}
              items={partidasOptions}
              placeholder="Seleccione partida"
              dropdownType="partidas"
              onItemsChange={fetchDropdownOptions}
              allowEdit
            />

            <div className="space-y-2">
              <Label htmlFor="sub_partida">Sub Partida</Label>
              <Select 
                value={formData.sub_partida.toString()} 
                onValueChange={(value) => handleInputChange("sub_partida", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione sub partida" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 40 }, (_, i) => i + 1).map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <SmartCombobox
              label="Descripción del Producto"
              value={formData.descripcion_producto}
              onValueChange={(value) => handleInputChange("descripcion_producto", value)}
              items={descripcionesOptions}
              placeholder="Seleccione descripción"
              dropdownType="descripciones_producto"
              onItemsChange={fetchDropdownOptions}
              allowEdit
              required
                />

                <div className="space-y-2">
              <Label htmlFor="unit_of_measure">Unidad *</Label>
              <Select 
                value={formData.unit_of_measure} 
                onValueChange={(value) => handleInputChange("unit_of_measure", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione unidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PZA">Pieza (PZA)</SelectItem>
                  <SelectItem value="M2">Metro cuadrado (M2)</SelectItem>
                  <SelectItem value="M3">Metro cúbico (M3)</SelectItem>
                  <SelectItem value="ML">Metro lineal (ML)</SelectItem>
                  <SelectItem value="KG">Kilogramo (KG)</SelectItem>
                  <SelectItem value="TON">Tonelada (TON)</SelectItem>
                  <SelectItem value="LT">Litro (LT)</SelectItem>
                  <SelectItem value="GLN">Galón (GLN)</SelectItem>
                  <SelectItem value="M">Metro (M)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity_required">Cantidad Requerida *</Label>
              <Input
                id="quantity_required"
                type="number"
                step="0.01"
                min="0"
                value={formData.quantity_required}
                onChange={(e) => handleInputChange("quantity_required", e.target.value)}
                placeholder="0.00"
                required
              />
                </div>
              </ResponsiveGrid>
            </FieldGroup>

            <FieldGroup 
              title="Cantidades y Costos" 
              description="Información de cantidad, proveedor y precios"
            >
              <ResponsiveGrid cols={{ default: 1, md: 2 }}>
                <div className="space-y-2">
              <Label htmlFor="supplier_id">Proveedor</Label>
              <Select 
                value={formData.supplier_id} 
                onValueChange={(value) => handleInputChange("supplier_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione proveedor" />
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

            <div className="space-y-2">
              <Label htmlFor="unit_cost">Costo Unitario Base</Label>
              <CurrencyInput
                value={formData.unit_cost}
                onChange={(value) => handleInputChange("unit_cost", value)}
                placeholder="$0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjustment_additive">Ajuste Aditivo</Label>
              <CurrencyInput
                value={formData.adjustment_additive}
                onChange={(value) => handleInputChange("adjustment_additive", value)}
                placeholder="$0.00"
              />
                </div>

                <div className="space-y-2">
              <Label htmlFor="adjustment_deductive">Ajuste Deductivo</Label>
              <CurrencyInput
                value={formData.adjustment_deductive}
                onChange={(value) => handleInputChange("adjustment_deductive", value)}
                placeholder="$0.00"
              />
                </div>

                {/* Final Cost Display */}
                <div className="space-y-2">
              <Label>Costo Final</Label>
              <div className="p-3 bg-muted rounded-md">
                <p className="font-medium">
                  ${((parseFloat(formData.unit_cost) || 0) + 
                     (parseFloat(formData.adjustment_additive) || 0) - 
                     (parseFloat(formData.adjustment_deductive) || 0)).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Total: ${(((parseFloat(formData.unit_cost) || 0) + 
                              (parseFloat(formData.adjustment_additive) || 0) - 
                              (parseFloat(formData.adjustment_deductive) || 0)) * 
                            (parseFloat(formData.quantity_required) || 0)).toLocaleString()}
                </p>
              </div>
                </div>
              </ResponsiveGrid>
            </FieldGroup>

            <FieldGroup 
              title="Información Adicional" 
              description="Notas y requisitos especiales"
              defaultOpen={false}
            >
              <ResponsiveGrid cols={{ default: 1, md: 2 }}>
            <div className="space-y-2">
              <Label htmlFor="notas_procuracion">Notas de Procuración</Label>
              <Textarea
                id="notas_procuracion"
                value={formData.notas_procuracion}
                onChange={(e) => handleInputChange("notas_procuracion", e.target.value)}
                placeholder="Notas sobre procuración (opcional)"
                rows={3}
              />
                </div>

                <div className="space-y-2">
              <Label htmlFor="requisito_almacenamiento">Requisito de Almacenamiento</Label>
              <Textarea
                id="requisito_almacenamiento"
                value={formData.requisito_almacenamiento}
                onChange={(e) => handleInputChange("requisito_almacenamiento", e.target.value)}
                placeholder="Requisitos especiales de almacenamiento (opcional)"
                rows={3}
              />
                </div>
              </ResponsiveGrid>
            </FieldGroup>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? "Guardando..." : (initialData ? "Actualizar Material" : "Crear Material")}
            </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </SmartScrollArea>
  )
}