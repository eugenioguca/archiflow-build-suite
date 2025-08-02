import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  material_type: z.string().min(1, "El tipo de material es requerido"),
  specifications: z.string().optional(),
  unit_of_measure: z.string().min(1, "La unidad de medida es requerida"),
  quantity_required: z.number().min(0.01, "La cantidad debe ser mayor a 0"),
  unit_cost: z.number().min(0, "El costo unitario debe ser mayor o igual a 0").optional(),
  supplier_id: z.string().optional(),
  delivery_date_required: z.date().optional(),
  procurement_status: z.string().default("needed"),
  status: z.string().default("active"),
  brand: z.string().optional(),
  notes: z.string().optional(),
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

  const statusOptions = [
    { value: "needed", label: "Necesario" },
    { value: "ordered", label: "Ordenado" },
    { value: "in_transit", label: "En tránsito" },
    { value: "received", label: "Recibido" },
    { value: "installed", label: "Instalado" }
  ];

  const form = useForm<MaterialFormData>({
    resolver: zodResolver(materialSchema),
    defaultValues: initialData ? {
      material_type: initialData.material_type || "",
      specifications: initialData.specifications?.toString() || "",
      unit_of_measure: initialData.unit_of_measure || "",
      quantity_required: initialData.quantity_required || 0,
      unit_cost: initialData.unit_cost || 0,
      supplier_id: initialData.supplier_id || "",
      delivery_date_required: initialData.delivery_date_required ? new Date(initialData.delivery_date_required) : undefined,
      procurement_status: initialData.procurement_status || "needed",
      status: initialData.status || "active",
      brand: initialData.brand || "",
      notes: initialData.notes || "",
    } : {
      material_type: "",
      specifications: "",
      unit_of_measure: "",
      quantity_required: 0,
      unit_cost: 0,
      supplier_id: "",
      procurement_status: "needed",
      status: "active",
      brand: "",
      notes: "",
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
        budget_item_id: null,
        material_name: data.material_type,
        category: data.material_type,
        expected_delivery_date: data.delivery_date_required?.toISOString().split('T')[0] || null,
        priority_level: data.procurement_status,
        specifications: data.specifications || null,
        unit_of_measure: data.unit_of_measure,
        quantity_required: data.quantity_required,
        quantity_ordered: 0,
        quantity_received: 0,
        quantity_allocated: 0,
        unit_cost: data.unit_cost || 0,
        delivery_date_required: data.delivery_date_required?.toISOString().split('T')[0] || null,
        delivery_date_actual: null,
        supplier_id: data.supplier_id || null,
        supplier_quote: null,
        procurement_status: data.procurement_status,
        status: data.status,
        quality_standards: {},
        safety_requirements: {},
        environmental_impact: {},
        certifications: {},
        warranty_terms: null,
        usage_instructions: null,
        brand: data.brand || null,
        notes: data.notes || null,
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
              name="material_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Material *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
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
              name="specifications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Especificaciones</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Especificaciones técnicas del material..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="brand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marca</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: CEMEX, Holcim, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
          </div>

          <div className="space-y-4">
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
              name="delivery_date_required"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de Entrega Requerida</FormLabel>
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
                name="procurement_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado de Procuración</FormLabel>
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

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado General</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="inactive">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Notas adicionales sobre el material..." 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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