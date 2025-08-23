import { useState, useEffect, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/DatePicker";
import { CurrencyInput } from "@/components/CurrencyInput";
import { HookFormCombobox } from "@/components/ui/hook-form-combobox";
import type { SearchableComboboxItem } from "@/components/ui/searchable-combobox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDebounce } from "@/hooks/use-debounce";

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
}

export function UnifiedTransactionForm({ open, onOpenChange }: UnifiedTransactionFormProps) {
  const [loading, setLoading] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  // Data states with loading indicators
  const [dataLoading, setDataLoading] = useState({
    sucursales: false,
    proyectos: false,
    mayores: false,
    partidas: false,
    subpartidas: false,
    clientes: false,
    departamentos: false
  });
  
  const [sucursales, setSucursales] = useState<Option[]>([]);
  const [proyectos, setProyectos] = useState<Option[]>([]);
  const [mayores, setMayores] = useState<Option[]>([]);
  const [partidas, setPartidas] = useState<Option[]>([]);
  const [subpartidas, setSubpartidas] = useState<Option[]>([]);
  const [clientesProveedores, setClientesProveedores] = useState<Option[]>([]);
  const [departamentos, setDepartamentos] = useState<{value: string, label: string}[]>([]);

  const form = useForm<FormData>({
    defaultValues: {
      fecha: new Date(),
      tipo_movimiento: "ingreso",
      monto: 0,
      departamento: "",
      tiene_factura: false,
    },
  });

  const watchedDepartamento = form.watch("departamento");
  const watchedMayorId = form.watch("mayor_id");
  const watchedPartidaId = form.watch("partida_id");
  const watchedTieneFactura = form.watch("tiene_factura");
  const watchedMonto = form.watch("monto");
  
  // Debounced values for performance
  const debouncedDepartamento = useDebounce(watchedDepartamento, 300);
  const debouncedMayorId = useDebounce(watchedMayorId, 300);
  const debouncedPartidaId = useDebounce(watchedPartidaId, 300);

  // Validation function
  const validateForm = useCallback(() => {
    const errors: string[] = [];
    
    if (!form.getValues("sucursal_id")) {
      errors.push("Sucursal es requerida");
    }
    if (!form.getValues("departamento")) {
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
  }, [form]);

  // Load initial data with error handling
  useEffect(() => {
    if (open) {
      const loadInitialData = async () => {
        try {
          await Promise.all([
            loadSucursales(),
            loadProyectos(),
            loadClientesProveedores(),
            loadDepartamentos()
          ]);
        } catch (error) {
          console.error("Error loading initial data:", error);
          toast.error("Error al cargar datos iniciales");
        }
      };
      loadInitialData();
    }
  }, [open]);

  // Load dependent data with debouncing
  useEffect(() => {
    if (debouncedDepartamento) {
      loadMayores(debouncedDepartamento);
      form.setValue("mayor_id", undefined);
      form.setValue("partida_id", undefined);
      form.setValue("subpartida_id", undefined);
    }
  }, [debouncedDepartamento, form]);

  useEffect(() => {
    if (debouncedMayorId) {
      loadPartidas(debouncedMayorId);
      form.setValue("partida_id", undefined);
      form.setValue("subpartida_id", undefined);
    }
  }, [debouncedMayorId, form]);

  useEffect(() => {
    if (debouncedPartidaId) {
      loadSubpartidas(debouncedPartidaId);
      form.setValue("subpartida_id", undefined);
    }
  }, [debouncedPartidaId, form]);

  // Real-time validation
  useEffect(() => {
    if (open) {
      validateForm();
    }
  }, [open, watchedMonto, watchedTieneFactura, validateForm]);

  const loadSucursales = useCallback(async () => {
    setDataLoading(prev => ({ ...prev, sucursales: true }));
    try {
      const { data, error } = await supabase
        .from("branch_offices")
        .select("id, name")
        .eq("active", true);
      
      if (error) throw error;
      
      if (data) {
        const filteredData = data.filter(item => item.id && item.id.trim() !== '');
        console.log("Sucursales data:", filteredData);
        setSucursales(filteredData.map(item => ({ id: item.id, nombre: item.name })));
      }
    } catch (error) {
      console.error("Error loading sucursales:", error);
      toast.error("Error al cargar sucursales");
    } finally {
      setDataLoading(prev => ({ ...prev, sucursales: false }));
    }
  }, []);

  const loadProyectos = useCallback(async () => {
    setDataLoading(prev => ({ ...prev, proyectos: true }));
    try {
      const { data, error } = await supabase
        .from("client_projects")
        .select("id, project_name, client_id, clients(full_name)")
        .order("project_name");
      
      if (error) throw error;
      
      if (data) {
        const proyectosFormateados = data
          .filter(item => item.id && item.id.trim() !== '')
          .map(item => ({
            id: item.id,
            nombre: `${item.project_name} - ${item.clients?.full_name || 'Sin cliente'}`,
          }));
        
        // Add "Solo Empresa" option
        proyectosFormateados.unshift({ id: "empresa", nombre: "Solo Empresa (Sin Proyecto)" });
        console.log("Proyectos data:", proyectosFormateados);
        setProyectos(proyectosFormateados);
      }
    } catch (error) {
      console.error("Error loading proyectos:", error);
      toast.error("Error al cargar proyectos");
    } finally {
      setDataLoading(prev => ({ ...prev, proyectos: false }));
    }
  }, []);

  const loadMayores = useCallback(async (departamento: string) => {
    setDataLoading(prev => ({ ...prev, mayores: true }));
    try {
      const { data, error } = await supabase
        .from("chart_of_accounts_mayor")
        .select("id, nombre, codigo")
        .eq("departamento", departamento)
        .eq("activo", true)
        .order("codigo");
      
      if (error) throw error;
      
      if (data) {
        const filteredData = data.filter(item => item.id && item.id.trim() !== '');
        console.log("Mayores data:", filteredData);
        setMayores(filteredData.map(item => ({ 
          id: item.id, 
          nombre: `${item.codigo} - ${item.nombre}`,
          codigo: item.codigo 
        })));
      }
    } catch (error) {
      console.error("Error loading mayores:", error);
      toast.error("Error al cargar mayores");
    } finally {
      setDataLoading(prev => ({ ...prev, mayores: false }));
    }
  }, []);

  const loadPartidas = async (mayorId: string) => {
    const { data } = await supabase
      .from("chart_of_accounts_partidas")
      .select("id, nombre, codigo")
      .eq("mayor_id", mayorId)
      .eq("activo", true)
      .order("codigo");
    
    if (data) {
      const filteredData = data.filter(item => item.id && item.id.trim() !== '');
      console.log("Partidas data:", filteredData);
      setPartidas(filteredData.map(item => ({ 
        id: item.id, 
        nombre: `${item.codigo} - ${item.nombre}`,
        codigo: item.codigo 
      })));
    }
  };

  const loadSubpartidas = async (partidaId: string) => {
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
    
    const filteredData = allSubpartidas.filter(item => item.id && item.id.trim() !== '');
    console.log("Subpartidas data:", filteredData);
    setSubpartidas(filteredData.map(item => ({ 
      id: item.id, 
      nombre: `${item.codigo} - ${item.nombre}`,
      codigo: item.codigo 
    })));
  };

  const loadClientesProveedores = async () => {
    // Load clients
    const { data: clients } = await supabase
      .from("clients")
      .select("id, full_name")
      .order("full_name");

    // Load suppliers - using actual table structure
    const { data: suppliers } = await supabase
      .from("suppliers")
      .select("id, company_name")
      .order("company_name");

    const combined: (Option & { tipo: "cliente" | "proveedor" })[] = [];
    
    if (clients) {
      const filteredClients = clients.filter(item => item.id && item.id.trim() !== '');
      combined.push(...filteredClients.map(item => ({ 
        id: item.id, 
        nombre: `Cliente: ${item.full_name}`,
        tipo: "cliente" as const
      })));
    }
    
    if (suppliers) {
      const filteredSuppliers = suppliers.filter(item => item.id && item.id.trim() !== '');
      combined.push(...filteredSuppliers.map(item => ({ 
        id: item.id, 
        nombre: `Proveedor: ${item.company_name}`,
        tipo: "proveedor" as const
      })));
    }

    console.log("Clientes/Proveedores data:", combined);
    setClientesProveedores(combined);
  };

  const loadDepartamentos = async () => {
    const { data } = await supabase
      .from("chart_of_accounts_departamentos")
      .select("departamento")
      .eq("activo", true)
      .order("departamento");
    
    if (data) {
      const formattedDepartamentos = data.map(dept => ({
        value: dept.departamento,
        label: dept.departamento // Preserve original format from database
      }));
      console.log("Departamentos data:", formattedDepartamentos);
      setDepartamentos(formattedDepartamentos);
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
      // Get current user profile with error handling
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

      // Determine tipo_entidad based on selected client/supplier
      let tipoEntidad: "cliente" | "proveedor" | undefined = data.tipo_entidad;
      if (data.cliente_proveedor_id) {
        const selected = clientesProveedores.find(item => item.id === data.cliente_proveedor_id);
        if (selected && 'tipo' in selected) {
          tipoEntidad = selected.tipo as "cliente" | "proveedor";
        }
      }

      const transactionData = {
        fecha: data.fecha.toISOString().split('T')[0], // Convert Date to string
        sucursal_id: data.sucursal_id,
        referencia_unica: '', // Will be auto-generated by trigger
        empresa_proyecto_id: data.empresa_proyecto_id === "empresa" ? null : data.empresa_proyecto_id,
        tipo_movimiento: data.tipo_movimiento,
        monto: data.monto,
        departamento: data.departamento,
        mayor_id: data.mayor_id || null,
        partida_id: data.partida_id || null,
        subpartida_id: data.subpartida_id || null,
        cliente_proveedor_id: data.cliente_proveedor_id || null,
        tipo_entidad: tipoEntidad,
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

  // Convert data to SearchableComboboxItem format with null checks
  const proyectosComboboxItems: SearchableComboboxItem[] = useMemo(() => 
    (proyectos || []).map(item => ({
      value: item.id,
      label: item.nombre,
      searchText: item.nombre
    })), [proyectos]
  );

  const departamentosComboboxItems: SearchableComboboxItem[] = useMemo(() => 
    (departamentos || []).map(dept => ({
      value: dept.value,
      label: dept.label,
      searchText: dept.label
    })), [departamentos]
  );

  const mayoresComboboxItems: SearchableComboboxItem[] = useMemo(() => 
    (mayores || []).map(item => ({
      value: item.id,
      label: item.nombre,
      codigo: item.codigo,
      searchText: `${item.codigo} ${item.nombre}`
    })), [mayores]
  );

  const partidasComboboxItems: SearchableComboboxItem[] = useMemo(() => 
    (partidas || []).map(item => ({
      value: item.id,
      label: item.nombre,
      codigo: item.codigo,
      searchText: `${item.codigo} ${item.nombre}`
    })), [partidas]
  );

  const subpartidasComboboxItems: SearchableComboboxItem[] = useMemo(() => 
    (subpartidas || []).map(item => ({
      value: item.id,
      label: item.nombre,
      codigo: item.codigo,
      searchText: `${item.codigo} ${item.nombre}`
    })), [subpartidas]
  );

  const clientesProveedoresComboboxItems: SearchableComboboxItem[] = useMemo(() => 
    (clientesProveedores || []).map(item => ({
      value: item.id,
      label: item.nombre,
      searchText: item.nombre,
      group: 'tipo' in item ? (item.tipo === 'cliente' ? 'Clientes' : 'Proveedores') : undefined
    })), [clientesProveedores]
  );

  // departamentos now loaded dynamically from state

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Transacción Financiera Unificada</DialogTitle>
        </DialogHeader>

        {/* Validation Alerts */}
        {validationErrors.length > 0 && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-2">Errores de validación:</div>
              <ul className="list-disc list-inside text-sm space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Fecha */}
              <FormField
                control={form.control}
                name="fecha"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
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

              {/* Sucursal */}
              <FormField
                control={form.control}
                name="sucursal_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sucursal</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar sucursal" />
                        </SelectTrigger>
                      </FormControl>
                       <SelectContent className="max-h-48 overflow-y-auto">
                        {dataLoading.sucursales ? (
                          <SelectItem value="loading" disabled>
                            <div className="flex items-center">
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Cargando sucursales...
                            </div>
                          </SelectItem>
                        ) : (
                          sucursales.filter(item => item.id && item.id.trim() !== '').map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.nombre}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Empresa/Proyecto */}
              <FormField
                control={form.control}
                name="empresa_proyecto_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa / Proyecto</FormLabel>
                    <HookFormCombobox
                      items={proyectosComboboxItems}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Seleccionar proyecto"
                      searchPlaceholder="Buscar proyecto..."
                      emptyText="No se encontraron proyectos."
                      loading={dataLoading.proyectos}
                      searchFields={['label', 'searchText']}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tipo de Movimiento */}
              <FormField
                control={form.control}
                name="tipo_movimiento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Movimiento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                       <SelectContent className="max-h-48 overflow-y-auto">
                        <SelectItem value="ingreso">Ingreso</SelectItem>
                        <SelectItem value="egreso">Egreso</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Monto */}
              <FormField
                control={form.control}
                name="monto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto</FormLabel>
                    <FormControl>
                      <CurrencyInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="0.00"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Departamento */}
              <FormField
                control={form.control}
                name="departamento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Departamento</FormLabel>
                     <HookFormCombobox
                        items={departamentosComboboxItems}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Seleccionar departamento"
                        searchPlaceholder="Buscar departamento..."
                        emptyText="No se encontraron departamentos."
                        loading={dataLoading.departamentos}
                        searchFields={['label']}
                      />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Mayor */}
              <FormField
                control={form.control}
                name="mayor_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mayor</FormLabel>
                    <HookFormCombobox
                      items={mayoresComboboxItems}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Seleccionar mayor"
                      searchPlaceholder="Buscar por código o nombre..."
                      emptyText="No se encontraron mayores."
                      disabled={!watchedDepartamento}
                      loading={dataLoading.mayores}
                      searchFields={['label', 'codigo', 'searchText']}
                      showCodes={true}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Partida */}
              <FormField
                control={form.control}
                name="partida_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Partidas</FormLabel>
                    <HookFormCombobox
                      items={partidasComboboxItems}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Seleccionar partida"
                      searchPlaceholder="Buscar por código o nombre..."
                      emptyText="No se encontraron partidas."
                      disabled={!watchedMayorId}
                      loading={dataLoading.partidas}
                      searchFields={['label', 'codigo', 'searchText']}
                      showCodes={true}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Subpartida */}
              <FormField
                control={form.control}
                name="subpartida_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subpartidas</FormLabel>
                    <HookFormCombobox
                      items={subpartidasComboboxItems}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Seleccionar subpartida"
                      searchPlaceholder="Buscar por código o nombre..."
                      emptyText="No se encontraron subpartidas."
                      disabled={!watchedPartidaId}
                      loading={dataLoading.subpartidas}
                      searchFields={['label', 'codigo', 'searchText']}
                      showCodes={true}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Cliente/Proveedor */}
              <FormField
                control={form.control}
                name="cliente_proveedor_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente / Proveedor</FormLabel>
                    <HookFormCombobox
                      items={clientesProveedoresComboboxItems}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Seleccionar cliente o proveedor"
                      searchPlaceholder="Buscar cliente o proveedor..."
                      emptyText="No se encontraron clientes o proveedores."
                      loading={dataLoading.clientes}
                      searchFields={['label', 'searchText']}
                      maxHeight="400px"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tiene Factura */}
              <FormField
                control={form.control}
                name="tiene_factura"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Cuenta con factura</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {/* Folio Factura */}
              {watchedTieneFactura && (
                <FormField
                  control={form.control}
                  name="folio_factura"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Folio de Factura</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ingrese folio de factura" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Description Toggle */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDescription(!showDescription)}
              >
                {showDescription ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showDescription ? "Ocultar" : "Mostrar"} Descripción
              </Button>
            </div>

            {/* Description */}
            {showDescription && (
              <FormField
                control={form.control}
                name="descripcion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Descripción del movimiento..."
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-2">
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
                disabled={loading || validationErrors.length > 0}
                className="min-w-[140px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Guardando...
                  </>
                ) : (
                  "Guardar Transacción"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}