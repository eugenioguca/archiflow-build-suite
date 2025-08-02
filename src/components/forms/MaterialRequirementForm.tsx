import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MaterialRequirementFormProps {
  projectId: string;
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MaterialRequirementForm({ projectId, initialData, onSuccess, onCancel }: MaterialRequirementFormProps) {
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    material_code: initialData?.material_code || "",
    material_name: initialData?.material_name || "",
    description: initialData?.description || "",
    category: initialData?.category || "",
    subcategory: initialData?.subcategory || "",
    unit_of_measure: initialData?.unit_of_measure || "",
    quantity_required: initialData?.quantity_required || 0,
    unit_cost: initialData?.unit_cost || 0,
    supplier_id: initialData?.supplier_id || "",
    expected_delivery_date: initialData?.expected_delivery_date ? new Date(initialData.expected_delivery_date) : null,
    priority_level: initialData?.priority_level || "medium",
    status: initialData?.status || "required",
    procurement_notes: initialData?.procurement_notes || "",
    storage_requirements: initialData?.storage_requirements || "",
    min_stock_level: initialData?.min_stock_level || 0,
    reorder_point: initialData?.reorder_point || 0,
  });

  const categories = [
    "Cemento y Concreto",
    "Agregados",
    "Acero de Refuerzo",
    "Block y Ladrillo",
    "Materiales Eléctricos",
    "Materiales Hidráulicos",
    "Impermeabilizantes",
    "Acabados",
    "Herrería",
    "Carpintería",
    "Vidrio y Cancelería",
    "Pintura",
    "Herramientas",
    "Equipo de Seguridad",
    "Otros"
  ];

  const units = [
    "PZA", "M2", "M3", "ML", "KG", "TON", "LT", "GL", "BULTO", "CAJA", "ROLLO", "JUEGO", "LOTE"
  ];

  const priorityLevels = [
    { value: "low", label: "Baja" },
    { value: "medium", label: "Media" },
    { value: "high", label: "Alta" },
    { value: "urgent", label: "Urgente" }
  ];

  const statusOptions = [
    { value: "required", label: "Requerido" },
    { value: "quoted", label: "Cotizado" },
    { value: "ordered", label: "Ordenado" },
    { value: "partial_delivery", label: "Entrega Parcial" },
    { value: "delivered", label: "Entregado" },
    { value: "cancelled", label: "Cancelado" }
  ];

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, company_name, contact_person")
        .eq("active", true)
        .order("company_name");

      if (error) {
        console.error("Error fetching suppliers:", error);
        return;
      }

      setSuppliers(data || []);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleInputChange = (name: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.material_name || !formData.category || !formData.unit_of_measure) {
      toast.error("Por favor complete los campos requeridos");
      return;
    }

    try {
      setLoading(true);

      // Get current user profile
      const { data: user } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.user?.id)
        .single();

      if (!profile) {
        toast.error("Error al obtener el perfil del usuario");
        return;
      }

      const materialData = {
        project_id: projectId,
        budget_item_id: null,
        phase_id: null,
        material_code: formData.material_code || `MAT-${Date.now()}`,
        material_name: formData.material_name,
        description: formData.description || null,
        category: formData.category,
        subcategory: formData.subcategory || null,
        unit_of_measure: formData.unit_of_measure,
        quantity_required: formData.quantity_required,
        quantity_ordered: 0,
        quantity_delivered: 0,
        quantity_used: 0,
        quantity_remaining: formData.quantity_required,
        quantity_wasted: 0,
        unit_cost: formData.unit_cost,
        total_cost: formData.quantity_required * formData.unit_cost,
        supplier_id: formData.supplier_id || null,
        supplier_quote_url: null,
        expected_delivery_date: formData.expected_delivery_date?.toISOString().split('T')[0] || null,
        actual_delivery_date: null,
        quality_specifications: {},
        safety_requirements: {},
        storage_requirements: formData.storage_requirements || null,
        priority_level: formData.priority_level,
        status: formData.status,
        procurement_notes: formData.procurement_notes || null,
        quality_approved: false,
        quality_approved_by: null,
        quality_approved_at: null,
        waste_reason: null,
        cost_variance_percentage: 0,
        lead_time_days: null,
        min_stock_level: formData.min_stock_level,
        max_stock_level: 0,
        reorder_point: formData.reorder_point,
        created_by: profile.id,
      };

      if (initialData) {
        // Update existing material requirement
        const { error } = await supabase
          .from("material_requirements")
          .update(materialData as any)
          .eq("id", initialData.id);

        if (error) {
          console.error("Error updating material requirement:", error);
          toast.error("Error al actualizar el requerimiento");
          return;
        }

        toast.success("Requerimiento actualizado exitosamente");
      } else {
        // Create new material requirement
        const { error } = await supabase
          .from("material_requirements")
          .insert(materialData as any);

        if (error) {
          console.error("Error creating material requirement:", error);
          toast.error("Error al crear el requerimiento");
          return;
        }

        toast.success("Requerimiento creado exitosamente");
      }

      onSuccess();
    } catch (error) {
      console.error("Error:", error);
      toast.error(initialData ? "Error al actualizar el requerimiento" : "Error al crear el requerimiento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Código de Material</label>
            <Input
              placeholder="Ej: MAT-001 (opcional)"
              value={formData.material_code}
              onChange={(e) => handleInputChange('material_code', e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Nombre del Material *</label>
            <Input
              placeholder="Ej: Cemento Portland CPC 40"
              value={formData.material_name}
              onChange={(e) => handleInputChange('material_name', e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Descripción</label>
            <Textarea
              placeholder="Descripción detallada del material, especificaciones técnicas..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Categoría *</label>
            <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Subcategoría</label>
            <Input
              placeholder="Ej: Tipo I, Grado A, etc."
              value={formData.subcategory}
              onChange={(e) => handleInputChange('subcategory', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Unidad *</label>
              <Select value={formData.unit_of_measure} onValueChange={(value) => handleInputChange('unit_of_measure', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Unidad" />
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
              <label className="text-sm font-medium">Cantidad Requerida *</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0"
                value={formData.quantity_required}
                onChange={(e) => handleInputChange('quantity_required', parseFloat(e.target.value) || 0)}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Costo Unitario</label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.unit_cost}
              onChange={(e) => handleInputChange('unit_cost', parseFloat(e.target.value) || 0)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Proveedor</label>
            <Select value={formData.supplier_id} onValueChange={(value) => handleInputChange('supplier_id', value)}>
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

          <div>
            <label className="text-sm font-medium">Fecha de Entrega Esperada</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full pl-3 text-left font-normal",
                    !formData.expected_delivery_date && "text-muted-foreground"
                  )}
                >
                  {formData.expected_delivery_date ? (
                    format(formData.expected_delivery_date, "PPP", { locale: es })
                  ) : (
                    <span>Seleccionar fecha</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.expected_delivery_date}
                  onSelect={(date) => handleInputChange('expected_delivery_date', date)}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Prioridad</label>
              <Select value={formData.priority_level} onValueChange={(value) => handleInputChange('priority_level', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Prioridad" />
                </SelectTrigger>
                <SelectContent>
                  {priorityLevels.map(level => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Estado</label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="text-sm font-medium">Notas de Procuración</label>
          <Textarea
            placeholder="Notas sobre el proceso de procuración..."
            value={formData.procurement_notes}
            onChange={(e) => handleInputChange('procurement_notes', e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Requisitos de Almacenamiento</label>
          <Textarea
            placeholder="Condiciones especiales de almacenamiento..."
            value={formData.storage_requirements}
            onChange={(e) => handleInputChange('storage_requirements', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="text-sm font-medium">Nivel Mínimo de Stock</label>
          <Input
            type="number"
            step="0.01"
            placeholder="0"
            value={formData.min_stock_level}
            onChange={(e) => handleInputChange('min_stock_level', parseFloat(e.target.value) || 0)}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Punto de Reorden</label>
          <Input
            type="number"
            step="0.01"
            placeholder="0"
            value={formData.reorder_point}
            onChange={(e) => handleInputChange('reorder_point', parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading 
            ? (initialData ? "Actualizando..." : "Creando...") 
            : (initialData ? "Actualizar Material" : "Crear Material")
          }
        </Button>
      </div>
    </form>
  );
}