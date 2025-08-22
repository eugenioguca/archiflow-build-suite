import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit, Trash2 } from "lucide-react";
import { ChartOfAccountsExcelManager } from "./ChartOfAccountsExcelManager";

interface Mayor {
  id: string;
  departamento: string;
  codigo: string;
  nombre: string;
  activo: boolean;
}

interface Partida {
  id: string;
  mayor_id: string;
  codigo: string;
  nombre: string;
  activo: boolean;
  chart_of_accounts_mayor?: { codigo: string; nombre: string };
}

interface Subpartida {
  id: string;
  partida_id: string | null;
  codigo: string;
  nombre: string;
  activo: boolean;
  es_global?: boolean;
  departamento_aplicable?: string;
  chart_of_accounts_partidas?: { codigo: string; nombre: string };
}

interface Departamento {
  id: string;
  departamento: string;
  activo: boolean;
}

interface DeleteResult {
  success: boolean;
  message?: string;
  error?: string;
}

export const ChartOfAccountsManager = forwardRef<{ refreshData: () => void }, {}>((props, ref) => {
  const [activeTab, setActiveTab] = useState("departamentos");
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [mayores, setMayores] = useState<Mayor[]>([]);
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [subpartidas, setSubpartidas] = useState<Subpartida[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [departamentoDialog, setDepartamentoDialog] = useState(false);
  const [mayorDialog, setMayorDialog] = useState(false);
  const [partidaDialog, setPartidaDialog] = useState(false);
  const [subpartidaDialog, setSubpartidaDialog] = useState(false);
  
  // Edit states
  const [editingDepartamento, setEditingDepartamento] = useState<Departamento | null>(null);
  const [editingMayor, setEditingMayor] = useState<Mayor | null>(null);
  const [editingPartida, setEditingPartida] = useState<Partida | null>(null);
  const [editingSubpartida, setEditingSubpartida] = useState<Subpartida | null>(null);

  // Dynamic departments loaded from database
  const departamentosOptions = departamentos.map(dept => ({
    value: dept.departamento,
    label: dept.departamento.charAt(0).toUpperCase() + dept.departamento.slice(1).replace(/_/g, ' ')
  }));

  useEffect(() => {
    loadData();
  }, []);

  useImperativeHandle(ref, () => ({
    refreshData: loadData,
  }));

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadDepartamentos(), loadMayores(), loadPartidas(), loadSubpartidas()]);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadDepartamentos = async () => {
    const { data } = await supabase
      .from("chart_of_accounts_departamentos")
      .select("*")
      .order("departamento");
    
    if (data) setDepartamentos(data);
  };

  const loadMayores = async () => {
    const { data } = await supabase
      .from("chart_of_accounts_mayor")
      .select("*")
      .order("codigo");
    
    if (data) setMayores(data);
  };

  const loadPartidas = async () => {
    const { data } = await supabase
      .from("chart_of_accounts_partidas")
      .select("*, chart_of_accounts_mayor(codigo, nombre)")
      .order("codigo");
    
    if (data) setPartidas(data);
  };

  const loadSubpartidas = async () => {
    const { data } = await supabase
      .from("chart_of_accounts_subpartidas")
      .select("*, chart_of_accounts_partidas(codigo, nombre)")
      .order("es_global desc, codigo");
    
    if (data) setSubpartidas(data);
  };

  // Delete functions with validation
  const deleteDepartamento = async (id: string) => {
    try {
      const { data: result, error } = await supabase.rpc(
        'safe_delete_chart_account',
        { table_name: 'chart_of_accounts_departamentos', record_id: id }
      );

      if (error) throw error;

      const typedResult = result as unknown as DeleteResult;
      if (typedResult?.success) {
        toast.success(typedResult.message || "Departamento eliminado exitosamente");
        loadDepartamentos();
      } else {
        toast.error(typedResult?.error || "Error al eliminar departamento");
      }
    } catch (error: any) {
      console.error('Error deleting departamento:', error);
      toast.error("Error al eliminar departamento: " + error.message);
    }
  };

  const deleteMayor = async (id: string) => {
    try {
      const { data: result, error } = await supabase.rpc(
        'safe_delete_chart_account',
        { table_name: 'chart_of_accounts_mayor', record_id: id }
      );

      if (error) throw error;

      const typedResult = result as unknown as DeleteResult;
      if (typedResult?.success) {
        toast.success(typedResult.message || "Mayor eliminado exitosamente");
        loadMayores();
      } else {
        toast.error(typedResult?.error || "Error al eliminar mayor");
      }
    } catch (error: any) {
      console.error('Error deleting mayor:', error);
      toast.error("Error al eliminar mayor: " + error.message);
    }
  };

  const deletePartida = async (id: string) => {
    try {
      const { data: result, error } = await supabase.rpc(
        'safe_delete_chart_account',
        { table_name: 'chart_of_accounts_partidas', record_id: id }
      );

      if (error) throw error;

      const typedResult = result as unknown as DeleteResult;
      if (typedResult?.success) {
        toast.success(typedResult.message || "Partida eliminada exitosamente");
        loadPartidas();
      } else {
        toast.error(typedResult?.error || "Error al eliminar partida");
      }
    } catch (error: any) {
      console.error('Error deleting partida:', error);
      toast.error("Error al eliminar partida: " + error.message);
    }
  };

  const deleteSubpartida = async (id: string) => {
    try {
      const { data: result, error } = await supabase.rpc(
        'safe_delete_chart_account',
        { table_name: 'chart_of_accounts_subpartidas', record_id: id }
      );

      if (error) throw error;

      const typedResult = result as unknown as DeleteResult;
      if (typedResult?.success) {
        toast.success(typedResult.message || "Subpartida eliminada exitosamente");
        loadSubpartidas();
      } else {
        toast.error(typedResult?.error || "Error al eliminar subpartida");
      }
    } catch (error: any) {
      console.error('Error deleting subpartida:', error);
      toast.error("Error al eliminar subpartida: " + error.message);
    }
  };

  // Departamento Form Component
  const DepartamentoForm = ({ departamento }: { departamento?: Departamento }) => {
    const form = useForm({
      defaultValues: {
        departamento: departamento?.departamento || "",
        activo: departamento?.activo ?? true,
      },
    });

    const onSubmit = async (data: any) => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
          .single();

        if (departamento) {
          // Update existing
          const { error } = await supabase
            .from("chart_of_accounts_departamentos")
            .update(data)
            .eq("id", departamento.id);

          if (error) throw error;
          toast.success("Departamento actualizado exitosamente");
          setEditingDepartamento(null);
        } else {
          // Create new
          const { error } = await supabase
            .from("chart_of_accounts_departamentos")
            .insert([{ ...data, created_by: profile?.id }]);

          if (error) throw error;
          toast.success("Departamento creado exitosamente");
        }

        setDepartamentoDialog(false);
        form.reset();
        loadDepartamentos();
      } catch (error: any) {
        toast.error(`Error al ${departamento ? 'actualizar' : 'crear'} departamento: ` + error.message);
      }
    };

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="departamento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Departamento</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Nombre del departamento" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="activo"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Activo</FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => {
              setDepartamentoDialog(false);
              setEditingDepartamento(null);
            }}>
              Cancelar
            </Button>
            <Button type="submit">{departamento ? 'Actualizar' : 'Guardar'}</Button>
          </div>
        </form>
      </Form>
    );
  };

  // Mayor Form Component
  const MayorForm = ({ mayor }: { mayor?: Mayor }) => {
    const form = useForm({
      defaultValues: {
        departamento: mayor?.departamento || "",
        codigo: mayor?.codigo || "",
        nombre: mayor?.nombre || "",
        activo: mayor?.activo ?? true,
      },
    });

    const onSubmit = async (data: any) => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
          .single();

        if (mayor) {
          // Update existing
          const { error } = await supabase
            .from("chart_of_accounts_mayor")
            .update(data)
            .eq("id", mayor.id);

          if (error) throw error;
          toast.success("Mayor actualizado exitosamente");
          setEditingMayor(null);
        } else {
          // Create new
          const { error } = await supabase
            .from("chart_of_accounts_mayor")
            .insert([{ ...data, created_by: profile?.id }]);

          if (error) throw error;
          toast.success("Mayor creado exitosamente");
        }

        setMayorDialog(false);
        form.reset();
        loadMayores();
      } catch (error: any) {
        toast.error(`Error al ${mayor ? 'actualizar' : 'crear'} mayor: ` + error.message);
      }
    };

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    {departamentosOptions.map((dept) => (
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
          <FormField
            control={form.control}
            name="codigo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ej: VEN001" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Nombre del mayor" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="activo"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Activo</FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => {
              setMayorDialog(false);
              setEditingMayor(null);
            }}>
              Cancelar
            </Button>
            <Button type="submit">{mayor ? 'Actualizar' : 'Guardar'}</Button>
          </div>
        </form>
      </Form>
    );
  };

  // Partida Form Component
  const PartidaForm = ({ partida }: { partida?: Partida }) => {
    const form = useForm({
      defaultValues: {
        mayor_id: partida?.mayor_id || "",
        codigo: partida?.codigo || "",
        nombre: partida?.nombre || "",
        activo: partida?.activo ?? true,
      },
    });

    const onSubmit = async (data: any) => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
          .single();

        if (partida) {
          // Update existing
          const { error } = await supabase
            .from("chart_of_accounts_partidas")
            .update(data)
            .eq("id", partida.id);

          if (error) throw error;
          toast.success("Partida actualizada exitosamente");
          setEditingPartida(null);
        } else {
          // Create new
          const { error } = await supabase
            .from("chart_of_accounts_partidas")
            .insert([{ ...data, created_by: profile?.id }]);

          if (error) throw error;
          toast.success("Partida creada exitosamente");
        }

        setPartidaDialog(false);
        form.reset();
        loadPartidas();
      } catch (error: any) {
        toast.error(`Error al ${partida ? 'actualizar' : 'crear'} partida: ` + error.message);
      }
    };

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="mayor_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mayor</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar mayor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {mayores.filter(m => m.activo).map((mayor) => (
                      <SelectItem key={mayor.id} value={mayor.id}>
                        {mayor.codigo} - {mayor.nombre}
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
            name="codigo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ej: VEN001-001" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Nombre de la partida" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="activo"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Activo</FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => {
              setPartidaDialog(false);
              setEditingPartida(null);
            }}>
              Cancelar
            </Button>
            <Button type="submit">{partida ? 'Actualizar' : 'Guardar'}</Button>
          </div>
        </form>
      </Form>
    );
  };

  // Subpartida Form Component
  const SubpartidaForm = ({ subpartida }: { subpartida?: Subpartida }) => {
    const form = useForm({
      defaultValues: {
        partida_id: subpartida?.partida_id || "",
        codigo: subpartida?.codigo || "",
        nombre: subpartida?.nombre || "",
        activo: subpartida?.activo ?? true,
      },
    });

    const onSubmit = async (data: any) => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
          .single();

        if (subpartida) {
          // Update existing
          const { error } = await supabase
            .from("chart_of_accounts_subpartidas")
            .update(data)
            .eq("id", subpartida.id);

          if (error) throw error;
          toast.success("Subpartida actualizada exitosamente");
          setEditingSubpartida(null);
        } else {
          // Create new
          const { error } = await supabase
            .from("chart_of_accounts_subpartidas")
            .insert([{ ...data, created_by: profile?.id }]);

          if (error) throw error;
          toast.success("Subpartida creada exitosamente");
        }

        setSubpartidaDialog(false);
        form.reset();
        loadSubpartidas();
      } catch (error: any) {
        toast.error(`Error al ${subpartida ? 'actualizar' : 'crear'} subpartida: ` + error.message);
      }
    };

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="partida_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Partida</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar partida" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {partidas.filter(p => p.activo).map((partida) => (
                      <SelectItem key={partida.id} value={partida.id}>
                        {partida.codigo} - {partida.nombre}
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
            name="codigo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ej: VEN001-001-001" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Nombre de la subpartida" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="activo"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Activo</FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => {
              setSubpartidaDialog(false);
              setEditingSubpartida(null);
            }}>
              Cancelar
            </Button>
            <Button type="submit">{subpartida ? 'Actualizar' : 'Guardar'}</Button>
          </div>
        </form>
      </Form>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Cargando catálogo de cuentas...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="departamentos">Departamentos</TabsTrigger>
          <TabsTrigger value="mayores">Mayores</TabsTrigger>
          <TabsTrigger value="partidas">Partidas</TabsTrigger>
          <TabsTrigger value="subpartidas">Subpartidas</TabsTrigger>
          <TabsTrigger value="excel">Excel</TabsTrigger>
        </TabsList>

        <TabsContent value="departamentos" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Catálogo de Departamentos</CardTitle>
              <Dialog open={departamentoDialog || !!editingDepartamento} onOpenChange={(open) => {
                if (!open) {
                  setDepartamentoDialog(false);
                  setEditingDepartamento(null);
                }
              }}>
                <DialogTrigger asChild>
                  <Button onClick={() => setDepartamentoDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Departamento
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingDepartamento ? 'Editar Departamento' : 'Crear Nuevo Departamento'}</DialogTitle>
                  </DialogHeader>
                  <DepartamentoForm departamento={editingDepartamento || undefined} />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departamentos.map((departamento) => (
                    <TableRow key={departamento.id}>
                      <TableCell>{departamento.departamento}</TableCell>
                      <TableCell>
                        <Badge variant={departamento.activo ? "default" : "secondary"}>
                          {departamento.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setEditingDepartamento(departamento)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar Departamento?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Estás seguro de que deseas eliminar el departamento "{departamento.departamento}"? Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteDepartamento(departamento.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mayores" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Catálogo de Mayores</CardTitle>
              <Dialog open={mayorDialog || !!editingMayor} onOpenChange={(open) => {
                if (!open) {
                  setMayorDialog(false);
                  setEditingMayor(null);
                }
              }}>
                <DialogTrigger asChild>
                  <Button onClick={() => setMayorDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Mayor
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingMayor ? 'Editar Mayor' : 'Crear Nuevo Mayor'}</DialogTitle>
                  </DialogHeader>
                  <MayorForm mayor={editingMayor || undefined} />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mayores.map((mayor) => (
                    <TableRow key={mayor.id}>
                      <TableCell className="font-mono">{mayor.codigo}</TableCell>
                      <TableCell>{mayor.nombre}</TableCell>
                      <TableCell className="capitalize">
                        {mayor.departamento.replace("_", " ")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={mayor.activo ? "default" : "secondary"}>
                          {mayor.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setEditingMayor(mayor)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar Mayor?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Estás seguro de que deseas eliminar el mayor "{mayor.nombre}"? Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteMayor(mayor.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="partidas" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Catálogo de Partidas</CardTitle>
              <Dialog open={partidaDialog || !!editingPartida} onOpenChange={(open) => {
                if (!open) {
                  setPartidaDialog(false);
                  setEditingPartida(null);
                }
              }}>
                <DialogTrigger asChild>
                  <Button onClick={() => setPartidaDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Partida
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingPartida ? 'Editar Partida' : 'Crear Nueva Partida'}</DialogTitle>
                  </DialogHeader>
                  <PartidaForm partida={editingPartida || undefined} />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Mayor</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partidas.map((partida) => (
                    <TableRow key={partida.id}>
                      <TableCell className="font-mono">{partida.codigo}</TableCell>
                      <TableCell>{partida.nombre}</TableCell>
                      <TableCell>
                        {partida.chart_of_accounts_mayor?.codigo} - {partida.chart_of_accounts_mayor?.nombre}
                      </TableCell>
                      <TableCell>
                        <Badge variant={partida.activo ? "default" : "secondary"}>
                          {partida.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setEditingPartida(partida)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar Partida?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Estás seguro de que deseas eliminar la partida "{partida.nombre}"? Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deletePartida(partida.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subpartidas" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Catálogo de Subpartidas</CardTitle>
              <Dialog open={subpartidaDialog || !!editingSubpartida} onOpenChange={(open) => {
                if (!open) {
                  setSubpartidaDialog(false);
                  setEditingSubpartida(null);
                }
              }}>
                <DialogTrigger asChild>
                  <Button onClick={() => setSubpartidaDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Subpartida
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingSubpartida ? 'Editar Subpartida' : 'Crear Nueva Subpartida'}</DialogTitle>
                  </DialogHeader>
                  <SubpartidaForm subpartida={editingSubpartida || undefined} />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Partida</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subpartidas.map((subpartida) => (
                    <TableRow key={subpartida.id}>
                      <TableCell className="font-mono">{subpartida.codigo}</TableCell>
                      <TableCell>{subpartida.nombre}</TableCell>
                       <TableCell>
                         {subpartida.es_global ? (
                           <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                             Global - {subpartida.departamento_aplicable}
                           </Badge>
                         ) : (
                           <>
                             {subpartida.chart_of_accounts_partidas?.codigo} - {subpartida.chart_of_accounts_partidas?.nombre}
                           </>
                         )}
                       </TableCell>
                      <TableCell>
                        <Badge variant={subpartida.activo ? "default" : "secondary"}>
                          {subpartida.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setEditingSubpartida(subpartida)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar Subpartida?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Estás seguro de que deseas eliminar la subpartida "{subpartida.nombre}"? Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteSubpartida(subpartida.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="excel" className="space-y-4">
          <ChartOfAccountsExcelManager onImportComplete={loadData} />
        </TabsContent>
      </Tabs>
    </div>
  );
});

ChartOfAccountsManager.displayName = "ChartOfAccountsManager";