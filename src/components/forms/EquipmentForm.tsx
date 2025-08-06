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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SmartScrollArea } from "@/components/ui/smart-scroll-area";
import { FieldGroup } from "@/components/ui/field-group";
import { ResponsiveGrid } from "@/components/ui/responsive-grid";

const equipmentSchema = z.object({
  equipment_name: z.string().min(1, "El nombre del equipo es requerido"),
  equipment_code: z.string().optional(),
  equipment_type: z.string().min(1, "El tipo de equipo es requerido"),
  brand: z.string().optional(),
  model: z.string().optional(),
  serial_number: z.string().optional(),
  status: z.string().min(1, "El estado es requerido"),
  condition_rating: z.number().min(1).max(5, "La calificación debe estar entre 1 y 5"),
  location: z.string().optional(),
  hourly_rate: z.number().min(0, "La tarifa debe ser mayor a 0"),
  daily_rate: z.number().min(0, "La tarifa debe ser mayor a 0"),
  monthly_rate: z.number().min(0, "La tarifa debe ser mayor a 0"),
  acquisition_date: z.date().optional(),
  last_maintenance_date: z.date().optional(),
  next_maintenance_date: z.date().optional(),
  notes: z.string().optional(),
});

type EquipmentFormData = z.infer<typeof equipmentSchema>;

