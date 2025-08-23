import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormMessage, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TouchScrollSelect, TouchScrollSelectContent, TouchScrollSelectItem, TouchScrollSelectTrigger, TouchScrollSelectValue } from "@/components/ui/touch-scroll-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/DatePicker";
import { CurrencyInput } from "@/components/CurrencyInput";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, X, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Form validation schema
const formSchema = z.object({
  fecha: z.date(),
  sucursal_id: z.string().min(1, "Sucursal es requerida"),
  empresa_proyecto_id: z.string().optional(),
  tipo_movimiento: z.enum(["ingreso", "egreso"]),
  monto: z.number().min(0.01, "Monto debe ser mayor a 0"),
  departamento: z.string().min(1, "Departamento es requerido"),
  mayor_id: z.string().optional(),
  partida_id: z.string().optional(),
  subpartida_id: z.string().optional(),
  cliente_proveedor_id: z.string().optional(),
  tipo_entidad: z.enum(["cliente", "proveedor"]).optional(),
  tiene_factura: z.boolean(),
  folio_factura: z.string().optional(),
  descripcion: z.string().optional(),
}).refine((data) => {
  if (data.tiene_factura && !data.folio_factura?.trim()) {
    return false;
  }
  return true;
}, {
  message: "Folio de factura es requerido cuando se marca 'Tiene factura'",
  path: ["folio_factura"],
});

type FormData = z.infer<typeof formSchema>;

interface UnifiedTransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Option {
  id: string;
  nombre: string;
  codigo?: string;
  tipo?: "cliente" | "proveedor";
}

// Function to normalize text for internal comparisons only
const normalizeForComparison = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/_/g, ' ');
};

