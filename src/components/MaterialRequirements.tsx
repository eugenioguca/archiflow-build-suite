import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
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
  TrendingDown,
  FileSpreadsheet
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MaterialRequirementForm } from "@/components/forms/MaterialRequirementForm";
import { MaterialExcelManager } from "@/components/MaterialExcelManager";
import { EditableCell } from "@/components/EditableCell";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface MaterialRequirement {
  id: string;
  project_id: string;
  phase_id: string | null;
  budget_item_id: string | null;
  material_name: string;
  material_code: string | null;
  material_type: string;
  brand: string | null;
  model: string | null;
  specifications: any;
  unit_of_measure: string;
  quantity_required: number;
  quantity_ordered: number | null;
  quantity_delivered: number | null;
  quantity_used: number | null;
  quantity_wasted: number | null;
  quantity_remaining: number | null;
  unit_cost: number | null;
  total_cost: number | null;
  supplier_id: string | null;
  purchase_order_number: string | null;
  delivery_date_required: string | null;
  delivery_date_actual: string | null;
  storage_location: string | null;
  storage_requirements: any;
  quality_standards: any;
  environmental_impact: any;
  sustainability_rating: number | null;
  certifications: any;
  warranty_period: number | null;
  warranty_terms: string | null;
  status: string;
  priority: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // New fields from our migration
  cuenta_mayor: string | null;
  partida: string | null;
  sub_partida: number | null;
  descripcion_producto: string | null;
  notas_procuracion: string | null;
  requisito_almacenamiento: string | null;
  adjustment_additive: number | null;
  adjustment_deductive: number | null;
  is_delivered: boolean;
}

interface MaterialRequirementsProps {
  projectId: string;
}

