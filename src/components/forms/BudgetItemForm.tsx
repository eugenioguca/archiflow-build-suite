import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SmartScrollArea } from "@/components/ui/smart-scroll-area";
import { FieldGroup } from "@/components/ui/field-group";
import { ResponsiveGrid } from "@/components/ui/responsive-grid";

const budgetItemSchema = z.object({
  item_code: z.string().optional(),
  item_name: z.string().min(1, "El nombre de la partida es requerido"),
  item_description: z.string().optional(),
  category: z.string().min(1, "La categoría es requerida"),
  subcategory: z.string().optional(),
  specialty: z.string().min(1, "La especialidad es requerida"),
  unit_of_measure: z.string().min(1, "La unidad de medida es requerida"),
  quantity: z.number().min(0, "La cantidad debe ser mayor a 0"),
  unit_price: z.number().min(0, "El precio unitario debe ser mayor a 0"),
  material_cost: z.number().min(0).optional(),
  labor_cost: z.number().min(0).optional(),
  equipment_cost: z.number().min(0).optional(),
  overhead_percentage: z.number().min(0).max(100, "Porcentaje debe estar entre 0 y 100"),
  profit_percentage: z.number().min(0).max(100, "Porcentaje debe estar entre 0 y 100"),
});

type BudgetItemFormData = z.infer<typeof budgetItemSchema>;

