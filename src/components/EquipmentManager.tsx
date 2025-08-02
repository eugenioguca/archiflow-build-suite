import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Wrench, 
  Plus, 
  Search, 
  Filter, 
  AlertTriangle,
  Calendar,
  DollarSign,
  MapPin,
  Settings,
  MoreHorizontal
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EquipmentForm } from "@/components/forms/EquipmentForm";
import { toast } from "sonner";

interface Equipment {
  id: string;
  equipment_name: string;
  equipment_code: string;
  equipment_type: string;
  brand: string;
  model: string;
  serial_number: string;
  status: string;
  condition_rating: number;
  hourly_rate: number;
  daily_rate: number;
  monthly_rate: number;
  operating_hours_total: number;
  location: string;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  assigned_to_user_id: string | null;
  current_phase_id: string | null;
}

interface EquipmentManagerProps {
  projectId: string;
}

export function EquipmentManager({ projectId }: EquipmentManagerProps) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [newEquipmentDialog, setNewEquipmentDialog] = useState(false);

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
    { value: "available", label: "Disponible", color: "green" },
    { value: "in_use", label: "En Uso", color: "blue" },
    { value: "maintenance", label: "Mantenimiento", color: "yellow" },
    { value: "repair", label: "Reparación", color: "red" },
    { value: "retired", label: "Retirado", color: "gray" }
  ];

  useEffect(() => {
    fetchEquipment();
  }, [projectId]);

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("construction_equipment")
        .select("*")
        .eq("project_id", projectId)
        .order("equipment_name");

      if (error) {
        console.error("Error fetching equipment:", error);
        toast.error("Error al cargar los equipos");
        return;
      }

      setEquipment(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar los equipos");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = statusOptions.find(s => s.value === status);
    return (
      <Badge 
        variant={status === 'available' ? 'default' : 
                status === 'in_use' ? 'secondary' : 
                status === 'maintenance' ? 'outline' : 'destructive'}
      >
        {statusConfig?.label || status}
      </Badge>
    );
  };

  const getConditionColor = (rating: number) => {
    if (rating >= 4) return "text-green-600";
    if (rating >= 3) return "text-yellow-600";
    return "text-red-600";
  };

  const isMaintenanceDue = (equipment: Equipment) => {
    if (!equipment.next_maintenance_date) return false;
    const nextMaintenance = new Date(equipment.next_maintenance_date);
    const today = new Date();
    const diffDays = Math.ceil((nextMaintenance.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7; // Due within 7 days
  };

  const filteredEquipment = equipment.filter(eq => {
    const matchesSearch = eq.equipment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         eq.equipment_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         eq.brand.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || eq.status === statusFilter;
    const matchesType = typeFilter === "all" || eq.equipment_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: equipment.length,
    available: equipment.filter(eq => eq.status === 'available').length,
    inUse: equipment.filter(eq => eq.status === 'in_use').length,
    maintenance: equipment.filter(eq => eq.status === 'maintenance').length,
    maintenanceDue: equipment.filter(eq => isMaintenanceDue(eq)).length
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando equipos...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Wrench className="h-8 w-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Equipos</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.available}</div>
            <div className="text-sm text-muted-foreground">Disponibles</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.inUse}</div>
            <div className="text-sm text-muted-foreground">En Uso</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.maintenance}</div>
            <div className="text-sm text-muted-foreground">Mantenimiento</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.maintenanceDue}</div>
            <div className="text-sm text-muted-foreground">Mant. Pendiente</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Gestión de Equipos
              </CardTitle>
              <CardDescription>
                Control y seguimiento de equipos y maquinaria
              </CardDescription>
            </div>
            
            <Dialog open={newEquipmentDialog} onOpenChange={setNewEquipmentDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Equipo
                </Button>
              </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Nuevo Equipo</DialogTitle>
                    <DialogDescription>
                      Agregar un nuevo equipo al inventario del proyecto
                    </DialogDescription>
                  </DialogHeader>
                  <EquipmentForm
                    projectId={projectId}
                    onSuccess={() => {
                      setNewEquipmentDialog(false);
                      fetchEquipment();
                    }}
                    onCancel={() => setNewEquipmentDialog(false)}
                  />
                </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar equipos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {statusOptions.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {equipmentTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Equipment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEquipment.map((eq) => (
          <Card key={eq.id} className="relative">
            {isMaintenanceDue(eq) && (
              <div className="absolute top-2 right-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              </div>
            )}
            
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{eq.equipment_name}</CardTitle>
                  <CardDescription>{eq.equipment_code}</CardDescription>
                </div>
                {getStatusBadge(eq.status)}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span className="font-medium">{eq.equipment_type}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Marca:</span>
                  <span className="font-medium">{eq.brand} {eq.model}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Condición:</span>
                  <span className={`font-medium ${getConditionColor(eq.condition_rating)}`}>
                    {eq.condition_rating}/5 ⭐
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ubicación:</span>
                  <span className="font-medium">{eq.location || "No asignada"}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Horas de uso:</span>
                  <span className="font-medium">{eq.operating_hours_total}h</span>
                </div>
              </div>
              
              {eq.next_maintenance_date && (
                <div className={`p-3 rounded-lg ${
                  isMaintenanceDue(eq) 
                    ? 'bg-orange-50 border border-orange-200' 
                    : 'bg-green-50 border border-green-200'
                }`}>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">
                      Próximo mantenimiento: {new Date(eq.next_maintenance_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div>
                  <div className="font-semibold">${eq.hourly_rate}</div>
                  <div className="text-muted-foreground">por hora</div>
                </div>
                <div>
                  <div className="font-semibold">${eq.daily_rate}</div>
                  <div className="text-muted-foreground">por día</div>
                </div>
                <div>
                  <div className="font-semibold">${eq.monthly_rate}</div>
                  <div className="text-muted-foreground">por mes</div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Settings className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEquipment.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">No se encontraron equipos</p>
            <p className="text-muted-foreground">
              {equipment.length === 0 
                ? "Agrega equipos para comenzar a gestionar el inventario"
                : "Prueba ajustando los filtros de búsqueda"
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}