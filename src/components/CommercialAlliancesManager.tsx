import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Edit, Eye, TrendingUp, Users, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface CommercialAlliance {
  id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  commission_rate?: number;
  website?: string;
  address?: string;
  notes?: string;
  active: boolean;
  clients_referred: number;
  projects_converted: number;
  total_commission_earned: number;
  created_at: string;
  updated_at: string;
}

const CommercialAlliancesManager: React.FC = () => {
  const { profile } = useAuth();
  const [alliances, setAlliances] = useState<CommercialAlliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAlliance, setEditingAlliance] = useState<CommercialAlliance | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    commission_rate: 0,
    website: "",
    address: "",
    notes: "",
    active: true,
  });

  const fetchAlliances = async () => {
    try {
      const { data, error } = await supabase
        .from("commercial_alliances")
        .select("*")
        .order("name");

      if (error) throw error;
      setAlliances(data || []);
    } catch (error) {
      console.error("Error fetching alliances:", error);
      toast.error("Error al cargar las alianzas comerciales");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlliances();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      contact_person: "",
      phone: "",
      email: "",
      commission_rate: 0,
      website: "",
      address: "",
      notes: "",
      active: true,
    });
    setEditingAlliance(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    try {
      setLoading(true);
      
      if (editingAlliance) {
        const { error } = await supabase
          .from("commercial_alliances")
          .update(formData)
          .eq("id", editingAlliance.id);

        if (error) throw error;
        toast.success("Alianza comercial actualizada");
      } else {
        const { error } = await supabase
          .from("commercial_alliances")
          .insert([{ ...formData, created_by: profile?.user_id }]);

        if (error) throw error;
        toast.success("Alianza comercial creada");
      }

      setDialogOpen(false);
      resetForm();
      fetchAlliances();
    } catch (error) {
      console.error("Error saving alliance:", error);
      toast.error("Error al guardar la alianza comercial");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (alliance: CommercialAlliance) => {
    setEditingAlliance(alliance);
    setFormData({
      name: alliance.name,
      contact_person: alliance.contact_person || "",
      phone: alliance.phone || "",
      email: alliance.email || "",
      commission_rate: alliance.commission_rate || 0,
      website: alliance.website || "",
      address: alliance.address || "",
      notes: alliance.notes || "",
      active: alliance.active,
    });
    setDialogOpen(true);
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from("commercial_alliances")
        .update({ active })
        .eq("id", id);

      if (error) throw error;
      toast.success(`Alianza ${active ? "activada" : "desactivada"}`);
      fetchAlliances();
    } catch (error) {
      console.error("Error updating alliance status:", error);
      toast.error("Error al actualizar el estado");
    }
  };

  const totalClients = alliances.reduce((sum, alliance) => sum + alliance.clients_referred, 0);
  const totalCommission = alliances.reduce((sum, alliance) => sum + alliance.total_commission_earned, 0);
  const activeAlliances = alliances.filter(alliance => alliance.active).length;

  if (loading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Alianzas Comerciales</h1>
          <p className="text-muted-foreground">
            Gestiona tus aliados comerciales y su rendimiento
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Alianza
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingAlliance ? "Editar Alianza" : "Nueva Alianza Comercial"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nombre de la alianza"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_person">Persona de Contacto</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    placeholder="Nombre del contacto"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Teléfono de contacto"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Email de contacto"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commission_rate">Comisión (%)</Label>
                  <Input
                    id="commission_rate"
                    type="number"
                    step="0.01"
                    value={formData.commission_rate}
                    onChange={(e) => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Sitio Web</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://ejemplo.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Dirección completa"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notas adicionales sobre la alianza"
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">Alianza activa</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {editingAlliance ? "Actualizar" : "Crear"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alianzas Activas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAlliances}</div>
            <p className="text-xs text-muted-foreground">
              de {alliances.length} totales
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Referidos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClients}</div>
            <p className="text-xs text-muted-foreground">
              total acumulado
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comisiones</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalCommission.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              MXN acumulado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de alianzas */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Alianzas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Clientes</TableHead>
                <TableHead>Comisión %</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alliances.map((alliance) => (
                <TableRow key={alliance.id}>
                  <TableCell className="font-medium">{alliance.name}</TableCell>
                  <TableCell>
                    <div>
                      <div>{alliance.contact_person || "Sin contacto"}</div>
                      {alliance.email && (
                        <div className="text-sm text-muted-foreground">{alliance.email}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{alliance.clients_referred}</TableCell>
                  <TableCell>{alliance.commission_rate}%</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={alliance.active}
                        onCheckedChange={(checked) => toggleActive(alliance.id, checked)}
                      />
                      <Badge variant={alliance.active ? "default" : "secondary"}>
                        {alliance.active ? "Activa" : "Inactiva"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(alliance)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {alliances.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No hay alianzas comerciales registradas
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CommercialAlliancesManager;