export function UnifiedTransactionForm({ open, onOpenChange }: UnifiedTransactionFormProps) {
  const [loading, setLoading] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  
  // Data states
  const [sucursales, setSucursales] = useState<Option[]>([]);
  const [proyectos, setProyectos] = useState<Option[]>([]);
  const [departamentos, setDepartamentos] = useState<Option[]>([]);
  const [mayores, setMayores] = useState<Option[]>([]);
  const [partidas, setPartidas] = useState<Option[]>([]);
  const [subpartidas, setSubpartidas] = useState<Option[]>([]);
  const [clientesProveedores, setClientesProveedores] = useState<Option[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fecha: new Date(),
      tipo_movimiento: "ingreso",
      monto: 0,
      departamento: "",
      tiene_factura: false,
    },
  });

  const watchedTieneFactura = form.watch("tiene_factura");
  const watchedDepartamento = form.watch("departamento");
  const watchedMayor = form.watch("mayor_id");
  const watchedPartida = form.watch("partida_id");

  // Get form errors for display
  const formErrors = Object.keys(form.formState.errors).map(key => {
    const error = form.formState.errors[key as keyof typeof form.formState.errors];
    return error?.message || `Error en ${key}`;
  });

  // Load initial data when modal opens
  useEffect(() => {
    if (open) {
      loadInitialData();
    }
  }, [open]);

  // Handle cascading dependencies
  useEffect(() => {
    if (watchedDepartamento) {
      // Reset dependent fields
      form.setValue("mayor_id", "");
      form.setValue("partida_id", "");
      form.setValue("subpartida_id", "");
      setMayores([]);
      setPartidas([]);
      setSubpartidas([]);
      loadMayores(watchedDepartamento);
    }
  }, [watchedDepartamento, form]);

  useEffect(() => {
    if (watchedMayor) {
      // Reset dependent fields
      form.setValue("partida_id", "");
      form.setValue("subpartida_id", "");
      setPartidas([]);
      setSubpartidas([]);
      loadPartidas(watchedMayor);
    }
  }, [watchedMayor, form]);

  useEffect(() => {
    if (watchedPartida) {
      // Reset subpartida
      form.setValue("subpartida_id", "");
      setSubpartidas([]);
      loadSubpartidas(watchedPartida);
    }
  }, [watchedPartida, form]);

  const loadInitialData = async () => {
    try {
      await Promise.all([
        loadSucursales(),
        loadProyectos(),
        loadDepartamentos(),
        loadClientesProveedores()
      ]);
    } catch (error) {
      console.error("Error loading initial data:", error);
      toast.error("Error al cargar datos iniciales");
    }
  };

  const loadSucursales = async () => {
    try {
      const { data, error } = await supabase
        .from("branch_offices")
        .select("id, name")
        .eq("active", true);
      
      if (error) throw error;
      
      setSucursales((data || []).map(item => ({ id: item.id, nombre: item.name })));
    } catch (error) {
      console.error("Error loading sucursales:", error);
      setSucursales([]);
    }
  };

  const loadProyectos = async () => {
    try {
      const { data, error } = await supabase
        .from("client_projects")
        .select("id, project_name, client_id, clients(full_name)")
        .order("project_name");
      
      if (error) throw error;
      
      const proyectosFormateados = (data || []).map(item => ({
        id: item.id,
        nombre: `${item.project_name} - ${item.clients?.full_name || 'Sin cliente'}`,
      }));
      
      // Add "Solo Empresa" option
      proyectosFormateados.unshift({ id: "empresa", nombre: "Solo Empresa (Sin Proyecto)" });
      setProyectos(proyectosFormateados);
    } catch (error) {
      console.error("Error loading proyectos:", error);
      setProyectos([{ id: "empresa", nombre: "Solo Empresa (Sin Proyecto)" }]);
    }
  };

  const loadDepartamentos = async () => {
    try {
      const { data, error } = await supabase
        .from("chart_of_accounts_departamentos")
        .select("departamento")
        .eq("activo", true)
        .order("departamento");
      
      if (error) throw error;
      
      setDepartamentos((data || []).map(dept => ({
        id: dept.departamento,
        nombre: dept.departamento
      })));
    } catch (error) {
      console.error("Error loading departamentos:", error);
      setDepartamentos([]);
    }
  };

  const loadMayores = async (departamento: string) => {
    try {
      const { data, error } = await supabase
        .from("chart_of_accounts_mayor")
        .select("id, nombre, codigo")
        .eq("departamento", departamento)
        .eq("activo", true)
        .order("codigo");
      
      if (error) throw error;
      
      setMayores((data || []).map(item => ({ 
        id: item.id, 
        nombre: `${item.codigo} - ${item.nombre}`,
        codigo: item.codigo 
      })));
    } catch (error) {
      console.error("Error loading mayores:", error);
      setMayores([]);
    }
  };

  const loadPartidas = async (mayorId: string) => {
    try {
      const { data, error } = await supabase
        .from("chart_of_accounts_partidas")
        .select("id, nombre, codigo")
        .eq("mayor_id", mayorId)
        .eq("activo", true)
        .order("codigo");
      
      if (error) throw error;
      
      setPartidas((data || []).map(item => ({ 
        id: item.id, 
        nombre: `${item.codigo} - ${item.nombre}`,
        codigo: item.codigo 
      })));
    } catch (error) {
      console.error("Error loading partidas:", error);
      setPartidas([]);
    }
  };

  const loadSubpartidas = async (partidaId: string) => {
    try {
      // Get the partida to check its department
      const { data: partida } = await supabase
        .from("chart_of_accounts_partidas")
        .select("*, chart_of_accounts_mayor(departamento)")
        .eq("id", partidaId)
        .single();

      // Load specific subpartidas for this partida
      const { data: specificSubpartidas } = await supabase
        .from("chart_of_accounts_subpartidas")
        .select("id, nombre, codigo")
        .eq("partida_id", partidaId)
        .eq("activo", true)
        .order("codigo");

      let allSubpartidas = [...(specificSubpartidas || [])];

      // If this is a construction partida, also load global construction subpartidas
      const departamentoNormalizado = normalizeForComparison(partida?.chart_of_accounts_mayor?.departamento || '');
      if (departamentoNormalizado === 'construccion') {
        const { data: globalSubpartidas } = await supabase
          .from("chart_of_accounts_subpartidas")
          .select("id, nombre, codigo, departamento_aplicable")
          .eq("es_global", true)
          .eq("activo", true)
          .order("codigo");

        // Filter global subpartidas for construction department
        const constructionGlobals = globalSubpartidas?.filter(item => 
          normalizeForComparison(item.departamento_aplicable || '') === 'construccion'
        ) || [];

        if (constructionGlobals.length > 0) {
          allSubpartidas = [
            ...allSubpartidas,
            ...constructionGlobals.map(item => ({
              ...item,
              nombre: `${item.nombre} (Global)` // Mark as global for clarity
            }))
          ];
        }
      }
      
      setSubpartidas(allSubpartidas.map(item => ({ 
        id: item.id, 
        nombre: `${item.codigo} - ${item.nombre}`,
        codigo: item.codigo 
      })));
    } catch (error) {
      console.error("Error loading subpartidas:", error);
      setSubpartidas([]);
    }
  };

  const loadClientesProveedores = async () => {
    try {
      // Load clients
      const { data: clients } = await supabase
        .from("clients")
        .select("id, full_name")
        .order("full_name");

      // Load suppliers
      const { data: suppliers } = await supabase
        .from("suppliers")
        .select("id, company_name")
        .order("company_name");

      const combined: Option[] = [];
      
      if (clients) {
        combined.push(...clients.map(item => ({ 
          id: item.id, 
          nombre: `Cliente: ${item.full_name}`,
          tipo: "cliente" as const
        })));
      }
      
      if (suppliers) {
        combined.push(...suppliers.map(item => ({ 
          id: item.id, 
          nombre: `Proveedor: ${item.company_name}`,
          tipo: "proveedor" as const
        })));
      }

      setClientesProveedores(combined);
    } catch (error) {
      console.error("Error loading clientes/proveedores:", error);
      setClientesProveedores([]);
    }
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      // Get current user profile
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error("Usuario no autenticado");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.user.id)
        .single();

      if (profileError || !profile) {
        throw new Error("Error al obtener perfil de usuario");
      }

      const transactionData = {
        fecha: data.fecha.toISOString().split('T')[0],
        sucursal_id: data.sucursal_id,
        referencia_unica: '',
        empresa_proyecto_id: data.empresa_proyecto_id === "empresa" ? null : data.empresa_proyecto_id,
        tipo_movimiento: data.tipo_movimiento,
        monto: data.monto,
        departamento: data.departamento,
        mayor_id: data.mayor_id || null,
        partida_id: data.partida_id || null,
        subpartida_id: data.subpartida_id || null,
        cliente_proveedor_id: data.cliente_proveedor_id || null,
        tipo_entidad: data.tipo_entidad,
        tiene_factura: data.tiene_factura,
        folio_factura: data.folio_factura || null,
        descripcion: data.descripcion || null,
        created_by: profile.id,
      };

      const { error, data: insertedData } = await supabase
        .from("unified_financial_transactions")
        .insert(transactionData)
        .select()
        .single();

      if (error) throw error;

      toast.success(`Transacción creada exitosamente (Ref: ${insertedData?.referencia_unica || 'N/A'})`);
      onOpenChange(false);
      form.reset({
        fecha: new Date(),
        tipo_movimiento: "ingreso",
        monto: 0,
        departamento: "",
        tiene_factura: false,
      });
      
      // Reset all dependent data
      setMayores([]);
      setPartidas([]);
      setSubpartidas([]);
      setShowDescription(false);
    } catch (error: any) {
      console.error("Error creating transaction:", error);
      const errorMessage = error.message || "Error desconocido al crear transacción";
      toast.error(`Error al crear transacción: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Nueva Transacción Financiera Unificada
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="px-6 py-4">
          {/* Validation Errors */}
          {formErrors.length > 0 && (
            <Alert className="mb-6 bg-muted/50 border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-sm">
                <div className="font-medium text-destructive mb-2">Errores de validación:</div>
                <ul className="space-y-1">
                  {formErrors.map((error, index) => (
                    <li key={index} className="flex items-center gap-2 text-destructive">
                      <div className="w-2 h-2 bg-destructive rounded-full flex-shrink-0" />
                      {error}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Row 1: Fecha, Sucursal, Empresa/Proyecto */}
              <div className="grid grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="fecha"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Fecha</FormLabel>
                      <FormControl>
                        <DatePicker
                          date={field.value}
                          onDateChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sucursal_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Sucursal</FormLabel>
                      <TouchScrollSelect value={field.value} onValueChange={field.onChange} disabled={loading}>
                        <FormControl>
                          <TouchScrollSelectTrigger className="w-full">
                            <TouchScrollSelectValue placeholder="Seleccionar sucursal" />
                          </TouchScrollSelectTrigger>
                        </FormControl>
                        <TouchScrollSelectContent>
                          {sucursales.map((item) => (
                            <TouchScrollSelectItem key={item.id} value={item.id}>
                              {item.nombre}
                            </TouchScrollSelectItem>
                          ))}
                        </TouchScrollSelectContent>
                      </TouchScrollSelect>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="empresa_proyecto_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Empresa / Proyecto</FormLabel>
                      <TouchScrollSelect value={field.value} onValueChange={field.onChange} disabled={loading}>
                        <FormControl>
                          <TouchScrollSelectTrigger className="w-full">
                            <TouchScrollSelectValue placeholder="Seleccionar proyecto" />
                          </TouchScrollSelectTrigger>
                        </FormControl>
                        <TouchScrollSelectContent>
                          {proyectos.map((item) => (
                            <TouchScrollSelectItem key={item.id} value={item.id}>
                              {item.nombre}
                            </TouchScrollSelectItem>
                          ))}
                        </TouchScrollSelectContent>
                      </TouchScrollSelect>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 2: Movimiento, Monto, Departamento */}
              <div className="grid grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="tipo_movimiento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Movimiento</FormLabel>
                      <TouchScrollSelect value={field.value} onValueChange={field.onChange} disabled={loading}>
                        <FormControl>
                          <TouchScrollSelectTrigger className="w-full">
                            <TouchScrollSelectValue placeholder="Seleccionar tipo" />
                          </TouchScrollSelectTrigger>
                        </FormControl>
                        <TouchScrollSelectContent>
                          <TouchScrollSelectItem value="ingreso">Ingreso</TouchScrollSelectItem>
                          <TouchScrollSelectItem value="egreso">Egreso</TouchScrollSelectItem>
                        </TouchScrollSelectContent>
                      </TouchScrollSelect>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="monto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Monto</FormLabel>
                      <FormControl>
                        <CurrencyInput
                          value={field.value}
                          onChange={field.onChange}
                          disabled={loading}
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="departamento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Departamento</FormLabel>
                      <TouchScrollSelect value={field.value} onValueChange={field.onChange} disabled={loading}>
                        <FormControl>
                          <TouchScrollSelectTrigger className="w-full">
                            <TouchScrollSelectValue placeholder="Seleccionar departamento" />
                          </TouchScrollSelectTrigger>
                        </FormControl>
                        <TouchScrollSelectContent>
                          {departamentos.map((item) => (
                            <TouchScrollSelectItem key={item.id} value={item.id}>
                              {item.nombre}
                            </TouchScrollSelectItem>
                          ))}
                        </TouchScrollSelectContent>
                      </TouchScrollSelect>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 3: Mayor, Partidas, Subpartidas */}
              <div className="grid grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="mayor_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Mayor</FormLabel>
                      <TouchScrollSelect 
                        value={field.value} 
                        onValueChange={field.onChange} 
                        disabled={loading || !watchedDepartamento}
                      >
                        <FormControl>
                          <TouchScrollSelectTrigger className="w-full">
                            <TouchScrollSelectValue placeholder="Seleccionar mayor" />
                          </TouchScrollSelectTrigger>
                        </FormControl>
                        <TouchScrollSelectContent>
                          {mayores.map((item) => (
                            <TouchScrollSelectItem key={item.id} value={item.id}>
                              {item.nombre}
                            </TouchScrollSelectItem>
                          ))}
                        </TouchScrollSelectContent>
                      </TouchScrollSelect>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="partida_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Partidas</FormLabel>
                      <TouchScrollSelect 
                        value={field.value} 
                        onValueChange={field.onChange} 
                        disabled={loading || !watchedMayor}
                      >
                        <FormControl>
                          <TouchScrollSelectTrigger className="w-full">
                            <TouchScrollSelectValue placeholder="Seleccionar partida" />
                          </TouchScrollSelectTrigger>
                        </FormControl>
                        <TouchScrollSelectContent>
                          {partidas.map((item) => (
                            <TouchScrollSelectItem key={item.id} value={item.id}>
                              {item.nombre}
                            </TouchScrollSelectItem>
                          ))}
                        </TouchScrollSelectContent>
                      </TouchScrollSelect>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subpartida_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Subpartidas</FormLabel>
                      <TouchScrollSelect 
                        value={field.value} 
                        onValueChange={field.onChange} 
                        disabled={loading || !watchedPartida}
                      >
                        <FormControl>
                          <TouchScrollSelectTrigger className="w-full">
                            <TouchScrollSelectValue placeholder="Seleccionar subpartida" />
                          </TouchScrollSelectTrigger>
                        </FormControl>
                        <TouchScrollSelectContent>
                          {subpartidas.map((item) => (
                            <TouchScrollSelectItem key={item.id} value={item.id}>
                              {item.nombre}
                            </TouchScrollSelectItem>
                          ))}
                        </TouchScrollSelectContent>
                      </TouchScrollSelect>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 4: Cliente/Proveedor y Checkbox */}
              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="cliente_proveedor_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Cliente / Proveedor</FormLabel>
                      <TouchScrollSelect 
                        value={field.value} 
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Set tipo_entidad based on selection
                          if (value) {
                            const selected = clientesProveedores.find(item => item.id === value);
                            if (selected?.tipo) {
                              form.setValue("tipo_entidad", selected.tipo);
                            }
                          }
                        }} 
                        disabled={loading}
                      >
                        <FormControl>
                          <TouchScrollSelectTrigger className="w-full">
                            <TouchScrollSelectValue placeholder="Seleccionar cliente o proveedor..." />
                          </TouchScrollSelectTrigger>
                        </FormControl>
                        <TouchScrollSelectContent>
                          {clientesProveedores.map((item) => (
                            <TouchScrollSelectItem key={item.id} value={item.id}>
                              {item.nombre}
                            </TouchScrollSelectItem>
                          ))}
                        </TouchScrollSelectContent>
                      </TouchScrollSelect>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tiene_factura"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 pt-6">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={loading}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-medium">Cuenta con factura</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {/* Conditional Folio Field */}
              {watchedTieneFactura && (
                <FormField
                  control={form.control}
                  name="folio_factura"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Folio de Factura</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ingrese el folio de la factura"
                          disabled={loading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Description Toggle */}
              <div className="space-y-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDescription(!showDescription)}
                  disabled={loading}
                  className="flex items-center gap-2 text-sm"
                >
                  <Eye className="h-4 w-4" />
                  Mostrar Descripción
                </Button>

                {showDescription && (
                  <FormField
                    control={form.control}
                    name="descripcion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Descripción</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Descripción adicional (opcional)"
                            className="resize-none"
                            disabled={loading}
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {loading ? "Guardando..." : "Guardar Transacción"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}