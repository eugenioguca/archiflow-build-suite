import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Package, Truck, AlertTriangle, CheckCircle, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Material {
  id: string;
  material_name: string;
  material_code?: string;
  description?: string;
  unit: string;
  quantity_required: number;
  quantity_ordered: number;
  quantity_delivered: number;
  quantity_used: number;
  unit_cost: number;
  total_cost: number;
  delivery_date?: string;
  location_stored?: string;
  quality_certified: boolean;
  status: string;
  supplier?: {
    company_name: string;
  };
  partida?: {
    nombre: string;
    codigo: string;
  };
}

interface MaterialsInventoryProps {
  constructionProjectId: string;
}

export function MaterialsInventory({ constructionProjectId }: MaterialsInventoryProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("construction_materials")
        .select(`
          *,
          supplier:suppliers(company_name),
          partida:partidas_catalog(nombre, codigo)
        `)
        .eq("construction_project_id", constructionProjectId)
        .order("material_name", { ascending: true });

      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error("Error fetching materials:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (constructionProjectId) {
      fetchMaterials();
    }
  }, [constructionProjectId]);

  const getStatusColor = (material: Material) => {
    if (material.quantity_delivered >= material.quantity_required) return "bg-green-100 text-green-800";
    if (material.quantity_ordered > 0) return "bg-blue-100 text-blue-800";
    if (material.quantity_delivered > 0) return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-800";
  };

  const getStatusText = (material: Material) => {
    if (material.quantity_delivered >= material.quantity_required) return "Completo";
    if (material.quantity_ordered > 0) return "Ordenado";
    if (material.quantity_delivered > 0) return "Parcial";
    return "Pendiente";
  };

  const filteredMaterials = materials.filter(material =>
    material.material_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.material_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.supplier?.company_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Inventario de Materiales</h2>
          <p className="text-muted-foreground">Control de materiales y suministros</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Truck className="h-4 w-4 mr-2" />
            Nueva Entrega
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Material
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar materiales..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Materials Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{materials.length}</div>
            <p className="text-xs text-muted-foreground">Total materiales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {materials.filter(m => m.quantity_delivered >= m.quantity_required).length}
            </div>
            <p className="text-xs text-muted-foreground">Completos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {materials.filter(m => m.quantity_ordered > 0).length}
            </div>
            <p className="text-xs text-muted-foreground">Ordenados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              ${materials.reduce((total, m) => total + m.total_cost, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Valor total</p>
          </CardContent>
        </Card>
      </div>

      {/* Materials Table */}
      <div className="space-y-4">
        {filteredMaterials.map((material) => (
          <Card key={material.id}>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{material.material_name}</h3>
                      {material.material_code && (
                        <Badge variant="outline">{material.material_code}</Badge>
                      )}
                      <Badge className={getStatusColor(material)}>
                        {getStatusText(material)}
                      </Badge>
                      {material.quality_certified && (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Certificado
                        </Badge>
                      )}
                    </div>
                    {material.description && (
                      <p className="text-sm text-muted-foreground">{material.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">${material.total_cost.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      ${material.unit_cost.toLocaleString()} / {material.unit}
                    </p>
                  </div>
                </div>

                {/* Progress and Quantities */}
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Requerido</p>
                      <p className="text-sm font-medium">
                        {material.quantity_required} {material.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Ordenado</p>
                      <p className="text-sm font-medium">
                        {material.quantity_ordered} {material.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Entregado</p>
                      <p className="text-sm font-medium">
                        {material.quantity_delivered} {material.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Usado</p>
                      <p className="text-sm font-medium">
                        {material.quantity_used} {material.unit}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progreso de entrega</span>
                      <span>{Math.round((material.quantity_delivered / material.quantity_required) * 100)}%</span>
                    </div>
                    <Progress 
                      value={(material.quantity_delivered / material.quantity_required) * 100} 
                      className="h-2"
                    />
                  </div>

                  {/* Additional Info */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2 border-t">
                    {material.supplier && (
                      <div>
                        <p className="text-xs text-muted-foreground">Proveedor</p>
                        <p className="text-sm font-medium">{material.supplier.company_name}</p>
                      </div>
                    )}
                    {material.partida && (
                      <div>
                        <p className="text-xs text-muted-foreground">Partida</p>
                        <p className="text-sm font-medium">
                          {material.partida.codigo} - {material.partida.nombre}
                        </p>
                      </div>
                    )}
                    {material.location_stored && (
                      <div>
                        <p className="text-xs text-muted-foreground">Ubicación</p>
                        <p className="text-sm font-medium">{material.location_stored}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center pt-2 border-t">
                  <div className="flex gap-2">
                    {material.quantity_delivered < material.quantity_required && (
                      <Button variant="outline" size="sm">
                        <Truck className="h-3 w-3 mr-1" />
                        Recibir Entrega
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      <Package className="h-3 w-3 mr-1" />
                      Usar Material
                    </Button>
                  </div>
                  {material.quantity_delivered < material.quantity_required && (
                    <div className="flex items-center gap-1 text-xs text-orange-600">
                      <AlertTriangle className="h-3 w-3" />
                      Falta material
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMaterials.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay materiales registrados</h3>
            <p className="text-muted-foreground text-center mb-4">
              Comienza agregando los materiales necesarios para el proyecto.
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Primer Material
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}