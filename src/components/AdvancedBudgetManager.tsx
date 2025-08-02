import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Plus, 
  Download, 
  Upload, 
  Edit, 
  Trash2, 
  FileText, 
  Calculator,
  TrendingUp,
  AlertCircle,
  Check
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DragDropUploader } from "@/components/ui/drag-drop-uploader";
import { BudgetItemForm } from "@/components/forms/BudgetItemForm";
import * as XLSX from "xlsx";

interface BudgetItem {
  id: string;
  item_code: string;
  item_name: string;
  item_description: string;
  category: string;
  subcategory: string;
  specialty: string;
  unit_of_measure: string;
  quantity: number;
  unit_price: number;
  material_cost: number;
  labor_cost: number;
  equipment_cost: number;
  overhead_percentage: number;
  profit_percentage: number;
  total_price: number;
  executed_quantity: number;
  remaining_quantity: number;
  executed_amount: number;
  item_order: number;
  parent_item_id: string | null;
  level_depth: number;
  status: string;
  phase_id: string | null;
  budget_version: number;
}

interface AdvancedBudgetManagerProps {
  projectId: string;
}

export function AdvancedBudgetManager({ projectId }: AdvancedBudgetManagerProps) {
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [newItemDialog, setNewItemDialog] = useState(false);
  const [editItemDialog, setEditItemDialog] = useState(false);
  const [importDialog, setImportDialog] = useState(false);
  const [currentBudgetVersion, setCurrentBudgetVersion] = useState(1);
  const [selectedItem, setSelectedItem] = useState<BudgetItem | null>(null);

  const categories = [
    "Preliminares",
    "Cimentación", 
    "Estructura",
    "Albañilería",
    "Instalaciones Hidráulicas",
    "Instalaciones Eléctricas",
    "Instalaciones Sanitarias",
    "Acabados",
    "Herrería",
    "Carpintería",
    "Pintura",
    "Limpieza"
  ];

  const specialties = [
    "Obra Civil",
    "Instalaciones",
    "Acabados",
    "Estructural",
    "MEP",
    "Paisajismo"
  ];

  useEffect(() => {
    fetchBudgetItems();
  }, [projectId, currentBudgetVersion]);

  const fetchBudgetItems = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("construction_budget_items")
        .select("*")
        .eq("project_id", projectId)
        .eq("budget_version", currentBudgetVersion)
        .order("item_order");

      if (error) {
        console.error("Error fetching budget items:", error);
        toast.error("Error al cargar las partidas del presupuesto");
        return;
      }

      setBudgetItems(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar las partidas");
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const filtered = selectedCategory === "all" 
      ? budgetItems 
      : budgetItems.filter(item => item.category === selectedCategory);

    return {
      totalItems: filtered.length,
      totalBudget: filtered.reduce((sum, item) => sum + item.total_price, 0),
      totalExecuted: filtered.reduce((sum, item) => sum + item.executed_amount, 0),
      completedItems: filtered.filter(item => item.status === 'completed').length,
      progress: filtered.length > 0 
        ? (filtered.filter(item => item.status === 'completed').length / filtered.length) * 100 
        : 0
    };
  };

  const handleImportExcel = async (files: File[]) => {
    if (files.length === 0) return;

    try {
      const file = files[0];
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Get current user profile ID for created_by
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      // Mapear datos de Excel a estructura de partidas
      const importedItems = jsonData.map((row: any, index: number) => ({
        project_id: projectId,
        budget_version: currentBudgetVersion,
        item_code: row['Código'] || row['codigo'] || `AUTO-${index + 1}`,
        item_name: row['Concepto'] || row['concepto'] || row['Descripción'] || '',
        item_description: row['Descripción'] || row['descripcion'] || '',
        category: row['Categoría'] || row['categoria'] || 'Preliminares',
        subcategory: row['Subcategoría'] || row['subcategoria'] || '',
        specialty: row['Especialidad'] || row['especialidad'] || 'Obra Civil',
        unit_of_measure: row['Unidad'] || row['unidad'] || 'PZA',
        quantity: parseFloat(row['Cantidad'] || row['cantidad'] || 0),
        unit_price: parseFloat(row['Precio Unitario'] || row['precio_unitario'] || row['P.U.'] || 0),
        material_cost: parseFloat(row['Costo Material'] || row['material'] || 0),
        labor_cost: parseFloat(row['Costo Mano de Obra'] || row['mano_obra'] || 0),
        equipment_cost: parseFloat(row['Costo Equipo'] || row['equipo'] || 0),
        overhead_percentage: parseFloat(row['Indirectos %'] || row['indirectos'] || 15),
        profit_percentage: parseFloat(row['Utilidad %'] || row['utilidad'] || 10),
        total_price: 0, // Se calculará automáticamente
        executed_quantity: 0,
        remaining_quantity: 0,
        executed_amount: 0,
        item_order: index + 1,
        parent_item_id: null,
        level_depth: 0,
        status: 'pending',
        created_by: profile?.id || ''
      }));

      // Calcular precios totales
      importedItems.forEach(item => {
        const basePrice = item.unit_price || (item.material_cost + item.labor_cost + item.equipment_cost);
        const withOverhead = basePrice * (1 + item.overhead_percentage / 100);
        const withProfit = withOverhead * (1 + item.profit_percentage / 100);
        item.total_price = withProfit * item.quantity;
        item.remaining_quantity = item.quantity;
      });

      // Insertar en base de datos
      const { error } = await supabase
        .from("construction_budget_items")
        .insert(importedItems);

      if (error) {
        console.error("Error importing budget items:", error);
        toast.error("Error al importar las partidas");
        return;
      }

      toast.success(`Se importaron ${importedItems.length} partidas exitosamente`);
      setImportDialog(false);
      fetchBudgetItems();
    } catch (error) {
      console.error("Error processing Excel file:", error);
      toast.error("Error al procesar el archivo de Excel");
    }
  };

  const exportToExcel = () => {
    try {
      const exportData = budgetItems.map(item => ({
        'Código': item.item_code,
        'Concepto': item.item_name,
        'Descripción': item.item_description,
        'Categoría': item.category,
        'Subcategoría': item.subcategory,
        'Especialidad': item.specialty,
        'Unidad': item.unit_of_measure,
        'Cantidad': item.quantity,
        'Precio Unitario': item.unit_price,
        'Costo Material': item.material_cost,
        'Costo Mano de Obra': item.labor_cost,
        'Costo Equipo': item.equipment_cost,
        'Indirectos %': item.overhead_percentage,
        'Utilidad %': item.profit_percentage,
        'Precio Total': item.total_price,
        'Cantidad Ejecutada': item.executed_quantity,
        'Cantidad Restante': item.remaining_quantity,
        'Monto Ejecutado': item.executed_amount,
        'Estado': item.status
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Presupuesto");

      const fileName = `presupuesto_construccion_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast.success("Presupuesto exportado exitosamente");
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast.error("Error al exportar el presupuesto");
    }
  };

  const handleEditItem = (item: BudgetItem) => {
    setSelectedItem(item);
    setEditItemDialog(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta partida?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("construction_budget_items")
        .delete()
        .eq("id", itemId);

      if (error) {
        console.error("Error deleting budget item:", error);
        toast.error("Error al eliminar la partida");
        return;
      }

      toast.success("Partida eliminada exitosamente");
      fetchBudgetItems();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al eliminar la partida");
    }
  };

  const totals = calculateTotals();
  const filteredItems = selectedCategory === "all" 
    ? budgetItems 
    : budgetItems.filter(item => item.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Header with Totals */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{totals.totalItems}</div>
              <div className="text-sm text-muted-foreground">Total Partidas</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                ${totals.totalBudget.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Presupuesto Total</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                ${totals.totalExecuted.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Ejecutado</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {totals.progress.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Progreso</div>
              <Progress value={totals.progress} className="mt-2 h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Presupuesto de Construcción</CardTitle>
              <CardDescription>
                Gestión avanzada de partidas y presupuesto
              </CardDescription>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Dialog open={importDialog} onOpenChange={setImportDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Importar Excel
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Importar Presupuesto desde Excel</DialogTitle>
                    <DialogDescription>
                      Sube un archivo de Excel con las partidas del presupuesto
                    </DialogDescription>
                  </DialogHeader>
                  <DragDropUploader
                    onFilesSelected={handleImportExcel}
                    accept={{
                      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                      'application/vnd.ms-excel': ['.xls']
                    }}
                    maxSize={10 * 1024 * 1024} // 10MB
                    multiple={false}
                  />
                </DialogContent>
              </Dialog>

              <Button variant="outline" onClick={exportToExcel}>
                <Download className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>

              <Dialog open={newItemDialog} onOpenChange={setNewItemDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Partida
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Nueva Partida del Presupuesto</DialogTitle>
                    <DialogDescription>
                      Agregar una nueva partida al presupuesto de construcción
                    </DialogDescription>
                  </DialogHeader>
                  <BudgetItemForm
                    projectId={projectId}
                    budgetVersion={currentBudgetVersion}
                    onSuccess={() => {
                      setNewItemDialog(false);
                      fetchBudgetItems();
                    }}
                    onCancel={() => setNewItemDialog(false)}
                  />
                </DialogContent>
              </Dialog>

              {/* Edit Item Dialog */}
              <Dialog open={editItemDialog} onOpenChange={setEditItemDialog}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Editar Partida del Presupuesto</DialogTitle>
                    <DialogDescription>
                      Modificar los detalles de la partida seleccionada
                    </DialogDescription>
                  </DialogHeader>
                  {selectedItem && (
                    <BudgetItemForm
                      projectId={projectId}
                      budgetVersion={currentBudgetVersion}
                      initialData={selectedItem}
                      onSuccess={() => {
                        setEditItemDialog(false);
                        setSelectedItem(null);
                        fetchBudgetItems();
                      }}
                      onCancel={() => {
                        setEditItemDialog(false);
                        setSelectedItem(null);
                      }}
                    />
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Budget Items Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Cargando partidas...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No hay partidas en el presupuesto</p>
              <p className="text-muted-foreground">Importa un archivo de Excel o crea nuevas partidas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="bg-muted/50">
                    <th className="text-left p-4 font-medium">Código</th>
                    <th className="text-left p-4 font-medium">Concepto</th>
                    <th className="text-left p-4 font-medium">Categoría</th>
                    <th className="text-left p-4 font-medium">Unidad</th>
                    <th className="text-right p-4 font-medium">Cantidad</th>
                    <th className="text-right p-4 font-medium">P.U.</th>
                    <th className="text-right p-4 font-medium">Total</th>
                    <th className="text-center p-4 font-medium">Progreso</th>
                    <th className="text-center p-4 font-medium">Estado</th>
                    <th className="text-center p-4 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-muted/30">
                      <td className="p-4 font-mono text-sm">{item.item_code}</td>
                      <td className="p-4">
                        <div>
                          <div className="font-medium">{item.item_name}</div>
                          {item.item_description && (
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {item.item_description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline">{item.category}</Badge>
                      </td>
                      <td className="p-4 text-sm">{item.unit_of_measure}</td>
                      <td className="p-4 text-right">{item.quantity.toLocaleString()}</td>
                      <td className="p-4 text-right">${item.unit_price.toLocaleString()}</td>
                      <td className="p-4 text-right font-medium">
                        ${item.total_price.toLocaleString()}
                      </td>
                      <td className="p-4">
                        <div className="w-20">
                          <Progress 
                            value={item.quantity > 0 ? (item.executed_quantity / item.quantity) * 100 : 0} 
                            className="h-2" 
                          />
                          <div className="text-xs text-center mt-1">
                            {item.quantity > 0 ? ((item.executed_quantity / item.quantity) * 100).toFixed(0) : 0}%
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <Badge variant={
                          item.status === 'completed' ? 'default' :
                          item.status === 'in_progress' ? 'secondary' :
                          item.status === 'on_hold' ? 'destructive' : 'outline'
                        }>
                          {item.status === 'completed' ? 'Completado' :
                           item.status === 'in_progress' ? 'En Progreso' :
                           item.status === 'on_hold' ? 'En Pausa' : 'Pendiente'}
                        </Badge>
                      </td>
                      <td className="p-4">
                      <div className="flex justify-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditItem(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteItem(item.id)}
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
    </div>
  );
}