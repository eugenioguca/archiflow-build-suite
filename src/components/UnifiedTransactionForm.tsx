import { useState, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

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
  
  // Data states
  const [sucursales, setSucursales] = useState<Option[]>([]);
  const [proyectos, setProyectos] = useState<Option[]>([]);
  const [mayores, setMayores] = useState<Option[]>([]);
  const [partidas, setPartidas] = useState<Option[]>([]);
  const [subpartidas, setSubpartidas] = useState<Option[]>([]);
  const [clientesProveedores, setClientesProveedores] = useState<Option[]>([]);

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

  // Load initial data
  useEffect(() => {
    if (open) {
      loadSucursales();
      loadProyectos();
      loadClientesProveedores();
    }
  }, [open]);

  // Load dependent data
  useEffect(() => {
    if (watchedDepartamento) {
      loadMayores(watchedDepartamento);
      form.setValue("mayor_id", undefined);
      form.setValue("partida_id", undefined);
      form.setValue("subpartida_id", undefined);
    }
  }, [watchedDepartamento]);

  useEffect(() => {
    if (watchedMayorId) {
      loadPartidas(watchedMayorId);
      form.setValue("partida_id", undefined);
      form.setValue("subpartida_id", undefined);
    }
  }, [watchedMayorId]);

  useEffect(() => {
    if (watchedPartidaId) {
      loadSubpartidas(watchedPartidaId);
      form.setValue("subpartida_id", undefined);
    }
  }, [watchedPartidaId]);

  const loadSucursales = async () => {
    const { data } = await supabase
      .from("branch_offices")
      .select("id, name")
      .eq("active", true);
    
    if (data) {
      const filteredData = data.filter(item => item.id && item.id.trim() !== '');
      console.log("Sucursales data:", filteredData);
      setSucursales(filteredData.map(item => ({ id: item.id, nombre: item.name })));
    }
  };

  const loadProyectos = async () => {
    const { data } = await supabase
      .from("client_projects")
      .select("id, project_name, client_id, clients(full_name)")
      .order("project_name");
    
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
  };

  const loadMayores = async (departamento: string) => {
    const { data } = await supabase
      .from("chart_of_accounts_mayor")
      .select("id, nombre, codigo")
      .eq("departamento", departamento)
      .eq("activo", true)
      .order("codigo");
    
    if (data) {
      const filteredData = data.filter(item => item.id && item.id.trim() !== '');
      console.log("Mayores data:", filteredData);
      setMayores(filteredData.map(item => ({ 
        id: item.id, 
        nombre: `${item.codigo} - ${item.nombre}`,
        codigo: item.codigo 
      })));
    }
  };

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
    if (partida?.chart_of_accounts_mayor?.departamento === 'construccion') {
      const { data: globalSubpartidas } = await supabase
        .from("chart_of_accounts_subpartidas")
        .select("id, nombre, codigo")
        .eq("es_global", true)
        .eq("departamento_aplicable", "construccion")
        .eq("activo", true)
        .order("codigo");

      if (globalSubpartidas) {
        allSubpartidas = [
          ...allSubpartidas,
          ...globalSubpartidas.map(item => ({
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

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      // Get current user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile) {
        toast.error("Error al obtener perfil de usuario");
        return;
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

      const { error } = await supabase
        .from("unified_financial_transactions")
        .insert(transactionData);

      if (error) throw error;

      toast.success("Transacción creada exitosamente");
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast.error("Error al crear transacción: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const departamentos = [
    { value: "ventas", label: "Ventas" },
    { value: "diseño", label: "Diseño" },
    { value: "construccion", label: "Construcción" },
    { value: "finanzas", label: "Finanzas" },
    { value: "contabilidad", label: "Contabilidad" },
    { value: "recursos_humanos", label: "Recursos Humanos" },
    { value: "direccion_general", label: "Dirección General" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Transacción Financiera Unificada</DialogTitle>
        </DialogHeader>

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
                      <SelectContent>
                        {sucursales.filter(item => item.id && item.id.trim() !== '').map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.nombre}
                          </SelectItem>
                        ))}
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar proyecto" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {proyectos.filter(item => item.id && item.id.trim() !== '').map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      <SelectContent>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar departamento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departamentos.map((dept) => (
                          <SelectItem key={dept.value} value={dept.value}>
                            {dept.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!watchedDepartamento}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar mayor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {mayores.filter(item => item.id && item.id.trim() !== '').map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!watchedMayorId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar partida" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {partidas.filter(item => item.id && item.id.trim() !== '').map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!watchedPartidaId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar subpartida" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subpartidas.filter(item => item.id && item.id.trim() !== '').map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar cliente o proveedor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clientesProveedores.filter(item => item.id && item.id.trim() !== '').map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : "Guardar Transacción"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}