interface BudgetItemFormProps {
  projectId: string;
  budgetVersion: number;
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function BudgetItemForm({ projectId, budgetVersion, initialData, onSuccess, onCancel }: BudgetItemFormProps) {
  const [loading, setLoading] = useState(false);

  const categories = [
    "Preliminares",
    "Cimentación", 
    "Estructura",
    "Albañilería",
    "Instalaciones Hidráulicas",
    "Instalaciones Eléctricas",
    "Instalaciones Sanitarias",
    "Acabados",
    "Herrería",
    "Carpintería",
    "Pintura",
    "Limpieza"
  ];

  const specialties = [
    "Obra Civil",
    "Instalaciones",
    "Acabados",
    "Estructural",
    "MEP",
    "Paisajismo"
  ];

  const units = [
    "PZA", "M2", "M3", "ML", "KG", "TON", "LT", "GL", "JGO", "LOT"
  ];

  const form = useForm<BudgetItemFormData>({
    resolver: zodResolver(budgetItemSchema),
    defaultValues: initialData || {
      item_code: "",
      item_name: "",
      item_description: "",
      category: "Preliminares",
      subcategory: "",
      specialty: "Obra Civil",
      unit_of_measure: "PZA",
      quantity: 1,
      unit_price: 0,
      material_cost: 0,
      labor_cost: 0,
      equipment_cost: 0,
      overhead_percentage: 15,
      profit_percentage: 10,
    },
  });

  const calculateTotalPrice = (data: BudgetItemFormData) => {
    const basePrice = data.unit_price || (data.material_cost! + data.labor_cost! + data.equipment_cost!);
    const withOverhead = basePrice * (1 + data.overhead_percentage / 100);
    const withProfit = withOverhead * (1 + data.profit_percentage / 100);
    return withProfit * data.quantity;
  };

  const onSubmit = async (data: BudgetItemFormData) => {
    try {
      setLoading(true);

      // Get current user profile ID
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      const totalPrice = calculateTotalPrice(data);

      const budgetItemData = {
        project_id: projectId,
        budget_version: budgetVersion,
        item_code: data.item_code || (initialData?.item_code || `AUTO-${Date.now()}`),
        item_name: data.item_name,
        item_description: data.item_description || '',
        category: data.category,
        subcategory: data.subcategory || '',
        specialty: data.specialty,
        unit_of_measure: data.unit_of_measure,
        quantity: data.quantity,
        unit_price: data.unit_price,
        material_cost: data.material_cost || 0,
        labor_cost: data.labor_cost || 0,
        equipment_cost: data.equipment_cost || 0,
        overhead_percentage: data.overhead_percentage,
        profit_percentage: data.profit_percentage,
        total_price: totalPrice,
        executed_quantity: initialData?.executed_quantity || 0,
        remaining_quantity: data.quantity - (initialData?.executed_quantity || 0),
        executed_amount: initialData?.executed_amount || 0,
        status: initialData?.status || 'pending',
        created_by: profile?.id || '',
      };

      if (initialData) {
        // Update existing item
        const { error } = await supabase
          .from("construction_budget_items")
          .update(budgetItemData)
          .eq("id", initialData.id);

        if (error) {
          console.error("Error updating budget item:", error);
          toast.error("Error al actualizar la partida");
          return;
        }

        toast.success("Partida actualizada exitosamente");
      } else {
        // Create new item - get next order
        const { data: lastItem } = await supabase
          .from("construction_budget_items")
          .select("item_order")
          .eq("project_id", projectId)
          .eq("budget_version", budgetVersion)
          .order("item_order", { ascending: false })
          .limit(1)
          .single();

        const nextOrder = (lastItem?.item_order || 0) + 1;

        const newBudgetItem = {
          ...budgetItemData,
          item_order: nextOrder,
          parent_item_id: null,
          level_depth: 0,
        };

        const { error } = await supabase
          .from("construction_budget_items")
          .insert(newBudgetItem);

        if (error) {
          console.error("Error creating budget item:", error);
          toast.error("Error al crear la partida");
          return;
        }

        toast.success("Partida creada exitosamente");
      }

      onSuccess();
    } catch (error) {
      console.error("Error:", error);
      toast.error(initialData ? "Error al actualizar la partida" : "Error al crear la partida");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FieldGroup 
            title="Información Básica" 
            description="Código y categorización de la partida"
          >
            <ResponsiveGrid cols={{ default: 1, md: 2 }}>
          <FormField
            control={form.control}
            name="item_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código (Opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="AUTO-001" {...field} />
                </FormControl>
                <FormDescription>
                  Si no se especifica, se generará automáticamente
                </FormDescription>
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
                <Select onValueChange={field.onChange} value={field.value}>
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
            </ResponsiveGrid>
          </FieldGroup>

          <FieldGroup 
            title="Concepto y Descripción" 
            description="Nombre y detalles de la partida"
          >
            <FormField
          control={form.control}
          name="item_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Concepto *</FormLabel>
              <FormControl>
                <Input placeholder="Nombre de la partida" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="item_description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Descripción detallada de la partida"
                  className="min-h-[80px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
            />
          </FieldGroup>

          <FieldGroup 
            title="Especificaciones Técnicas" 
            description="Especialidad, unidad y cantidad"
          >
            <ResponsiveGrid cols={{ default: 1, md: 3 }}>
          <FormField
            control={form.control}
            name="specialty"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Especialidad *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar especialidad" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {specialties.map(specialty => (
                      <SelectItem key={specialty} value={specialty}>
                        {specialty}
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
            name="unit_of_measure"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unidad *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar unidad" />
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
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cantidad *</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    min="0"
                    {...field} 
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
            </ResponsiveGrid>
          </FieldGroup>

          <FieldGroup 
            title="Precios y Totales" 
            description="Precio unitario y cálculo total"
          >
            <ResponsiveGrid cols={{ default: 1, md: 2 }}>
          <FormField
            control={form.control}
            name="unit_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Precio Unitario *</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...field} 
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <Label>Precio Total Calculado</Label>
            <div className="p-3 bg-muted rounded-md">
              <span className="text-lg font-semibold">
                ${calculateTotalPrice(form.getValues()).toLocaleString()}
              </span>
            </div>
          </div>
            </ResponsiveGrid>
          </FieldGroup>

          <FieldGroup 
            title="Desglose de Costos" 
            description="Detalle de materiales, mano de obra y equipo"
            defaultOpen={false}
          >
            <ResponsiveGrid cols={{ default: 1, md: 3 }}>
          <FormField
            control={form.control}
            name="material_cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Costo Material</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    min="0"
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
            name="labor_cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Costo Mano de Obra</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    min="0"
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
            name="equipment_cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Costo Equipo</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...field} 
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
            </ResponsiveGrid>
          </FieldGroup>

          <FieldGroup 
            title="Indirectos y Utilidad" 
            description="Porcentajes de indirectos y utilidad"
            defaultOpen={false}
          >
            <ResponsiveGrid cols={{ default: 1, md: 2 }}>
          <FormField
            control={form.control}
            name="overhead_percentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Indirectos (%)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    min="0"
                    max="100"
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
            name="profit_percentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Utilidad (%)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    min="0"
                    max="100"
                    {...field} 
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
            </ResponsiveGrid>
          </FieldGroup>

          <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
        <Button type="submit" disabled={loading}>
          {loading 
            ? (initialData ? "Actualizando..." : "Creando...") 
            : (initialData ? "Actualizar Partida" : "Crear Partida")
          }
        </Button>
          </div>
        </form>
      </Form>
  );
}