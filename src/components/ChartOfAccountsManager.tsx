import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit, Trash2 } from "lucide-react";

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
  partida_id: string;
  codigo: string;
  nombre: string;
  activo: boolean;
  chart_of_accounts_partidas?: { codigo: string; nombre: string };
}

export function ChartOfAccountsManager() {
  const [activeTab, setActiveTab] = useState("mayores");
  const [mayores, setMayores] = useState<Mayor[]>([]);
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [subpartidas, setSubpartidas] = useState<Subpartida[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [mayorDialog, setMayorDialog] = useState(false);
  const [partidaDialog, setPartidaDialog] = useState(false);
  const [subpartidaDialog, setSubpartidaDialog] = useState(false);

  const departamentos = [
    { value: "ventas", label: "Ventas" },
    { value: "diseño", label: "Diseño" },
    { value: "construccion", label: "Construcción" },
    { value: "finanzas", label: "Finanzas" },
    { value: "contabilidad", label: "Contabilidad" },
    { value: "recursos_humanos", label: "Recursos Humanos" },
    { value: "direccion_general", label: "Dirección General" },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadMayores(), loadPartidas(), loadSubpartidas()]);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
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
      .order("codigo");
    
    if (data) setSubpartidas(data);
  };

  // Mayor Form Component
  const MayorForm = () => {
    const form = useForm({
      defaultValues: {
        departamento: "",
        codigo: "",
        nombre: "",
        activo: true,
      },
    });

    const onSubmit = async (data: any) => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
          .single();

        const { error } = await supabase
          .from("chart_of_accounts_mayor")
          .insert([{ ...data, created_by: profile?.id }]);

        if (error) throw error;

        toast.success("Mayor creado exitosamente");
        setMayorDialog(false);
        form.reset();
        loadMayores();
      } catch (error: any) {
        toast.error("Error al crear mayor: " + error.message);
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
            <Button type="button" variant="outline" onClick={() => setMayorDialog(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="mayores">Mayores</TabsTrigger>
          <TabsTrigger value="partidas">Partidas</TabsTrigger>
          <TabsTrigger value="subpartidas">Subpartidas</TabsTrigger>
        </TabsList>

        <TabsContent value="mayores" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Catálogo de Mayores</CardTitle>
              <Dialog open={mayorDialog} onOpenChange={setMayorDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Mayor
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Mayor</DialogTitle>
                  </DialogHeader>
                  <MayorForm />
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
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Partida
              </Button>
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
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Subpartida
              </Button>
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
                        {subpartida.chart_of_accounts_partidas?.codigo} - {subpartida.chart_of_accounts_partidas?.nombre}
                      </TableCell>
                      <TableCell>
                        <Badge variant={subpartida.activo ? "default" : "secondary"}>
                          {subpartida.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}