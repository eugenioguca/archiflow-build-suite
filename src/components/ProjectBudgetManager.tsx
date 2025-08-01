import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calculator, FileText, Download, Plus, Trash2, Edit } from "lucide-react";

interface BudgetItem {
  id: string;
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  item_order: number;
}

interface ProjectBudget {
  id: string;
  project_id: string;
  budget_name: string;
  total_amount: number;
  status: string;
  created_by: string;
  items?: BudgetItem[];
}

interface ProjectBudgetManagerProps {
  projectId: string;
  onBudgetUpdate?: (budget: ProjectBudget) => void;
}

export function ProjectBudgetManager({ projectId, onBudgetUpdate }: ProjectBudgetManagerProps) {
  const { toast } = useToast();
  const [budget, setBudget] = useState<ProjectBudget | null>(null);
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const defaultItems = [
    "Tierra", "Cimentación", "Muros PB", "Losa", "Muros PA", 
    "Tapalosa/Pretiles", "Aplanados int/ext", "Carpinterías", 
    "Cancelería", "Pintura", "Limpieza", "Jardín"
  ];

  useEffect(() => {
    fetchBudget();
  }, [projectId]);

  const fetchBudget = async () => {
    try {
      const { data: budgetData, error: budgetError } = await supabase
        .from("project_budgets")
        .select("*")
        .eq("project_id", projectId)
        .single();

      if (budgetError && budgetError.code !== "PGRST116") {
        throw budgetError;
      }

      if (budgetData) {
        setBudget(budgetData);
        await fetchBudgetItems(budgetData.id);
      } else {
        // Create default budget if none exists
        await createDefaultBudget();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo cargar el presupuesto",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createDefaultBudget = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Perfil no encontrado");

      const { data: budgetData, error: budgetError } = await supabase
        .from("project_budgets")
        .insert([{
          project_id: projectId,
          budget_name: "Presupuesto de Obra",
          created_by: profile.id
        }])
        .select()
        .single();

      if (budgetError) throw budgetError;

      setBudget(budgetData);

      // Create default items
      const defaultBudgetItems = defaultItems.map((item, index) => ({
        budget_id: budgetData.id,
        item_name: item,
        description: `Trabajos de ${item.toLowerCase()}`,
        quantity: 1,
        unit_price: 0,
        total_price: 0,
        item_order: index + 1
      }));

      const { data: itemsData, error: itemsError } = await supabase
        .from("budget_items")
        .insert(defaultBudgetItems)
        .select();

      if (itemsError) throw itemsError;
      setItems(itemsData || []);

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const fetchBudgetItems = async (budgetId: string) => {
    try {
      const { data, error } = await supabase
        .from("budget_items")
        .select("*")
        .eq("budget_id", budgetId)
        .order("item_order");

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las partidas",
        variant: "destructive"
      });
    }
  };

  const updateItem = async (item: BudgetItem) => {
    setSaving(true);
    try {
      const totalPrice = item.quantity * item.unit_price;
      const updatedItem = { ...item, total_price: totalPrice };

      const { error } = await supabase
        .from("budget_items")
        .update({
          item_name: updatedItem.item_name,
          description: updatedItem.description,
          quantity: updatedItem.quantity,
          unit_price: updatedItem.unit_price,
          total_price: updatedItem.total_price
        })
        .eq("id", updatedItem.id);

      if (error) throw error;

      setItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
      await updateBudgetTotal();

      toast({
        title: "Partida actualizada",
        description: "Los cambios han sido guardados"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const addNewItem = async () => {
    if (!budget) return;

    try {
      const newItem = {
        budget_id: budget.id,
        item_name: "Nueva Partida",
        description: "",
        quantity: 1,
        unit_price: 0,
        total_price: 0,
        item_order: items.length + 1
      };

      const { data, error } = await supabase
        .from("budget_items")
        .insert([newItem])
        .select()
        .single();

      if (error) throw error;
      setItems(prev => [...prev, data]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("budget_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      setItems(prev => prev.filter(i => i.id !== itemId));
      await updateBudgetTotal();

      toast({
        title: "Partida eliminada",
        description: "La partida ha sido removida del presupuesto"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const updateBudgetTotal = async () => {
    if (!budget) return;

    const total = items.reduce((sum, item) => sum + item.total_price, 0);

    try {
      const { error } = await supabase
        .from("project_budgets")
        .update({ total_amount: total })
        .eq("id", budget.id);

      if (error) throw error;

      setBudget(prev => prev ? { ...prev, total_amount: total } : null);
      
      if (onBudgetUpdate) {
        onBudgetUpdate({ ...budget, total_amount: total });
      }
    } catch (error: any) {
      console.error("Error updating budget total:", error);
    }
  };

  const exportToPDF = async () => {
    // This would integrate with a PDF generation library
    toast({
      title: "Exportación a PDF",
      description: "Esta funcionalidad estará disponible próximamente"
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const totalBudget = items.reduce((sum, item) => sum + item.total_price, 0);

  if (loading) {
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
            <Calculator className="h-5 w-5" />
            {budget?.budget_name || "Presupuesto de Obra"}
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={addNewItem} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Añadir Partida
            </Button>
            <Button onClick={exportToPDF} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Total del Presupuesto</div>
          <div className="text-2xl font-bold text-primary">
            {formatCurrency(totalBudget)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Partida</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-center">Cantidad</TableHead>
              <TableHead className="text-right">Precio Unitario</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Input
                    value={item.item_name}
                    onChange={(e) => {
                      const updatedItems = items.map(i => 
                        i.id === item.id ? { ...i, item_name: e.target.value } : i
                      );
                      setItems(updatedItems);
                    }}
                    onBlur={() => updateItem(item)}
                    className="border-none p-1 font-medium"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={item.description || ""}
                    onChange={(e) => {
                      const updatedItems = items.map(i => 
                        i.id === item.id ? { ...i, description: e.target.value } : i
                      );
                      setItems(updatedItems);
                    }}
                    onBlur={() => updateItem(item)}
                    className="border-none p-1"
                    placeholder="Descripción..."
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => {
                      const quantity = parseFloat(e.target.value) || 0;
                      const updatedItems = items.map(i => 
                        i.id === item.id ? { ...i, quantity } : i
                      );
                      setItems(updatedItems);
                    }}
                    onBlur={() => updateItem(item)}
                    className="border-none p-1 text-center w-20"
                    min="0"
                    step="0.01"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={item.unit_price}
                    onChange={(e) => {
                      const unit_price = parseFloat(e.target.value) || 0;
                      const updatedItems = items.map(i => 
                        i.id === item.id ? { ...i, unit_price } : i
                      );
                      setItems(updatedItems);
                    }}
                    onBlur={() => updateItem(item)}
                    className="border-none p-1 text-right w-32"
                    min="0"
                    step="0.01"
                  />
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(item.quantity * item.unit_price)}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteItem(item.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {items.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay partidas en el presupuesto</p>
            <Button onClick={addNewItem} size="sm" className="mt-2">
              Añadir Primera Partida
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}