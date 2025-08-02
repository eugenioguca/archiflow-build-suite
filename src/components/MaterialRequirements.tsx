import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Truck, 
  AlertTriangle, 
  CheckCircle,
  Edit,
  Trash2,
  MoreHorizontal,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MaterialRequirementForm } from "@/components/forms/MaterialRequirementForm";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface MaterialRequirement {
  id: string;
  project_id: string;
  material_code: string | null;
  material_name: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  unit_of_measure: string;
  quantity_required: number;
  quantity_ordered: number;
  quantity_delivered: number;
  quantity_used: number;
  quantity_remaining: number;
  quantity_wasted: number;
  unit_cost: number;
  total_cost: number;
  supplier_id: string | null;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  priority_level: string;
  status: string;
  procurement_notes: string | null;
  quality_approved: boolean;
  min_stock_level: number;
  reorder_point: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface MaterialRequirementsProps {
  projectId: string;
}

export function MaterialRequirements({ projectId }: MaterialRequirementsProps) {
  const [materials, setMaterials] = useState<MaterialRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMaterialDialog, setNewMaterialDialog] = useState(false);
  const [editMaterialDialog, setEditMaterialDialog] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialRequirement | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const categories = [
    "Cemento y Concreto",
    "Agregados",
    "Acero de Refuerzo",
    "Block y Ladrillo",
    "Materiales Eléctricos",
    "Materiales Hidráulicos",
    "Impermeabilizantes",
    "Acabados",
    "Herrería",
    "Carpintería",
    "Vidrio y Cancelería",
    "Pintura",
    "Herramientas",
    "Equipo de Seguridad",
    "Otros"
  ];

  const statusOptions = [
    { value: "required", label: "Requerido", color: "gray" },
    { value: "quoted", label: "Cotizado", color: "blue" },
    { value: "ordered", label: "Ordenado", color: "yellow" },
    { value: "partial_delivery", label: "Entrega Parcial", color: "orange" },
    { value: "delivered", label: "Entregado", color: "green" },
    { value: "cancelled", label: "Cancelado", color: "red" }
  ];

  const priorityLevels = [
    { value: "low", label: "Baja", color: "gray" },
    { value: "medium", label: "Media", color: "blue" },
    { value: "high", label: "Alta", color: "orange" },
    { value: "urgent", label: "Urgente", color: "red" }
  ];

  useEffect(() => {
    fetchMaterials();
  }, [projectId]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("material_requirements")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching materials:", error);
        toast.error("Error al cargar los materiales");
        return;
      }

      setMaterials(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar los materiales");
    } finally {
      setLoading(false);
    }
  };

  const handleEditMaterial = (material: MaterialRequirement) => {
    setSelectedMaterial(material);
    setEditMaterialDialog(true);
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este material?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("material_requirements")
        .delete()
        .eq("id", materialId);

      if (error) {
        console.error("Error deleting material:", error);
        toast.error("Error al eliminar el material");
        return;
      }

      toast.success("Material eliminado exitosamente");
      fetchMaterials();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al eliminar el material");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = statusOptions.find(s => s.value === status);
    return (
      <Badge 
        variant={status === 'delivered' ? 'default' : 
                status === 'ordered' ? 'secondary' : 
                status === 'cancelled' ? 'destructive' : 'outline'}
      >
        {statusConfig?.label || status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = priorityLevels.find(p => p.value === priority);
    return (
      <Badge 
        variant={priority === 'urgent' ? 'destructive' : 
                priority === 'high' ? 'secondary' : 'outline'}
      >
        {priorityConfig?.label || priority}
      </Badge>
    );
  };

  const isLowStock = (material: MaterialRequirement) => {
    return material.quantity_remaining <= material.reorder_point;
  };

  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.material_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.material_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || material.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || material.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const stats = {
    total: materials.length,
    required: materials.filter(m => m.status === 'required').length,
    ordered: materials.filter(m => m.status === 'ordered').length,
    delivered: materials.filter(m => m.status === 'delivered').length,
    missing: materials.filter(m => isLowStock(m)).length,
    totalCost: materials.reduce((sum, m) => sum + m.total_cost, 0)
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando materiales...</p>
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
            <Package className="h-8 w-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Materiales</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.required}</div>
            <div className="text-sm text-muted-foreground">Requeridos</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.ordered}</div>
            <div className="text-sm text-muted-foreground">Ordenados</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
            <div className="text-sm text-muted-foreground">Entregados</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.missing}</div>
            <div className="text-sm text-muted-foreground">Stock Bajo</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Requerimientos de Materiales
              </CardTitle>
              <CardDescription>
                Control de materiales, inventario y proveedores
              </CardDescription>
            </div>
            
            <Dialog open={newMaterialDialog} onOpenChange={setNewMaterialDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Material
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nuevo Requerimiento de Material</DialogTitle>
                  <DialogDescription>
                    Agregar un nuevo material al proyecto
                  </DialogDescription>
                </DialogHeader>
                <MaterialRequirementForm
                  projectId={projectId}
                  onSuccess={() => {
                    setNewMaterialDialog(false);
                    fetchMaterials();
                  }}
                  onCancel={() => setNewMaterialDialog(false)}
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
                placeholder="Buscar materiales..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
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
          </div>
        </CardContent>
      </Card>

      {/* Materials Table */}
      <Card>
        <CardContent className="p-0">
          {filteredMaterials.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No hay materiales</p>
              <p className="text-muted-foreground">
                {materials.length === 0 
                  ? "Agrega el primer material para comenzar"
                  : "Prueba ajustando los filtros de búsqueda"
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="bg-muted/50">
                    <th className="text-left p-4 font-medium">Material</th>
                    <th className="text-left p-4 font-medium">Categoría</th>
                    <th className="text-left p-4 font-medium">Cantidad</th>
                    <th className="text-left p-4 font-medium">Estado</th>
                    <th className="text-left p-4 font-medium">Prioridad</th>
                    <th className="text-right p-4 font-medium">Costo</th>
                    <th className="text-left p-4 font-medium">Entrega</th>
                    <th className="text-center p-4 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaterials.map((material) => (
                    <tr key={material.id} className="border-b hover:bg-muted/30">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-medium">{material.material_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {material.material_code}
                            </div>
                            {isLowStock(material) && (
                              <div className="flex items-center gap-1 text-red-600 text-xs mt-1">
                                <AlertTriangle className="h-3 w-3" />
                                Stock bajo
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline">{material.category}</Badge>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="text-sm">
                            <span className="font-medium">{material.quantity_remaining}</span>
                            <span className="text-muted-foreground"> / {material.quantity_required} {material.unit_of_measure}</span>
                          </div>
                          <Progress 
                            value={material.quantity_required > 0 ? 
                              ((material.quantity_required - material.quantity_remaining) / material.quantity_required) * 100 : 0} 
                            className="h-2 w-20" 
                          />
                        </div>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(material.status)}
                      </td>
                      <td className="p-4">
                        {getPriorityBadge(material.priority_level)}
                      </td>
                      <td className="p-4 text-right">
                        <div className="font-medium">${material.total_cost.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">
                          ${material.unit_cost} / {material.unit_of_measure}
                        </div>
                      </td>
                      <td className="p-4">
                        {material.expected_delivery_date ? (
                          <div className="text-sm">
                            {format(new Date(material.expected_delivery_date), "dd/MM/yyyy", { locale: es })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No definida</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditMaterial(material)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteMaterial(material.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Material Dialog */}
      <Dialog open={editMaterialDialog} onOpenChange={setEditMaterialDialog}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Requerimiento de Material</DialogTitle>
            <DialogDescription>
              Modificar los detalles del material seleccionado
            </DialogDescription>
          </DialogHeader>
          {selectedMaterial && (
            <MaterialRequirementForm
              projectId={projectId}
              initialData={selectedMaterial}
              onSuccess={() => {
                setEditMaterialDialog(false);
                setSelectedMaterial(null);
                fetchMaterials();
              }}
              onCancel={() => {
                setEditMaterialDialog(false);
                setSelectedMaterial(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}