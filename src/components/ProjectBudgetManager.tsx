import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CurrencyInput } from "@/components/CurrencyInput";
import { usePaymentPlans } from "@/hooks/usePaymentPlans";
import { usePaymentInstallments } from "@/hooks/usePaymentInstallments";
import { Calculator, FileText, Download, Plus, Trash2, Edit, CheckCircle, AlertTriangle } from "lucide-react";
import { toast as sonnerToast } from "sonner";

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

interface MigrationResult {
  items_migrated: number;
  status: string;
  message: string;
}

interface ProjectBudgetManagerProps {
  projectId: string;
  projectName?: string;
  clientName?: string;
  onBudgetUpdate?: (budget: ProjectBudget) => void;
}

export function ProjectBudgetManager({ projectId, projectName, clientName, onBudgetUpdate }: ProjectBudgetManagerProps) {
  const { toast } = useToast();
  const [budget, setBudget] = useState<ProjectBudget | null>(null);
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAcceptBudgetDialog, setShowAcceptBudgetDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Payment plan validation hooks
  const { paymentPlans } = usePaymentPlans(projectId, 'construction_payment');
  const currentConstructionPlan = paymentPlans?.find(plan => plan.is_current_plan === true);
  const { installments } = usePaymentInstallments(currentConstructionPlan?.id);

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
      // Actualizar total del presupuesto - el trigger se encargará de sync con construction_budget
      const { error } = await supabase
        .from("project_budgets")
        .update({ total_amount: total })
        .eq("id", budget.id);

      if (error) throw error;

      setBudget(prev => prev ? { ...prev, total_amount: total } : null);
      
      if (onBudgetUpdate) {
        onBudgetUpdate({ ...budget, total_amount: total });
      }

      // Mostrar mensaje de sincronización
      if (total > 0) {
        toast({
          title: "Presupuesto actualizado",
          description: "El presupuesto de obra ha sido sincronizado con el proyecto"
        });
      }
    } catch (error: any) {
      console.error("Error updating budget total:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el presupuesto",
        variant: "destructive"
      });
    }
  };

  const handleAcceptBudget = async () => {
    if (!budget) return;
    
    try {
      setSaving(true);
      
      // Update budget status to approved (consistent with migration function)
      const { error: budgetError } = await supabase
        .from('project_budgets')
        .update({ status: 'approved' })
        .eq('id', budget.id);
        
      if (budgetError) throw budgetError;
      
      // Migrate budget to construction and get the real total
      const migrationResult = await supabase.rpc('migrate_design_budget_to_construction', {
        p_project_id: projectId
      });
      
      // Get the actual total from construction_budget_items
      const { data: constructionItems } = await supabase
        .from('construction_budget_items')
        .select('total_price')
        .eq('project_id', projectId);
      
      const actualConstructionBudget = constructionItems?.reduce((sum, item) => 
        sum + (item.total_price || 0), 0) || 0;
      
      // Update client_projects construction_budget with the real value
      const { error: projectError } = await supabase
        .from('client_projects')
        .update({ construction_budget: actualConstructionBudget })
        .eq('id', projectId);
        
      if (projectError) throw projectError;
      
      // Call migration function directly to ensure it runs even if trigger fails
      try {
        const { data: migrationResult } = await supabase.rpc('migrate_design_budget_to_construction', {
          p_project_id: projectId
        }) as { data: MigrationResult };
        
        if (migrationResult?.status === 'success' && migrationResult?.items_migrated > 0) {
          sonnerToast.success(`Presupuesto aprobado y ${migrationResult.items_migrated} partidas migradas a construcción.`);
        } else if (migrationResult?.status === 'already_exists') {
          sonnerToast.success('Presupuesto aprobado. Las partidas ya están disponibles en construcción.');
        } else {
          sonnerToast.success('Presupuesto aprobado. Ahora se puede crear el plan de pagos de construcción.');
        }
      } catch (migrationError) {
        console.warn('Migration error (may have been handled by trigger):', migrationError);
        sonnerToast.success('Presupuesto aprobado. Ahora se puede crear el plan de pagos de construcción.');
      }
      
      setShowAcceptBudgetDialog(false);
      
      // Refresh budget data
      await fetchBudget();
      
    } catch (error) {
      console.error('Error accepting budget:', error);
      sonnerToast.error('Error al aceptar el presupuesto');
    } finally {
      setSaving(false);
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

  // Validate construction payment requirements
  const validateConstructionPaymentRequirements = () => {
    const hasConstructionPlan = currentConstructionPlan && 
      currentConstructionPlan.status === 'approved';
    
    const firstInstallment = installments?.find(inst => inst.installment_number === 1);
    const firstInstallmentPaid = firstInstallment?.status === 'paid';
    
    return {
      hasConstructionPlan,
      firstInstallmentPaid,
      isValid: hasConstructionPlan && firstInstallmentPaid,
      planStatus: currentConstructionPlan?.status || 'none',
      message: !hasConstructionPlan 
        ? 'Se requiere crear un plan de pagos de construcción aprobado'
        : !firstInstallmentPaid 
        ? 'Se requiere el pago de la primera parcialidad de construcción'
        : 'Todos los requisitos cumplidos'
    };
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
            
            <Button 
              variant="default" 
              size="sm"
              onClick={() => setShowAcceptBudgetDialog(true)}
              disabled={!budget || budget.total_amount <= 0 || budget.status === 'approved'}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {budget?.status === 'approved' ? 'Presupuesto Aprobado' : 'Cliente Acepta Presupuesto'}
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
                  <CurrencyInput
                    value={item.unit_price}
                    onChange={(unit_price) => {
                      const updatedItems = items.map(i => 
                        i.id === item.id ? { ...i, unit_price } : i
                      );
                      setItems(updatedItems);
                    }}
                    onBlur={() => updateItem(item)}
                    className="border-none p-1 w-32"
                    placeholder="$ 0.00"
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
      
      {/* PDF Export Section - Disabled (component removed) */}
      {budget && items.length > 0 && (
        <div className="p-6 border-t">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Exportar Presupuesto</h4>
              <p className="text-sm text-muted-foreground">
                La funcionalidad de exportación PDF estará disponible próximamente
              </p>
            </div>
            <Button 
              onClick={() => alert("Funcionalidad no disponible")}
              variant="outline"
            >
              Exportar PDF
            </Button>
          </div>
        </div>
      )}
      
      <Dialog open={showAcceptBudgetDialog} onOpenChange={setShowAcceptBudgetDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Aceptación del Presupuesto</DialogTitle>
            <DialogDescription>
              Para que el proyecto pueda avanzar a construcción, se requiere completar los siguientes pasos:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-3">Presupuesto de Obra</h4>
              <div className="flex items-center justify-between">
                <span>Total: {formatCurrency(budget?.total_amount || 0)}</span>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>

            {(() => {
              const validation = validateConstructionPaymentRequirements();
              return (
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Requisitos para Construcción
                  </h4>
                  
                  <div className="space-y-2 ml-6">
                    <div className="flex items-center gap-2">
                      {validation.hasConstructionPlan ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                      )}
                      <span className={validation.hasConstructionPlan ? 'text-green-700' : 'text-gray-600'}>
                        Plan de pagos de construcción aprobado
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {validation.firstInstallmentPaid ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                      )}
                      <span className={validation.firstInstallmentPaid ? 'text-green-700' : 'text-gray-600'}>
                        Primera parcialidad de construcción pagada
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      {validation.message}
                    </p>
                    {!validation.isValid && (
                      <p className="text-xs text-blue-600 mt-1">
                        Una vez cumplidos estos requisitos, el proyecto transitará automáticamente a construcción.
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleAcceptBudget}
                disabled={saving}
                className="flex-1"
              >
                {saving ? 'Procesando...' : 'Aprobar Presupuesto'}
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowAcceptBudgetDialog(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}