interface EquipmentFormProps {
  projectId: string;
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EquipmentForm({ projectId, initialData, onSuccess, onCancel }: EquipmentFormProps) {
  const [loading, setLoading] = useState(false);

  const equipmentTypes = [
    "Maquinaria Pesada",
    "Herramientas Eléctricas", 
    "Herramientas Manuales",
    "Vehículos",
    "Equipos de Seguridad",
    "Equipos de Medición",
    "Andamios",
    "Otros"
  ];

  const statusOptions = [
    { value: "available", label: "Disponible" },
    { value: "in_use", label: "En Uso" },
    { value: "maintenance", label: "Mantenimiento" },
    { value: "repair", label: "Reparación" },
    { value: "retired", label: "Retirado" }
  ];

  const form = useForm<EquipmentFormData>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: initialData ? {
      ...initialData,
      acquisition_date: initialData.acquisition_date ? new Date(initialData.acquisition_date) : undefined,
      last_maintenance_date: initialData.last_maintenance_date ? new Date(initialData.last_maintenance_date) : undefined,
      next_maintenance_date: initialData.next_maintenance_date ? new Date(initialData.next_maintenance_date) : undefined,
    } : {
      equipment_name: "",
      equipment_code: "",
      equipment_type: "Maquinaria Pesada",
      brand: "",
      model: "",
      serial_number: "",
      status: "available",
      condition_rating: 5,
      location: "",
      hourly_rate: 0,
      daily_rate: 0,
      monthly_rate: 0,
      notes: "",
    },
  });

  const onSubmit = async (data: EquipmentFormData) => {
    try {
      setLoading(true);

      // Get current user profile ID
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      const equipmentData = {
        project_id: projectId,
        equipment_name: data.equipment_name,
        equipment_code: data.equipment_code || `EQ-${Date.now()}`,
        equipment_type: data.equipment_type,
        brand: data.brand || '',
        model: data.model || '',
        serial_number: data.serial_number || '',
        status: data.status,
        condition_rating: data.condition_rating,
        location: data.location || '',
        hourly_rate: data.hourly_rate,
        daily_rate: data.daily_rate,
        monthly_rate: data.monthly_rate,
        notes: data.notes || '',
        created_by: profile?.id || '',
        operating_hours_total: initialData?.operating_hours_total || 0,
        current_value: initialData?.current_value || 0,
        maintenance_cost_total: initialData?.maintenance_cost_total || 0,
        depreciation_rate: initialData?.depreciation_rate || 0,
        fuel_consumption_per_hour: initialData?.fuel_consumption_per_hour || 0,
        acquisition_cost: initialData?.acquisition_cost || 0,
        acquisition_date: data.acquisition_date?.toISOString().split('T')[0] || null,
        last_maintenance_date: data.last_maintenance_date?.toISOString().split('T')[0] || null,
        next_maintenance_date: data.next_maintenance_date?.toISOString().split('T')[0] || null,
        photos: initialData?.photos || [],
        documents: initialData?.documents || [],
        maintenance_schedule: initialData?.maintenance_schedule || {},
        operator_requirements: initialData?.operator_requirements || [],
        safety_certifications: initialData?.safety_certifications || [],
        usage_log: initialData?.usage_log || [],
      };

      if (initialData) {
        // Update existing equipment
        const { error } = await supabase
          .from("construction_equipment")
          .update(equipmentData)
          .eq("id", initialData.id);

        if (error) {
          console.error("Error updating equipment:", error);
          toast.error("Error al actualizar el equipo");
          return;
        }

        toast.success("Equipo actualizado exitosamente");
      } else {
        // Create new equipment
        const { error } = await supabase
          .from("construction_equipment")
          .insert(equipmentData);

        if (error) {
          console.error("Error creating equipment:", error);
          toast.error("Error al crear el equipo");
          return;
        }

        toast.success("Equipo creado exitosamente");
      }

      onSuccess();
    } catch (error) {
      console.error("Error:", error);
      toast.error(initialData ? "Error al actualizar el equipo" : "Error al crear el equipo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SmartScrollArea className="w-full" maxHeight="calc(100vh - 200px)">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FieldGroup 
            title="Información Básica" 
            description="Datos principales del equipo"
          >
            <ResponsiveGrid cols={{ default: 1, md: 2 }}>
          <FormField
            control={form.control}
            name="equipment_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del Equipo *</FormLabel>
                <FormControl>
                  <Input placeholder="Retroexcavadora CAT 320" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="equipment_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código (Opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="EQ-001" {...field} />
                </FormControl>
                <FormDescription>
                  Si no se especifica, se generará automáticamente
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
            </ResponsiveGrid>
          </FieldGroup>

          <FieldGroup 
            title="Clasificación y Estado" 
            description="Tipo de equipo y estado actual"
          >
            <ResponsiveGrid cols={{ default: 1, md: 2 }}>
          <FormField
            control={form.control}
            name="equipment_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Equipo *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {equipmentTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type}
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
                <FormLabel>Estado *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estado" />
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
            </ResponsiveGrid>
          </FieldGroup>

          <FieldGroup 
            title="Especificaciones Técnicas" 
            description="Marca, modelo y números de serie"
          >
            <ResponsiveGrid cols={{ default: 1, md: 3 }}>
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Marca</FormLabel>
                <FormControl>
                  <Input placeholder="Caterpillar" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Modelo</FormLabel>
                <FormControl>
                  <Input placeholder="320D2" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="serial_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número de Serie</FormLabel>
                <FormControl>
                  <Input placeholder="ABC123456" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
            </ResponsiveGrid>
          </FieldGroup>

          <FieldGroup 
            title="Condición y Ubicación" 
            description="Estado del equipo y ubicación actual"
          >
            <ResponsiveGrid cols={{ default: 1, md: 2 }}>
          <FormField
            control={form.control}
            name="condition_rating"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Calificación de Condición (1-5) *</FormLabel>
                <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar calificación" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1">1 - Muy Malo</SelectItem>
                    <SelectItem value="2">2 - Malo</SelectItem>
                    <SelectItem value="3">3 - Regular</SelectItem>
                    <SelectItem value="4">4 - Bueno</SelectItem>
                    <SelectItem value="5">5 - Excelente</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ubicación</FormLabel>
                <FormControl>
                  <Input placeholder="Bodega Principal" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
            </ResponsiveGrid>
          </FieldGroup>

          <FieldGroup 
            title="Tarifas y Costos" 
            description="Tarifas de alquiler por periodo"
          >
            <ResponsiveGrid cols={{ default: 1, md: 3 }}>
          <FormField
            control={form.control}
            name="hourly_rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tarifa por Hora ($)</FormLabel>
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
            name="daily_rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tarifa por Día ($)</FormLabel>
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
            name="monthly_rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tarifa por Mes ($)</FormLabel>
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
            title="Fechas de Mantenimiento" 
            description="Historial y programación de mantenimiento"
            defaultOpen={false}
          >
            <ResponsiveGrid cols={{ default: 1, md: 3 }}>
          <FormField
            control={form.control}
            name="acquisition_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha de Adquisición</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "pl-3 text-left font-normal",
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
                      disabled={(date) => date > new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="last_maintenance_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Último Mantenimiento</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "pl-3 text-left font-normal",
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
                      disabled={(date) => date > new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="next_maintenance_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Próximo Mantenimiento</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "pl-3 text-left font-normal",
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
            </ResponsiveGrid>
          </FieldGroup>

          <FieldGroup 
            title="Notas Adicionales" 
            description="Observaciones sobre el equipo"
            defaultOpen={false}
          >
            <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Observaciones adicionales sobre el equipo"
                  className="min-h-[80px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
            />
          </FieldGroup>

          <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
        <Button type="submit" disabled={loading}>
          {loading 
            ? (initialData ? "Actualizando..." : "Creando...") 
            : (initialData ? "Actualizar Equipo" : "Crear Equipo")
          }
        </Button>
          </div>
        </form>
      </Form>
    </SmartScrollArea>
  );
}