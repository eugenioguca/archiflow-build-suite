import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/DatePicker";
import { CurrencyInput } from "@/components/CurrencyInput";
import { SearchableCombobox, type SearchableComboboxItem } from "@/components/ui/searchable-combobox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Function to normalize text for internal comparisons only
const normalizeForComparison = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/_/g, ' ');
};

interface UnifiedTransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormData {
  fecha: Date;
  sucursal_id: string;
  empresa_proyecto_id?: string;
  tipo_movimiento: "ingreso" | "egreso";
  monto: number;
  departamento: string;
  mayor_id?: string;
  partida_id?: string;
  subpartida_id?: string;
  cliente_proveedor_id?: string;
  tipo_entidad?: "cliente" | "proveedor";
  tiene_factura: boolean;
  folio_factura?: string;
  descripcion?: string;
}

interface Option {
  id: string;
  nombre: string;
  codigo?: string;
  tipo?: "cliente" | "proveedor";
}

export function UnifiedTransactionForm({ open, onOpenChange }: UnifiedTransactionFormProps) {
  const [loading, setLoading] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  // Simple local states for each combobox (following TestCombobox pattern)
  const [selectedSucursal, setSelectedSucursal] = useState("");
  const [selectedProyecto, setSelectedProyecto] = useState("");
  const [selectedDepartamento, setSelectedDepartamento] = useState("");
  const [selectedMayor, setSelectedMayor] = useState("");
  const [selectedPartida, setSelectedPartida] = useState("");
  const [selectedSubpartida, setSelectedSubpartida] = useState("");
  const [selectedClienteProveedor, setSelectedClienteProveedor] = useState("");
  
  // Data states - always arrays, never loading states that prevent rendering
  const [sucursales, setSucursales] = useState<Option[]>([]);
  const [proyectos, setProyectos] = useState<Option[]>([]);
  const [departamentos, setDepartamentos] = useState<Option[]>([]);
  const [mayores, setMayores] = useState<Option[]>([]);
  const [partidas, setPartidas] = useState<Option[]>([]);
  const [subpartidas, setSubpartidas] = useState<Option[]>([]);
  const [clientesProveedores, setClientesProveedores] = useState<Option[]>([]);
  
  // Simple loading indicators that don't affect rendering
  const [isLoadingData, setIsLoadingData] = useState(false);

  const form = useForm<FormData>({
    defaultValues: {
      fecha: new Date(),
      tipo_movimiento: "ingreso",
      monto: 0,
      departamento: "",
      tiene_factura: false,
    },
  });

  const watchedTieneFactura = form.watch("tiene_factura");
  const watchedMonto = form.watch("monto");

  // Validation function
  const validateForm = useCallback(() => {
    const errors: string[] = [];
    
    if (!selectedSucursal) {
      errors.push("Sucursal es requerida");
    }
    if (!selectedDepartamento) {
      errors.push("Departamento es requerido");
    }
    if (!form.getValues("monto") || form.getValues("monto") <= 0) {
      errors.push("Monto debe ser mayor a 0");
    }
    if (form.getValues("tiene_factura") && !form.getValues("folio_factura")?.trim()) {
      errors.push("Folio de factura es requerido cuando se marca 'Tiene factura'");
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  }, [selectedSucursal, selectedDepartamento, form]);

  // Load initial data when modal opens
  useEffect(() => {
    if (open) {
      loadInitialData();
    }
  }, [open]);

  // Sync local states with React Hook Form
  useEffect(() => {
    form.setValue("sucursal_id", selectedSucursal);
  }, [selectedSucursal, form]);

  useEffect(() => {
    form.setValue("empresa_proyecto_id", selectedProyecto);
  }, [selectedProyecto, form]);

  useEffect(() => {
    form.setValue("departamento", selectedDepartamento);
    // When department changes, reset dependent fields
    if (selectedDepartamento) {
      setSelectedMayor("");
      setSelectedPartida("");
      setSelectedSubpartida("");
      form.setValue("mayor_id", undefined);
      form.setValue("partida_id", undefined);
      form.setValue("subpartida_id", undefined);
      loadMayores(selectedDepartamento);
    } else {
      setMayores([]);
    }
  }, [selectedDepartamento, form]);

  useEffect(() => {
    form.setValue("mayor_id", selectedMayor);
    // When mayor changes, reset dependent fields
    if (selectedMayor) {
      setSelectedPartida("");
      setSelectedSubpartida("");
      form.setValue("partida_id", undefined);
      form.setValue("subpartida_id", undefined);
      loadPartidas(selectedMayor);
    } else {
      setPartidas([]);
    }
  }, [selectedMayor, form]);

  useEffect(() => {
    form.setValue("partida_id", selectedPartida);
    // When partida changes, reset subpartida
    if (selectedPartida) {
      setSelectedSubpartida("");
      form.setValue("subpartida_id", undefined);
      loadSubpartidas(selectedPartida);
    } else {
      setSubpartidas([]);
    }
  }, [selectedPartida, form]);

  useEffect(() => {
    form.setValue("subpartida_id", selectedSubpartida);
  }, [selectedSubpartida, form]);

  useEffect(() => {
    form.setValue("cliente_proveedor_id", selectedClienteProveedor);
    // Determine tipo_entidad based on selected client/supplier
    if (selectedClienteProveedor) {
      const selected = clientesProveedores.find(item => item.id === selectedClienteProveedor);
      if (selected?.tipo) {
        form.setValue("tipo_entidad", selected.tipo);
      }
    }
  }, [selectedClienteProveedor, form, clientesProveedores]);

  // Real-time validation
  useEffect(() => {
    if (open) {
      validateForm();
    }
  }, [open, watchedMonto, watchedTieneFactura, validateForm]);

  const loadInitialData = async () => {
    setIsLoadingData(true);
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
    } finally {
      setIsLoadingData(false);
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
      toast.error("Error al cargar sucursales");
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
      toast.error("Error al cargar proyectos");
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
      toast.error("Error al cargar departamentos");
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
      toast.error("Error al cargar mayores");
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
      toast.error("Error al cargar partidas");
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
      toast.error("Error al cargar subpartidas");
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
      toast.error("Error al cargar clientes y proveedores");
      setClientesProveedores([]);
    }
  };

  const onSubmit = async (data: FormData) => {
    // Validate form before submission
    if (!validateForm()) {
      toast.error("Por favor corrige los errores antes de continuar");
      return;
    }

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
      form.reset();
      // Reset local states
      setSelectedSucursal("");
      setSelectedProyecto("");
      setSelectedDepartamento("");
      setSelectedMayor("");
      setSelectedPartida("");
      setSelectedSubpartida("");
      setSelectedClienteProveedor("");
      setValidationErrors([]);
    } catch (error: any) {
      console.error("Error creating transaction:", error);
      const errorMessage = error.message || "Error desconocido al crear transacción";
      toast.error(`Error al crear transacción: ${errorMessage}`);
      
      // Handle specific error types
      if (error.code === '23505') {
        toast.error("Error: Referencia duplicada detectada");
      } else if (error.code === '23503') {
        toast.error("Error: Referencia a datos inexistentes");
      }
    } finally {
      setLoading(false);
    }
  };

  // Convert data to SearchableComboboxItem format (following TestCombobox pattern)
  const sucursalesItems: SearchableComboboxItem[] = sucursales.map(item => ({
    value: item.id,
    label: item.nombre,
    searchText: item.nombre
  }));

  const proyectosItems: SearchableComboboxItem[] = proyectos.map(item => ({
    value: item.id,
    label: item.nombre,
    searchText: item.nombre
  }));

  const departamentosItems: SearchableComboboxItem[] = departamentos.map(item => ({
    value: item.id,
    label: item.nombre,
    searchText: item.nombre
  }));

  const mayoresItems: SearchableComboboxItem[] = mayores.map(item => ({
    value: item.id,
    label: item.nombre,
    codigo: item.codigo,
    searchText: `${item.codigo} ${item.nombre}`
  }));

  const partidasItems: SearchableComboboxItem[] = partidas.map(item => ({
    value: item.id,
    label: item.nombre,
    codigo: item.codigo,
    searchText: `${item.codigo} ${item.nombre}`
  }));

  const subpartidasItems: SearchableComboboxItem[] = subpartidas.map(item => ({
    value: item.id,
    label: item.nombre,
    codigo: item.codigo,
    searchText: `${item.codigo} ${item.nombre}`
  }));

  const clientesProveedoresItems: SearchableComboboxItem[] = clientesProveedores.map(item => ({
    value: item.id,
    label: item.nombre,
    searchText: item.nombre
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Crear Nueva Transacción Financiera
            {isLoadingData && <Loader2 className="h-4 w-4 animate-spin" />}
          </DialogTitle>
        </DialogHeader>

        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc pl-4">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fecha"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha *</FormLabel>
                    <DatePicker
                      date={field.value}
                      onDateChange={field.onChange}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Sucursal *</FormLabel>
                <SearchableCombobox
                  items={sucursalesItems}
                  value={selectedSucursal}
                  onValueChange={setSelectedSucursal}
                  placeholder="Seleccionar sucursal..."
                  emptyText="No hay sucursales disponibles"
                  disabled={loading}
                />
                <FormMessage />
              </FormItem>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormItem>
                <FormLabel>Proyecto</FormLabel>
                <SearchableCombobox
                  items={proyectosItems}
                  value={selectedProyecto}
                  onValueChange={setSelectedProyecto}
                  placeholder="Seleccionar proyecto..."
                  emptyText="No hay proyectos disponibles"
                  disabled={loading}
                />
              </FormItem>

              <FormField
                control={form.control}
                name="tipo_movimiento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Movimiento *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ingreso">Ingreso</SelectItem>
                        <SelectItem value="egreso">Egreso</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Financial Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="monto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto *</FormLabel>
                    <CurrencyInput
                      value={field.value}
                      onChange={field.onChange}
                      disabled={loading}
                      placeholder="0.00"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Departamento *</FormLabel>
                <SearchableCombobox
                  items={departamentosItems}
                  value={selectedDepartamento}
                  onValueChange={setSelectedDepartamento}
                  placeholder="Seleccionar departamento..."
                  emptyText="No hay departamentos disponibles"
                  disabled={loading}
                />
                <FormMessage />
              </FormItem>
            </div>

            {/* Accounting Codes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormItem>
                <FormLabel>Mayor</FormLabel>
                <SearchableCombobox
                  items={mayoresItems}
                  value={selectedMayor}
                  onValueChange={setSelectedMayor}
                  placeholder="Seleccionar mayor..."
                  emptyText="Selecciona un departamento primero"
                  showCodes={true}
                  disabled={loading || !selectedDepartamento}
                />
              </FormItem>

              <FormItem>
                <FormLabel>Partida</FormLabel>
                <SearchableCombobox
                  items={partidasItems}
                  value={selectedPartida}
                  onValueChange={setSelectedPartida}
                  placeholder="Seleccionar partida..."
                  emptyText="Selecciona un mayor primero"
                  showCodes={true}
                  disabled={loading || !selectedMayor}
                />
              </FormItem>

              <FormItem>
                <FormLabel>Subpartida</FormLabel>
                <SearchableCombobox
                  items={subpartidasItems}
                  value={selectedSubpartida}
                  onValueChange={setSelectedSubpartida}
                  placeholder="Seleccionar subpartida..."
                  emptyText="Selecciona una partida primero"
                  showCodes={true}
                  disabled={loading || !selectedPartida}
                />
              </FormItem>
            </div>

            {/* Client/Supplier */}
            <FormItem>
              <FormLabel>Cliente/Proveedor</FormLabel>
              <SearchableCombobox
                items={clientesProveedoresItems}
                value={selectedClienteProveedor}
                onValueChange={setSelectedClienteProveedor}
                placeholder="Seleccionar cliente o proveedor..."
                emptyText="No hay clientes o proveedores disponibles"
                disabled={loading}
              />
            </FormItem>

            {/* Invoice Information */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="tiene_factura"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={loading}
                    />
                    <div className="space-y-1 leading-none">
                      <FormLabel>Tiene factura</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {watchedTieneFactura && (
                <FormField
                  control={form.control}
                  name="folio_factura"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Folio de Factura *</FormLabel>
                      <Input
                        placeholder="Ingrese el folio de la factura"
                        disabled={loading}
                        {...field}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Optional Description */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDescription(!showDescription)}
                  disabled={loading}
                >
                  {showDescription ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showDescription ? "Ocultar" : "Agregar"} Descripción
                </Button>
              </div>

              {showDescription && (
                <FormField
                  control={form.control}
                  name="descripcion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <Textarea
                        placeholder="Descripción adicional (opcional)"
                        className="resize-none"
                        disabled={loading}
                        {...field}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-2 pt-4 border-t sticky bottom-0 bg-background">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || validationErrors.length > 0}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Transacción
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}