export function MaterialRequirements({ projectId }: MaterialRequirementsProps) {
  const [materials, setMaterials] = useState<MaterialRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialRequirement | null>(null);
  const [editMaterialDialog, setEditMaterialDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('material_requirements')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching materials:', error);
        toast.error('Error al cargar los materiales');
        return;
      }

      setMaterials(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error inesperado al cargar los materiales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchMaterials();
    }
  }, [projectId]);

  const handleEditMaterial = (material: MaterialRequirement) => {
    setSelectedMaterial(material);
    setEditMaterialDialog(true);
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este material?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('material_requirements')
        .delete()
        .eq('id', materialId);

      if (error) {
        console.error('Error deleting material:', error);
        toast.error('Error al eliminar el material');
        return;
      }

      toast.success('Material eliminado exitosamente');
      fetchMaterials();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error inesperado al eliminar el material');
    }
  };

  const handleUpdateMaterial = async (materialId: string, field: string, value: any) => {
    try {
      const { error } = await supabase
        .from('material_requirements')
        .update({ [field]: value })
        .eq('id', materialId);

      if (error) {
        console.error('Error updating material:', error);
        toast.error('Error al actualizar el material');
        return;
      }

      toast.success('Material actualizado exitosamente');
      fetchMaterials();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error inesperado al actualizar el material');
    }
  };

  const handleDeliveryToggle = async (materialId: string, isDelivered: boolean) => {
    await handleUpdateMaterial(materialId, 'is_delivered', isDelivered);
  };

  // Filter materials based on search and filters
  const filteredMaterials = materials.filter(material => {
    const matchesSearch = !searchTerm || 
      material.material_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.descripcion_producto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.material_code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !categoryFilter || categoryFilter === "all" || material.cuenta_mayor === categoryFilter;
    const matchesStatus = !statusFilter || statusFilter === "all" || material.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate statistics
  const totalMaterials = materials.length;
  const requiredCount = materials.filter(m => m.status === 'requerido').length;
  const orderedCount = materials.filter(m => m.status === 'ordenado' || m.status === 'cotizado').length;
  const deliveredCount = materials.filter(m => m.is_delivered === true).length;
  const lowStockCount = materials.filter(m => 
    (m.quantity_remaining || 0) <= 5 // Using a simple threshold since some fields might be null
  ).length;

  const getStatusBadge = (status: string) => {
    const statusMap = {
      cotizado: { label: "Cotizado", variant: "outline" as const, className: "" },
      requerido: { label: "Requerido", variant: "secondary" as const, className: "bg-orange-600 text-white hover:bg-orange-700" },
      ordenado: { label: "Ordenado", variant: "default" as const, className: "bg-green-600 text-white hover:bg-green-700" },
      cancelado: { label: "Cancelado", variant: "destructive" as const, className: "bg-red-600 text-white hover:bg-red-700" }
    };
    
    const config = statusMap[status as keyof typeof statusMap] || { label: status, variant: "outline" as const, className: "" };
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityMap = {
      low: { label: "Baja", variant: "outline" as const },
      medium: { label: "Media", variant: "secondary" as const },
      high: { label: "Alta", variant: "default" as const },
      urgent: { label: "Urgente", variant: "destructive" as const }
    };
    
    const config = priorityMap[priority as keyof typeof priorityMap] || { label: priority, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total</p>
                <p className="text-2xl font-bold">{totalMaterials}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Requeridos</p>
                <p className="text-2xl font-bold">{requiredCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Truck className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Ordenados</p>
                <p className="text-2xl font-bold">{orderedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Entregados</p>
                <p className="text-2xl font-bold">{deliveredCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium">Stock Bajo</p>
                <p className="text-2xl font-bold">{lowStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="materials" className="w-full">
        <TabsList>
          <TabsTrigger value="materials">Materiales</TabsTrigger>
          <TabsTrigger value="excel">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="materials">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle>Lista de Materiales</CardTitle>
                <Button onClick={() => { setSelectedMaterial(null); setEditMaterialDialog(true); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Material
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar materiales..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por cuenta mayor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las cuentas</SelectItem>
                    {Array.from(new Set(materials.map(m => m.cuenta_mayor).filter(Boolean))).map(cuenta => (
                      <SelectItem key={cuenta} value={cuenta!}>{cuenta}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="cotizado">Cotizado</SelectItem>
                    <SelectItem value="requerido">Requerido</SelectItem>
                    <SelectItem value="ordenado">Ordenado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Materials Table */}
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-muted-foreground">Cargando materiales...</p>
                </div>
              ) : filteredMaterials.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No se encontraron materiales</p>
                  <p className="text-muted-foreground">Comience agregando el primer material del proyecto</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Material</th>
                        <th className="text-left p-2">Cuenta Mayor</th>
                        <th className="text-left p-2">Cantidad</th>
                        <th className="text-left p-2">Estado</th>
                        <th className="text-left p-2">Prioridad</th>
                        <th className="text-left p-2">Aditivo</th>
                        <th className="text-left p-2">Deductivo</th>
                        <th className="text-left p-2">Costo Final</th>
                        <th className="text-center p-2">Entregado</th>
                        <th className="text-center p-2">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMaterials.map((material) => (
                        <tr key={material.id} className="border-b hover:bg-muted/50">
                          <td className="p-2">
                            <div>
                              <p className="font-medium">{material.material_name}</p>
                              {material.material_code && (
                                <p className="text-sm text-muted-foreground">{material.material_code}</p>
                              )}
                              {material.descripcion_producto && (
                                <p className="text-sm text-muted-foreground">{material.descripcion_producto}</p>
                              )}
                            </div>
                          </td>
                          <td className="p-2">{material.cuenta_mayor || material.material_type}</td>
                          <td className="p-2">
                            {material.quantity_required} {material.unit_of_measure}
                          </td>
                           <td className="p-2">
                            <Select
                              value={material.status}
                              onValueChange={(newValue) => handleUpdateMaterial(material.id, 'status', newValue)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cotizado">Cotizado</SelectItem>
                                <SelectItem value="requerido">Requerido</SelectItem>
                                <SelectItem value="ordenado">Ordenado</SelectItem>
                                <SelectItem value="cancelado">Cancelado</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-2">
                            <Select
                              value={material.priority}
                              onValueChange={(newValue) => handleUpdateMaterial(material.id, 'priority', newValue)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Baja</SelectItem>
                                <SelectItem value="medium">Media</SelectItem>
                                <SelectItem value="high">Alta</SelectItem>
                                <SelectItem value="urgent">Urgente</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-2">
                            <EditableCell
                              value={(material.adjustment_additive || 0).toString()}
                              onSave={(newValue) => handleUpdateMaterial(material.id, 'adjustment_additive', parseFloat(newValue) || 0)}
                              type="number"
                              displayTransform={(value) => `$${parseFloat(value || '0').toLocaleString()}`}
                            />
                          </td>
                          <td className="p-2">
                            <EditableCell
                              value={(material.adjustment_deductive || 0).toString()}
                              onSave={(newValue) => handleUpdateMaterial(material.id, 'adjustment_deductive', parseFloat(newValue) || 0)}
                              type="number"
                              displayTransform={(value) => `$${parseFloat(value || '0').toLocaleString()}`}
                            />
                          </td>
                          <td className="p-2">
                            ${(((material.unit_cost || 0) + (material.adjustment_additive || 0) - (material.adjustment_deductive || 0)) * material.quantity_required).toLocaleString()}
                          </td>
                          <td className="p-2">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={material.is_delivered}
                                onCheckedChange={(checked) => handleDeliveryToggle(material.id, !!checked)}
                              />
                            </div>
                          </td>
                          <td className="p-2">
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
        </TabsContent>

        <TabsContent value="excel">
          <MaterialExcelManager 
            projectId={projectId}
            onImportComplete={fetchMaterials}
          />
        </TabsContent>
      </Tabs>

      {/* Edit Material Dialog */}
      <Dialog open={editMaterialDialog} onOpenChange={setEditMaterialDialog}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedMaterial ? "Editar Material" : "Nuevo Material"}
            </DialogTitle>
          </DialogHeader>
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
        </DialogContent>
      </Dialog>
    </div>
  );
}