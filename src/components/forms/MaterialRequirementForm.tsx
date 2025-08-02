import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const materialSchema = z.object({
  material_code: z.string().optional(),
  material_name: z.string().min(1, "El nombre del material es requerido"),
  description: z.string().optional(),
  category: z.string().min(1, "La categoría es requerida"),
  subcategory: z.string().optional(),
  unit_of_measure: z.string().min(1, "La unidad de medida es requerida"),
  quantity_required: z.number().min(0.01, "La cantidad debe ser mayor a 0"),
  unit_cost: z.number().min(0, "El costo unitario debe ser mayor o igual a 0"),
  supplier_id: z.string().optional(),
  expected_delivery_date: z.date().optional(),
  priority_level: z.string().default("medium"),
  status: z.string().default("required"),
  procurement_notes: z.string().optional(),
  storage_requirements: z.string().optional(),
  min_stock_level: z.number().min(0, "El nivel mínimo debe ser mayor o igual a 0").default(0),
  reorder_point: z.number().min(0, "El punto de reorden debe ser mayor o igual a 0").default(0),
});

type MaterialFormData = z.infer<typeof materialSchema>;

interface MaterialRequirementFormProps {
  projectId: string;
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MaterialRequirementForm({ projectId, initialData, onSuccess, onCancel }: MaterialRequirementFormProps) {
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);

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

  const form = useForm<MaterialFormData>({
    resolver: zodResolver(materialSchema),
    defaultValues: initialData ? {
      ...initialData,
      expected_delivery_date: initialData.expected_delivery_date ? new Date(initialData.expected_delivery_date) : undefined,
    } : {
      material_code: "",
      material_name: "",
      description: "",
      category: "",
      subcategory: "",
      unit_of_measure: "",
      quantity_required: 0,
      unit_cost: 0,
      supplier_id: "",
      priority_level: "medium",
      status: "required",
      procurement_notes: "",
      storage_requirements: "",
      min_stock_level: 0,
      reorder_point: 0,
    },
  });

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

  const onSubmit = async (data: MaterialFormData) => {
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
        material_code: data.material_code || `MAT-${Date.now()}`,
        material_name: data.material_name,
        material_type: data.category, // Using category as material_type
        brand: "",
        model: "",
        specifications: {},
        unit_of_measure: data.unit_of_measure,
        quantity_required: data.quantity_required,
        quantity_remaining: initialData?.quantity_remaining || data.quantity_required,
        unit_cost: data.unit_cost,
        total_cost: data.quantity_required * data.unit_cost,
        supplier_id: data.supplier_id || null,
        delivery_date_required: data.expected_delivery_date?.toISOString().split('T')[0] || null,
        storage_requirements: {},
        quality_standards: {},
        environmental_impact: {},
        certifications: [],
        status: data.status,
        priority: data.priority_level,
        notes: data.procurement_notes || null,
        created_by: profile.id,
      };

      if (initialData) {
        // Update existing material requirement
        const { error } = await supabase
          .from("material_requirements")
          .update(materialData)
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
          .insert(materialData);

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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="material_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código de Material</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: MAT-001 (opcional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="material_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Material *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Cemento Portland CPC 40" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descripción detallada del material, especificaciones técnicas..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subcategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subcategoría</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Tipo I, Grado A, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="unit_of_measure"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidad *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Unidad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {units.map(unit => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity_required"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantidad Requerida *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="unit_cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Costo Unitario</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="supplier_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proveedor</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar proveedor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {suppliers.map(supplier => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expected_delivery_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de Entrega Esperada</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: es })
                          ) : (
                            <span>Seleccionar fecha</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridad</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Prioridad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {priorityLevels.map(level => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map(status => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="procurement_notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notas de Procuración</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Notas especiales para la compra, especificaciones técnicas, etc." 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="storage_requirements"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Requerimientos de Almacenamiento</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Condiciones especiales de almacenamiento, temperatura, humedad, etc." 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="min_stock_level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nivel Mínimo de Stock</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    placeholder="0"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reorder_point"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Punto de Reorden</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    placeholder="0"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
    </Form>
  );
}