import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DatePicker } from '@/components/DatePicker';
import { CurrencyInput } from '@/components/CurrencyInput';
import { SearchableCombobox, type SearchableComboboxItem } from '@/components/ui/searchable-combobox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';

// Schema de validación
const formSchema = z.object({
  fecha: z.date({ required_error: 'La fecha es requerida' }),
  monto: z.number().min(0.01, 'El monto debe ser mayor a 0'),
  descripcion: z.string().optional(),
  sucursal_id: z.string().min(1, 'La sucursal es requerida'),
  proyecto_id: z.string().min(1, 'El proyecto es requerido'),
  departamento_id: z.string().min(1, 'El departamento es requerido'),
  mayor_id: z.string().min(1, 'El mayor es requerido'),
  partida_id: z.string().min(1, 'La partida es requerida'),
  subpartida_id: z.string().optional(),
  cliente_proveedor_id: z.string().optional(),
  tiene_factura: z.boolean().default(false),
  folio_factura: z.string().optional(),
  tipo_movimiento: z.string().default('ingreso'),
});

type FormData = z.infer<typeof formSchema>;

interface UnifiedTransactionBulkFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Option {
  value: string;
  label: string;
  codigo?: string;
}

export function UnifiedTransactionBulkForm({ open, onOpenChange }: UnifiedTransactionBulkFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  
  // Estados para las opciones de los dropdowns
  const [sucursales, setSucursales] = useState<SearchableComboboxItem[]>([]);
  const [proyectos, setProyectos] = useState<SearchableComboboxItem[]>([]);
  const [departamentos, setDepartamentos] = useState<SearchableComboboxItem[]>([]);
  const [mayores, setMayores] = useState<SearchableComboboxItem[]>([]);
  const [partidas, setPartidas] = useState<SearchableComboboxItem[]>([]);
  const [subpartidas, setSubpartidas] = useState<SearchableComboboxItem[]>([]);
  const [clientesProveedores, setClientesProveedores] = useState<SearchableComboboxItem[]>([]);
  
  // Estados de carga
  const [loading, setLoading] = useState({
    sucursales: false,
    proyectos: false,
    departamentos: false,
    mayores: false,
    partidas: false,
    subpartidas: false,
    clientesProveedores: false,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fecha: new Date(),
      monto: 0,
      descripcion: '',
      tiene_factura: false,
      folio_factura: '',
      tipo_movimiento: 'ingreso',
    },
  });

  // Función para cargar datos iniciales
  const loadInitialData = async () => {
    await Promise.all([
      loadSucursales(),
      loadProyectos(),
      loadDepartamentos(),
      loadClientesProveedores()
    ]);
  };

  // Cargar sucursales
  const loadSucursales = async () => {
    setLoading(prev => ({ ...prev, sucursales: true }));
    try {
      const { data, error } = await supabase
        .from('branch_offices')
        .select('id, name')
        .eq('active', true)
        .order('name');

      if (error) throw error;

      const options = data?.map(item => ({
        value: item.id,
        label: item.name,
        codigo: item.name // Usar nombre en lugar de ID para búsqueda
      })) || [];

      setSucursales(options);
    } catch (error) {
      console.error('Error loading sucursales:', error);
    } finally {
      setLoading(prev => ({ ...prev, sucursales: false }));
    }
  };

  // Cargar proyectos
  const loadProyectos = async () => {
    setLoading(prev => ({ ...prev, proyectos: true }));
    try {
      const { data, error } = await supabase
        .from('client_projects')
        .select('id, project_name, client_id, clients(full_name)')
        .order('project_name');

      if (error) throw error;

      const options = data?.map(item => ({
        value: item.id,
        label: `${item.project_name} - ${item.clients?.full_name || 'Sin cliente'}`,
        codigo: item.project_name // Usar nombre del proyecto para búsqueda
      })) || [];

      setProyectos(options);
    } catch (error) {
      console.error('Error loading proyectos:', error);
    } finally {
      setLoading(prev => ({ ...prev, proyectos: false }));
    }
  };

  // Cargar departamentos
  const loadDepartamentos = async () => {
    setLoading(prev => ({ ...prev, departamentos: true }));
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts_departamentos')
        .select('departamento')
        .eq('activo', true)
        .order('departamento');

      if (error) throw error;

      // Evitar duplicados usando Set
      const uniqueDepartamentos = [...new Set(data?.map(item => item.departamento) || [])];
      
      const options = uniqueDepartamentos.map(departamento => ({
        value: departamento,
        label: departamento,
        codigo: departamento
      }));

      setDepartamentos(options);
    } catch (error) {
      console.error('Error loading departamentos:', error);
    } finally {
      setLoading(prev => ({ ...prev, departamentos: false }));
    }
  };

  // Cargar mayores basado en departamento seleccionado
  const loadMayores = async (departamentoId: string) => {
    setLoading(prev => ({ ...prev, mayores: true }));
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts_mayor')
        .select('id, nombre, codigo')
        .eq('departamento', departamentoId)
        .eq('activo', true)
        .order('codigo');

      if (error) throw error;

      const options = data?.map(item => ({
        value: item.id,
        label: item.nombre,
        codigo: item.codigo
      })) || [];

      setMayores(options);
    } catch (error) {
      console.error('Error loading mayores:', error);
    } finally {
      setLoading(prev => ({ ...prev, mayores: false }));
    }
  };

  // Cargar partidas basado en mayor seleccionado
  const loadPartidas = async (mayorId: string) => {
    setLoading(prev => ({ ...prev, partidas: true }));
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts_partidas')
        .select('id, nombre, codigo')
        .eq('mayor_id', mayorId)
        .eq('activo', true)
        .order('codigo');

      if (error) throw error;

      const options = data?.map(item => ({
        value: item.id,
        label: item.nombre,
        codigo: item.codigo
      })) || [];

      setPartidas(options);
    } catch (error) {
      console.error('Error loading partidas:', error);
    } finally {
      setLoading(prev => ({ ...prev, partidas: false }));
    }
  };

  // Cargar subpartidas basado en partida seleccionada
  const loadSubpartidas = async (partidaId: string) => {
    setLoading(prev => ({ ...prev, subpartidas: true }));
    try {
      // Primero obtener el departamento de la partida seleccionada
      const { data: partidaData, error: partidaError } = await supabase
        .from('chart_of_accounts_partidas')
        .select(`
          mayor_id,
          chart_of_accounts_mayor!inner(departamento)
        `)
        .eq('id', partidaId)
        .single();

      if (partidaError) throw partidaError;

      const departamento = partidaData?.chart_of_accounts_mayor?.departamento;

      // Cargar subpartidas dependientes de la partida
      const { data: dependientes, error: dependientesError } = await supabase
        .from('chart_of_accounts_subpartidas')
        .select('id, nombre, codigo')
        .eq('partida_id', partidaId)
        .eq('activo', true)
        .order('codigo');

      if (dependientesError) throw dependientesError;

      // Cargar subpartidas universales del mismo departamento
      const { data: universales, error: universalesError } = await supabase
        .from('chart_of_accounts_subpartidas')
        .select('id, nombre, codigo')
        .eq('es_global', true)
        .eq('departamento_aplicable', departamento)
        .eq('activo', true)
        .order('codigo');

      if (universalesError) throw universalesError;

      // Combinar ambos tipos de subpartidas
      const dependientesOptions = dependientes?.map(item => ({
        value: item.id,
        label: item.nombre,
        codigo: item.codigo
      })) || [];

      const universalesOptions = universales?.map(item => ({
        value: item.id,
        label: `${item.nombre} (Universal)`,
        codigo: item.codigo
      })) || [];

      // Combinar y ordenar por código
      const allOptions = [...dependientesOptions, ...universalesOptions]
        .sort((a, b) => a.codigo.localeCompare(b.codigo));

      setSubpartidas(allOptions);
    } catch (error) {
      console.error('Error loading subpartidas:', error);
    } finally {
      setLoading(prev => ({ ...prev, subpartidas: false }));
    }
  };

  // Cargar clientes/proveedores
  const loadClientesProveedores = async () => {
    setLoading(prev => ({ ...prev, clientesProveedores: true }));
    try {
      // Load clients
      const { data: clients } = await supabase
        .from('clients')
        .select('id, full_name')
        .order('full_name');

      // Load suppliers
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('id, company_name')
        .order('company_name');

      const combined: SearchableComboboxItem[] = [];
      
      if (clients) {
        clients.forEach(client => {
          combined.push({
            value: `client_${client.id}`,
            label: `${client.full_name} (Cliente)`,
            codigo: client.full_name // Usar nombre para búsqueda en lugar de ID
          });
        });
      }

      if (suppliers) {
        suppliers.forEach(supplier => {
          combined.push({
            value: `supplier_${supplier.id}`,
            label: `${supplier.company_name} (Proveedor)`,
            codigo: supplier.company_name // Usar nombre para búsqueda en lugar de ID
          });
        });
      }

      setClientesProveedores(combined);
    } catch (error) {
      console.error('Error loading clientes/proveedores:', error);
    } finally {
      setLoading(prev => ({ ...prev, clientesProveedores: false }));
    }
  };

  // Efectos para cargar datos dependientes
  useEffect(() => {
    if (open) {
      loadInitialData();
    }
  }, [open]);

  // Watcher para departamento
  const departamentoId = form.watch('departamento_id');
  useEffect(() => {
    if (departamentoId) {
      loadMayores(departamentoId);
      // Reset dependent fields
      form.setValue('mayor_id', '');
      form.setValue('partida_id', '');
      form.setValue('subpartida_id', '');
      setMayores([]);
      setPartidas([]);
      setSubpartidas([]);
    }
  }, [departamentoId, form]);

  // Watcher para mayor
  const mayorId = form.watch('mayor_id');
  useEffect(() => {
    if (mayorId) {
      loadPartidas(mayorId);
      // Reset dependent fields
      form.setValue('partida_id', '');
      form.setValue('subpartida_id', '');
      setPartidas([]);
      setSubpartidas([]);
    }
  }, [mayorId, form]);

  // Watcher para partida
  const partidaId = form.watch('partida_id');
  useEffect(() => {
    if (partidaId) {
      loadSubpartidas(partidaId);
      // Reset dependent field
      form.setValue('subpartida_id', '');
      setSubpartidas([]);
    }
  }, [partidaId, form]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    
    try {
      // Obtener información del usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('Error al obtener perfil de usuario');
      }

      // Preparar datos para insertar
      const transactionData = {
        fecha: format(data.fecha, 'yyyy-MM-dd'),
        tipo_movimiento: data.tipo_movimiento || 'ingreso',
        monto: data.monto,
        sucursal_id: data.sucursal_id,
        proyecto_id: data.proyecto_id,
        departamento: data.departamento_id, // Use departamento string value
        mayor_id: data.mayor_id,
        partida_id: data.partida_id,
        subpartida_id: data.subpartida_id || null,
        cliente_proveedor_id: data.cliente_proveedor_id || null,
        tiene_factura: data.tiene_factura,
        folio_factura: data.tiene_factura ? data.folio_factura : null,
        descripcion: data.descripcion || null,
        created_by: profile.id,
        referencia_unica: `BULK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('unified_financial_transactions')
        .insert(transactionData);

      if (error) {
        throw error;
      }

      toast({
        title: "Éxito",
        description: "Transacción de carga creada correctamente",
      });

      // Reset form and close dialog
      form.reset();
      onOpenChange(false);
      
    } catch (error: any) {
      console.error('Error creating transaction:', error);
      toast({
        title: "Error",
        description: error.message || "Error al crear la transacción",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle keyboard and scroll events for SearchableCombobox inside Dialog
  const handleDialogKeyDown = (e: React.KeyboardEvent) => {
    // Check if the event is from SearchableCombobox input or navigation
    const target = e.target as HTMLElement
    const isComboboxInput = target.role === 'combobox' || 
                           target.closest('[role="combobox"]') ||
                           target.hasAttribute('data-no-focus-trap')
    
    if (isComboboxInput) {
      // Allow keyboard events to pass through for SearchableCombobox
      e.stopPropagation()
    }
  }

  const handleDialogWheel = (e: React.WheelEvent) => {
    // Check if wheel event is from SearchableCombobox scroll container
    const target = e.target as HTMLElement
    const isComboboxScroll = target.closest('[data-no-focus-trap]') ||
                            target.classList.contains('overflow-y-auto')
    
    if (isComboboxScroll) {
      // Allow scroll events to pass through for SearchableCombobox
      e.stopPropagation()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        onKeyDown={handleDialogKeyDown}
        onWheel={handleDialogWheel}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            📦 Nueva Carga - Transacción Financiera
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Primera fila: Fecha | Sucursal | Empresa/Proyecto */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="fecha"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha *</FormLabel>
                    <FormControl>
                      <DatePicker 
                        date={field.value} 
                        onDateChange={field.onChange}
                        className="w-full"
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
                    <FormLabel>Sucursal *</FormLabel>
                    <FormControl>
                       <SearchableCombobox
                        items={sucursales}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Seleccionar sucursal..."
                        searchPlaceholder="Buscar sucursal..."
                        loading={loading.sucursales}
                        showCodes={false}
                        searchFields={['label', 'codigo']}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="proyecto_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa/Proyecto *</FormLabel>
                    <FormControl>
                       <SearchableCombobox
                        items={proyectos}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Seleccionar proyecto..."
                        searchPlaceholder="Buscar proyecto..."
                        loading={loading.proyectos}
                        showCodes={false}
                        searchFields={['label', 'codigo']}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Segunda fila: Movimiento | Monto | Departamento */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="tipo_movimiento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Movimiento *</FormLabel>
                    <FormControl>
                       <SearchableCombobox
                         items={[
                           { value: 'ingreso', label: 'Ingreso', codigo: 'Ingreso' },
                           { value: 'egreso', label: 'Egreso', codigo: 'Egreso' }
                         ]}
                         value={field.value as string || 'ingreso'}
                         onValueChange={field.onChange}
                         placeholder="Seleccionar movimiento..."
                         searchPlaceholder="Buscar movimiento..."
                         loading={false}
                         showCodes={false}
                         searchFields={['label', 'codigo']}
                       />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="monto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto *</FormLabel>
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

              <FormField
                control={form.control}
                name="departamento_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Departamento *</FormLabel>
                    <FormControl>
                       <SearchableCombobox
                        items={departamentos}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Seleccionar departamento..."
                        searchPlaceholder="Buscar departamento..."
                        loading={loading.departamentos}
                        showCodes={false}
                        searchFields={['label', 'codigo']}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Tercera fila: Mayor | Partidas | Subpartidas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="mayor_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mayor *</FormLabel>
                    <FormControl>
                      <SearchableCombobox
                        items={mayores}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder={departamentoId ? "Seleccionar mayor..." : "Primero selecciona un departamento"}
                        searchPlaceholder="Buscar mayor..."
                        loading={loading.mayores}
                        disabled={!departamentoId}
                        showCodes={true}
                        searchFields={['label', 'codigo']}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="partida_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Partidas *</FormLabel>
                    <FormControl>
                      <SearchableCombobox
                        items={partidas}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder={mayorId ? "Seleccionar partida..." : "Primero selecciona un mayor"}
                        searchPlaceholder="Buscar partida..."
                        loading={loading.partidas}
                        disabled={!mayorId}
                        showCodes={true}
                        searchFields={['label', 'codigo']}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subpartida_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subpartidas</FormLabel>
                    <FormControl>
                      <SearchableCombobox
                        items={subpartidas}
                        value={field.value || ''}
                        onValueChange={field.onChange}
                        placeholder={partidaId ? "Seleccionar subpartida..." : "Primero selecciona una partida"}
                        searchPlaceholder="Buscar subpartida..."
                        loading={loading.subpartidas}
                        disabled={!partidaId}
                        showCodes={true}
                        searchFields={['label', 'codigo']}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Cliente/Proveedor */}
            <FormField
              control={form.control}
              name="cliente_proveedor_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente/Proveedor (Opcional)</FormLabel>
                  <FormControl>
                     <SearchableCombobox
                       items={clientesProveedores}
                       value={field.value || ''}
                       onValueChange={field.onChange}
                       placeholder="Seleccionar cliente/proveedor..."
                       searchPlaceholder="Buscar cliente/proveedor..."
                       loading={loading.clientesProveedores}
                       showCodes={false}
                       searchFields={['label', 'codigo']}
                     />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quinta fila: Checkbox de facturación */}
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

            {form.watch('tiene_factura') && (
              <FormField
                control={form.control}
                name="folio_factura"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Folio de Factura</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ingresa el folio de la factura"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Sexta fila: Botón de descripción */}
            <div className="space-y-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowDescription(!showDescription)}
                className="flex items-center gap-2 text-sm"
              >
                {showDescription ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                Mostrar Descripción
              </Button>

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
                          placeholder="Descripción opcional de la transacción..."
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Mostrar errores de validación */}
            {Object.keys(form.formState.errors).length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Por favor, completa todos los campos obligatorios marcados con *.
                </AlertDescription>
              </Alert>
            )}

            {/* Botones de acción */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-[140px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Carga'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}