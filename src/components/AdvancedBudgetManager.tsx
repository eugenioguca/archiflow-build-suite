import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  Upload, 
  Search, 
  Filter, 
  MoreHorizontal,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Plus,
  Settings,
  FileSpreadsheet,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { BudgetEditDialog } from './BudgetEditDialog';
import { BudgetItemDialog } from './BudgetItemDialog';
import { BudgetHistoryDialog } from './BudgetHistoryDialog';
import { BudgetAlertsPanel } from './BudgetAlertsPanel';
import { toast } from '@/hooks/use-toast';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

interface BudgetItem {
  id: string;
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  categoria: string;
  subcategoria?: string;
  supplier_id?: string;
  supplier_name?: string;
  status: 'pending' | 'approved' | 'ordered' | 'delivered';
  notas?: string;
  construction_project_id: string;
}

interface Supplier {
  id: string;
  company_name: string;
}

interface AdvancedBudgetManagerProps {
  constructionProjectId: string;
  onBudgetUpdate?: (newTotal: number) => void;
}

export function AdvancedBudgetManager({ 
  constructionProjectId, 
  onBudgetUpdate 
}: AdvancedBudgetManagerProps) {
  const [totalBudget, setTotalBudget] = useState(0);
  const [spentBudget, setSpentBudget] = useState(0);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<BudgetItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, [constructionProjectId]);

  useEffect(() => {
    filterItems();
  }, [budgetItems, searchTerm, categoryFilter, statusFilter]);

  const fetchData = async () => {
    if (!constructionProjectId) return;
    
    try {
      setLoading(true);
      
      // Fetch construction project data first
      const { data: project, error: projectError } = await supabase
        .from('construction_projects')
        .select('total_budget, spent_budget')
        .eq('id', constructionProjectId)
        .single();

      if (projectError) throw projectError;
      
      setTotalBudget(project.total_budget || 0);
      setSpentBudget(project.spent_budget || 0);

      await Promise.all([
        fetchBudgetItems(),
        fetchSuppliers()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBudgetItems = async () => {
    try {
      const { data, error } = await supabase
        .from('construction_budget_items')
        .select(`
          *,
          supplier:suppliers(company_name)
        `)
        .eq('construction_project_id', constructionProjectId)
        .order('categoria', { ascending: true });

      if (error) throw error;

      const itemsWithSupplier = (data || []).map((item: any) => ({
        ...item,
        supplier_name: item.supplier?.company_name
      }));

      setBudgetItems(itemsWithSupplier);
    } catch (error) {
      console.error('Error fetching budget items:', error);
      setBudgetItems([]);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, company_name')
        .order('company_name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setSuppliers([]);
    }
  };

  const deleteBudgetItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('construction_budget_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Partida eliminada",
        description: "La partida ha sido eliminada exitosamente"
      });

      fetchBudgetItems();
    } catch (error) {
      console.error('Error deleting budget item:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la partida",
        variant: "destructive"
      });
    }
  };

  const filterItems = () => {
    let filtered = budgetItems;

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.categoria === categoryFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    setFilteredItems(filtered);
    setCurrentPage(1);
  };

  const calculateTotals = () => {
    const totalPresupuestado = budgetItems.reduce((sum, item) => sum + item.total, 0);
    const totalAprobado = budgetItems
      .filter(item => item.status === 'approved')
      .reduce((sum, item) => sum + item.total, 0);
    const totalPendiente = budgetItems
      .filter(item => item.status === 'pending')
      .reduce((sum, item) => sum + item.total, 0);

    return { totalPresupuestado, totalAprobado, totalPendiente };
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-500/10 text-emerald-700';
      case 'pending': return 'bg-amber-500/10 text-amber-700';
      case 'ordered': return 'bg-blue-500/10 text-blue-700';
      case 'delivered': return 'bg-green-500/10 text-green-700';
      default: return 'bg-muted/10 text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Aprobado';
      case 'pending': return 'Pendiente';
      case 'ordered': return 'Ordenado';
      case 'delivered': return 'Entregado';
      default: return status;
    }
  };

  const exportToExcel = () => {
    // Implementation for Excel export
    toast({
      title: "Exportando...",
      description: "Generando archivo Excel con el presupuesto completo"
    });
  };

  const importFromExcel = () => {
    // Implementation for Excel import
    toast({
      title: "Importar Excel",
      description: "Funcionalidad de importación en desarrollo"
    });
  };

  const totals = calculateTotals();
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const categories = [...new Set(budgetItems.map(item => item.categoria))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Budget Alerts */}
      <BudgetAlertsPanel constructionProjectId={constructionProjectId} />
      
      {/* Header with KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-primary">
                  ${totals.totalPresupuestado.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Total Presupuestado</div>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-emerald-600">
                  ${totals.totalAprobado.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Aprobado</div>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-amber-600">
                  ${totals.totalPendiente.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Pendiente</div>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold">{budgetItems.length}</div>
                <div className="text-sm text-muted-foreground">Total Partidas</div>
                <Progress 
                  value={(totals.totalAprobado / totals.totalPresupuestado) * 100} 
                  className="h-2 mt-2" 
                />
              </div>
              <FileSpreadsheet className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, descripción o proveedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full lg:w-48">
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
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="approved">Aprobado</SelectItem>
                <SelectItem value="ordered">Ordenado</SelectItem>
                <SelectItem value="delivered">Entregado</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" onClick={importFromExcel}>
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </Button>
              <Button variant="outline" onClick={exportToExcel}>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <BudgetItemDialog 
                constructionProjectId={constructionProjectId}
                onSave={fetchBudgetItems}
              />
              <BudgetHistoryDialog constructionProjectId={constructionProjectId} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Partidas del Presupuesto</span>
            <Badge variant="outline">
              {filteredItems.length} de {budgetItems.length} partidas
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input type="checkbox" className="rounded" />
                  </TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Precio Unit.</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <input 
                        type="checkbox" 
                        className="rounded"
                        checked={selectedItems.includes(item.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems([...selectedItems, item.id]);
                          } else {
                            setSelectedItems(selectedItems.filter(id => id !== item.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.codigo}</TableCell>
                    <TableCell className="max-w-xs">
                      <div>
                        <div className="font-medium">{item.descripcion}</div>
                        {item.notas && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {item.notas}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{item.unidad}</TableCell>
                    <TableCell className="text-right">{item.cantidad.toLocaleString()}</TableCell>
                    <TableCell className="text-right">${item.precio_unitario.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-semibold">
                      ${item.total.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {item.supplier_name || 'Sin asignar'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(item.status)}>
                        {getStatusText(item.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalles
                          </DropdownMenuItem>
                          <BudgetItemDialog
                            constructionProjectId={constructionProjectId}
                            item={item}
                            onSave={fetchBudgetItems}
                            trigger={
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                            }
                          />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => deleteBudgetItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {filteredItems.length > itemsPerPage && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredItems.length)} de {filteredItems.length} partidas
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Anterior
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              disabled={currentPage * itemsPerPage >= filteredItems.length}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}