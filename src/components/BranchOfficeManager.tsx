import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Plus, Edit, MapPin, Phone, Mail } from "lucide-react";

interface BranchOffice {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state_id?: string;
  phone?: string;
  email?: string;
  manager_id?: string;
  active: boolean;
  states?: {
    name: string;
  };
  profiles?: {
    full_name: string;
  };
}

interface State {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  full_name: string;
  position?: string;
}

export function BranchOfficeManager() {
  const { toast } = useToast();
  const [offices, setOffices] = useState<BranchOffice[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOffice, setEditingOffice] = useState<BranchOffice | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    state_id: "",
    phone: "",
    email: "",
    manager_id: "",
    active: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [officesData, statesData, employeesData] = await Promise.all([
        supabase
          .from("branch_offices")
          .select(`
            *,
            states:state_id (name),
            profiles:manager_id (full_name)
          `)
          .order("name"),
        supabase
          .from("mexican_states")
          .select("*")
          .order("name"),
        supabase
          .from("profiles")
          .select("id, full_name, position")
          .in("role", ["admin", "employee"])
          .order("full_name")
      ]);

      if (officesData.error) throw officesData.error;
      if (statesData.error) throw statesData.error;
      if (employeesData.error) throw employeesData.error;

      setOffices(officesData.data || []);
      setStates(statesData.data || []);
      setEmployees(employeesData.data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingOffice) {
        const { error } = await supabase
          .from("branch_offices")
          .update(formData)
          .eq("id", editingOffice.id);
        
        if (error) throw error;
        
        toast({
          title: "Sucursal actualizada",
          description: "La información ha sido guardada correctamente"
        });
      } else {
        const { error } = await supabase
          .from("branch_offices")
          .insert([formData]);
        
        if (error) throw error;
        
        toast({
          title: "Sucursal creada",
          description: "La nueva sucursal ha sido registrada"
        });
      }

      setDialogOpen(false);
      setEditingOffice(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (office: BranchOffice) => {
    setEditingOffice(office);
    setFormData({
      name: office.name,
      address: office.address || "",
      city: office.city || "",
      state_id: office.state_id || "",
      phone: office.phone || "",
      email: office.email || "",
      manager_id: office.manager_id || "",
      active: office.active
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      city: "",
      state_id: "",
      phone: "",
      email: "",
      manager_id: "",
      active: true
    });
  };

  const toggleOfficeStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("branch_offices")
        .update({ active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: `La sucursal ha sido ${!currentStatus ? "activada" : "desactivada"}`
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (loading && offices.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Gestión de Sucursales
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Sucursal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingOffice ? "Editar Sucursal" : "Nueva Sucursal"}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre de la Sucursal *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">Ciudad</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select 
                      value={formData.state_id} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, state_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {states.map((state) => (
                          <SelectItem key={state.id} value={state.id}>
                            {state.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Gerente</Label>
                    <Select 
                      value={formData.manager_id} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, manager_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un gerente" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.full_name} {employee.position && `- ${employee.position}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Dirección completa de la sucursal"
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Guardando..." : (editingOffice ? "Actualizar" : "Crear")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sucursal</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Gerente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {offices.map((office) => (
              <TableRow key={office.id}>
                <TableCell>
                  <div className="font-medium">{office.name}</div>
                  {office.address && (
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {office.address}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div>{office.city}</div>
                  {office.states && (
                    <div className="text-sm text-muted-foreground">
                      {office.states.name}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {office.phone && (
                    <div className="flex items-center gap-1 text-sm">
                      <Phone className="h-3 w-3" />
                      {office.phone}
                    </div>
                  )}
                  {office.email && (
                    <div className="flex items-center gap-1 text-sm">
                      <Mail className="h-3 w-3" />
                      {office.email}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {office.profiles?.full_name || "Sin asignar"}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={office.active ? "default" : "secondary"}
                    className={office.active ? "bg-green-100 text-green-800" : ""}
                  >
                    {office.active ? "Activa" : "Inactiva"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(office)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={office.active ? "destructive" : "default"}
                      onClick={() => toggleOfficeStatus(office.id, office.active)}
                    >
                      {office.active ? "Desactivar" : "Activar"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {offices.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay sucursales registradas</p>
            <p className="text-sm">Crea la primera sucursal para comenzar</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}