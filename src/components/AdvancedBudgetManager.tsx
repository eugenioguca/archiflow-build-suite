import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BudgetItemForm } from '@/components/forms/BudgetItemForm';
import { BudgetEditDialog } from '@/components/BudgetEditDialog';
import { BudgetChangeHistory } from '@/components/BudgetChangeHistory';
import { 
  Download, 
  Upload, 
  Plus, 
  Edit, 
  Trash2, 
  FileSpreadsheet, 
  TrendingUp,
  DollarSign,
  Percent,
  Target,
  AlertTriangle,
  History,
  RefreshCw,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';

interface BudgetItem {
  id: string;
  item_code?: string;
  item_name: string;
  item_description?: string;
  category: string;
  subcategory?: string;
  unit_of_measure: string;
  quantity: number;
  unit_price: number;
  material_cost?: number;
  labor_cost?: number;
  equipment_cost?: number;
  overhead_percentage?: number;
  profit_percentage?: number;
  total_price: number;
  executed_quantity?: number;
  remaining_quantity?: number;
  executed_amount?: number;
  status?: string;
  item_order: number;
  budget_version?: number;
  supplier_id?: string;
  created_at: string;
  updated_at: string;
}

interface AdvancedBudgetManagerProps {
  projectId: string;
}

export function AdvancedBudgetManager({ projectId }: AdvancedBudgetManagerProps) {
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [migratingBudget, setMigratingBudget] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    search: ''
  });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [historyItemId, setHistoryItemId] = useState<string | undefined>();
  const [currentBudgetVersion, setCurrentBudgetVersion] = useState(1);
  const [hasDesignBudget, setHasDesignBudget] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchBudgetItems = useCallback(async () => {
    try {
      setLoading(true);
      
      // Check if we have construction budget items
      const { data: constructionItems, error: constructionError } = await supabase
        .from('construction_budget_items')
        .select('*')
        .eq('project_id', projectId)
        .eq('budget_version', currentBudgetVersion)
        .order('item_order');

      if (constructionError) throw constructionError;

      // If no construction items, check for approved design budget
      if (!constructionItems || constructionItems.length === 0) {
        await checkForDesignBudget();
      } else {
        setBudgetItems(constructionItems);
        setHasDesignBudget(false);
      }
    } catch (error: any) {
      console.error('Error fetching budget items:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las partidas del presupuesto",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, currentBudgetVersion, toast]);

  const checkForDesignBudget = async () => {
    try {
      // Check if there's an approved design budget
      const { data: designBudget, error: designError } = await supabase
        .from('project_budgets')
        .select(`
          *,
          budget_items (*)
        `)
        .eq('project_id', projectId)
        .eq('status', 'approved')
        .single();

      if (designError && designError.code !== 'PGRST116') {
        throw designError;
      }

      if (designBudget && designBudget.budget_items?.length > 0) {
        setHasDesignBudget(true);
        setBudgetItems([]); // Clear current items to show migration option
      } else {
        setHasDesignBudget(false);
        setBudgetItems([]);
      }
    } catch (error: any) {
      console.error('Error checking design budget:', error);
      setHasDesignBudget(false);
      setBudgetItems([]);
    }
  };

  useEffect(() => {
    fetchBudgetItems();
  }, [fetchBudgetItems]);

  const migrateBudgetFromDesign = async () => {
    try {
      setMigratingBudget(true);
      
      // Call the migration function
      const { error } = await supabase.rpc('migrate_design_budget_to_construction', {
        p_project_id: projectId
      });

      if (error) throw error;

      toast({
        title: "Presupuesto Migrado",
        description: "El presupuesto de diseño se ha cargado exitosamente al módulo de construcción",
      });

      // Refresh the budget items
      await fetchBudgetItems();
    } catch (error: any) {
      console.error('Error migrating budget:', error);
      toast({
        title: "Error",
        description: "No se pudo migrar el presupuesto de diseño",
        variant: "destructive"
      });
    } finally {
      setMigratingBudget(false);
    }
  };

  const calculateTotals = () => {
    const filteredItems = budgetItems.filter(item => {
      const matchesCategory = !filters.category || item.category === filters.category;
      const matchesStatus = !filters.status || item.status === filters.status;
      const matchesSearch = !filters.search || 
        item.item_name.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.item_description?.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.item_code?.toLowerCase().includes(filters.search.toLowerCase());
      
      return matchesCategory && matchesStatus && matchesSearch;
    });

    const totalBudget = filteredItems.reduce((sum, item) => sum + item.total_price, 0);
    const executedAmount = filteredItems.reduce((sum, item) => sum + (item.executed_amount || 0), 0);
    
    return {
      totalItems: filteredItems.length,
      totalBudget,
      executedAmount,
      progressPercentage: totalBudget > 0 ? (executedAmount / totalBudget) * 100 : 0
    };
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Perfil de usuario no encontrado');

      // Map Excel data to budget items
      const importedItems = jsonData.map((row: any, index: number) => ({
        project_id: projectId,
        budget_version: currentBudgetVersion,
        item_code: row['Código'] || row['codigo'] || `ITEM-${index + 1}`,
        item_name: row['Concepto'] || row['concepto'] || '',
        item_description: row['Descripción'] || row['descripcion'] || '',
        category: row['Categoría'] || row['categoria'] || 'General',
        subcategory: row['Subcategoría'] || row['subcategoria'] || '',
        unit_of_measure: row['Unidad'] || row['unidad'] || 'PZA',
        quantity: parseFloat(row['Cantidad'] || row['cantidad'] || 1),
        unit_price: parseFloat(row['Precio Unitario'] || row['precio_unitario'] || 0),
        total_price: parseFloat(row['Total'] || row['total'] || 0),
        item_order: index + 1,
        status: 'pending',
        created_by: profile.id
      }));

      // Calculate total price if not provided
      importedItems.forEach(item => {
        if (!item.total_price) {
          item.total_price = item.quantity * item.unit_price;
        }
      });

      const { error } = await supabase
        .from('construction_budget_items')
        .insert(importedItems);

      if (error) throw error;

      toast({
        title: "Importación Exitosa",
        description: `Se importaron ${importedItems.length} partidas correctamente`,
      });

      fetchBudgetItems();
    } catch (error: any) {
      console.error('Error importing Excel:', error);
      toast({
        title: "Error",
        description: "No se pudo importar el archivo de Excel",
        variant: "destructive"
      });
    }
  };

  const exportToExcel = () => {
    try {
      const exportData = budgetItems.map(item => ({
        'Código': item.item_code || '',
        'Concepto': item.item_name,
        'Descripción': item.item_description || '',
        'Categoría': item.category,
        'Unidad': item.unit_of_measure,
        'Cantidad': item.quantity,
        'Precio Unitario': item.unit_price,
        'Total': item.total_price,
        'Cantidad Ejecutada': item.executed_quantity || 0,
        'Monto Ejecutado': item.executed_amount || 0,
        'Estado': item.status || 'pending'
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Presupuesto');

      const fileName = `presupuesto_construccion_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast({
        title: "Exportación Exitosa",
        description: "El presupuesto se ha exportado correctamente",
      });
    } catch (error: any) {
      console.error('Error exporting Excel:', error);
      toast({
        title: "Error",
        description: "No se pudo exportar el presupuesto",
        variant: "destructive"
      });
    }
  };

  const handleEditItem = (item: BudgetItem) => {
    setEditingItem(item);
    setShowEditDialog(true);
  };

  const handleSaveEditedItem = async (updatedItem: BudgetItem, changeReason: string, changeComments?: string) => {
    try {
      setSaving(true);
      
      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Perfil de usuario no encontrado');

      // Get original item for comparison
      const originalItem = budgetItems.find(item => item.id === updatedItem.id);
      if (!originalItem) throw new Error('Partida original no encontrada');

      // Update the budget item
      const { error: updateError } = await supabase
        .from('construction_budget_items')
        .update({
          item_code: updatedItem.item_code,
          item_name: updatedItem.item_name,
          item_description: updatedItem.item_description,
          category: updatedItem.category,
          quantity: updatedItem.quantity,
          unit_price: updatedItem.unit_price,
          total_price: updatedItem.total_price,
          unit_of_measure: updatedItem.unit_of_measure,
          status: updatedItem.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedItem.id);

      if (updateError) throw updateError;

      // Log the changes
      const changes = [];
      if (originalItem.quantity !== updatedItem.quantity) {
        changes.push({
          change_type: 'quantity',
          old_value: originalItem.quantity.toString(),
          new_value: updatedItem.quantity.toString()
        });
      }
      if (originalItem.unit_price !== updatedItem.unit_price) {
        changes.push({
          change_type: 'unit_price',
          old_value: originalItem.unit_price.toString(),
          new_value: updatedItem.unit_price.toString()
        });
      }
      if (originalItem.total_price !== updatedItem.total_price) {
        changes.push({
          change_type: 'total_price',
          old_value: originalItem.total_price.toString(),
          new_value: updatedItem.total_price.toString()
        });
      }
      if (originalItem.status !== updatedItem.status) {
        changes.push({
          change_type: 'status',
          old_value: originalItem.status || '',
          new_value: updatedItem.status || ''
        });
      }
      if (originalItem.item_description !== updatedItem.item_description) {
        changes.push({
          change_type: 'description',
          old_value: originalItem.item_description || '',
          new_value: updatedItem.item_description || ''
        });
      }

      // Insert change logs
      if (changes.length > 0) {
        const changeLogs = changes.map(change => ({
          budget_item_id: updatedItem.id,
          project_id: projectId,
          changed_by: profile.id,
          change_type: change.change_type,
          old_value: change.old_value,
          new_value: change.new_value,
          change_reason: changeReason,
          change_comments: changeComments
        }));

        const { error: logError } = await supabase
          .from('budget_change_log')
          .insert(changeLogs);

        if (logError) {
          console.error('Error logging changes:', logError);
          // Don't fail the update for logging errors
        }
      }

      toast({
        title: "Partida Actualizada",
        description: "Los cambios han sido guardados exitosamente",
      });

      // Refresh the budget items
      await fetchBudgetItems();
    } catch (error: any) {
      console.error('Error updating budget item:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la partida",
        variant: "destructive"
      });
      throw error; // Re-throw to prevent dialog closure
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta partida?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('construction_budget_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Partida Eliminada",
        description: "La partida ha sido eliminada correctamente",
      });

      fetchBudgetItems();
    } catch (error: any) {
      console.error('Error deleting budget item:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la partida",
        variant: "destructive"
      });
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const totals = calculateTotals();

  const filteredItems = budgetItems.filter(item => {
    const matchesCategory = !filters.category || item.category === filters.category;
    const matchesStatus = !filters.status || item.status === filters.status;
    const matchesSearch = !filters.search || 
      item.item_name.toLowerCase().includes(filters.search.toLowerCase()) ||
      item.item_description?.toLowerCase().includes(filters.search.toLowerCase()) ||
      item.item_code?.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesCategory && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Migration Banner */}
      {hasDesignBudget && budgetItems.length === 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-amber-100 p-3">
                  <CheckCircle className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-900">
                    Presupuesto de Diseño Disponible
                  </h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Se encontró un presupuesto aprobado en el módulo de diseño. 
                    ¿Deseas cargarlo automáticamente al módulo de construcción?
                  </p>
                </div>
              </div>
              <Button 
                onClick={migrateBudgetFromDesign}
                disabled={migratingBudget}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {migratingBudget ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Migrando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Cargar Presupuesto
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="rounded-lg bg-blue-100 p-3">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total de Partidas</p>
                <p className="text-2xl font-bold">{totals.totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="rounded-lg bg-green-100 p-3">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Presupuesto Total</p>
                <p className="text-2xl font-bold">${totals.totalBudget.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="rounded-lg bg-purple-100 p-3">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Ejecutado</p>
                <p className="text-2xl font-bold">${totals.executedAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="rounded-lg bg-orange-100 p-3">
                <Percent className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Progreso</p>
                <p className="text-2xl font-bold">{totals.progressPercentage.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Presupuesto de Construcción</CardTitle>
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <Input
                placeholder="Buscar partidas..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="max-w-xs"
              />
              
              <Select
                value={filters.category || 'all'}
                onValueChange={(value) => setFilters(prev => ({ ...prev, category: value === 'all' ? '' : value }))}
              >
                <SelectTrigger className="max-w-xs">
                  <SelectValue placeholder="Filtrar por categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="Estructural">Estructural</SelectItem>
                  <SelectItem value="Acabados">Acabados</SelectItem>
                  <SelectItem value="Instalaciones">Instalaciones</SelectItem>
                  <SelectItem value="Equipamiento">Equipamiento</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === 'all' ? '' : value }))}
              >
                <SelectTrigger className="max-w-xs">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="in_progress">En Progreso</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                  <SelectItem value="on_hold">En Pausa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 flex-wrap">
            <Button onClick={exportToExcel} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportExcel}
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
            />
            <Button onClick={() => fileInputRef.current?.click()} variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Importar Excel
            </Button>

            <Button 
              onClick={() => setShowHistoryDialog(true)}
              variant="outline"
            >
              <History className="h-4 w-4 mr-2" />
              Ver Historial
            </Button>

            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Partida
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? 'Editar Partida' : 'Nueva Partida'}
                  </DialogTitle>
                </DialogHeader>
                <BudgetItemForm
                  projectId={projectId}
                  budgetVersion={currentBudgetVersion}
                  initialData={editingItem}
                  onSuccess={() => {
                    setShowAddDialog(false);
                    setEditingItem(null);
                    fetchBudgetItems();
                  }}
                  onCancel={() => {
                    setShowAddDialog(false);
                    setEditingItem(null);
                  }}
                />
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
            <div className="p-8 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center">
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No hay partidas disponibles</h3>
              <p className="text-muted-foreground mt-2">
                {budgetItems.length === 0 
                  ? 'Agrega partidas al presupuesto o importa desde Excel'
                  : 'No se encontraron partidas con los filtros aplicados'
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Partida</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Precio Unitario</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Progreso</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">
                      {item.item_code || '—'}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.item_name}</p>
                        {item.item_description && (
                          <p className="text-sm text-muted-foreground">
                            {item.item_description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.category}</Badge>
                    </TableCell>
                    <TableCell>
                      {item.quantity} {item.unit_of_measure}
                    </TableCell>
                    <TableCell>${item.unit_price.toLocaleString()}</TableCell>
                    <TableCell className="font-semibold">
                      ${item.total_price.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {item.executed_amount && item.total_price > 0 ? (
                        <div className="space-y-1">
                          <div className="text-sm">
                            {((item.executed_amount / item.total_price) * 100).toFixed(1)}%
                          </div>
                          <div className="w-16 bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{ 
                                width: `${Math.min(100, (item.executed_amount / item.total_price) * 100)}%` 
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">0%</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          item.status === 'completed' ? 'default' :
                          item.status === 'in_progress' ? 'secondary' :
                          item.status === 'on_hold' ? 'destructive' :
                          'outline'
                        }
                      >
                        {item.status === 'pending' && 'Pendiente'}
                        {item.status === 'in_progress' && 'En Progreso'}
                        {item.status === 'completed' && 'Completado'}
                        {item.status === 'on_hold' && 'En Pausa'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleEditItem(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setHistoryItemId(item.id);
                          setShowHistoryDialog(true);
                        }}
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <BudgetEditDialog
        isOpen={showEditDialog}
        onClose={() => {
          setShowEditDialog(false);
          setEditingItem(null);
        }}
        item={editingItem}
        onSave={handleSaveEditedItem}
        isSaving={saving}
      />

      {/* History Dialog */}
      <BudgetChangeHistory
        isOpen={showHistoryDialog}
        onClose={() => {
          setShowHistoryDialog(false);
          setHistoryItemId(undefined);
        }}
        projectId={projectId}
        itemId={historyItemId}
      />
    </div>
  );
}