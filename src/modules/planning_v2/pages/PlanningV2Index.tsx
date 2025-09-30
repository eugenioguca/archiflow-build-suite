/**
 * Planning v2 - Index page
 * Lista de presupuestos con filtros avanzados, paginación y papelera
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Search, Trash2, MoreVertical, ArchiveRestore, AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import type { BudgetListItem } from '../types';
import { NewBudgetWizard } from '../components/wizard/NewBudgetWizard';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { clientsAdapter } from '../adapters/clients';
import { projectsAdapter } from '../adapters/projects';
import { moveToTrash, restoreBudget, deleteBudgetPermanently } from '../services/budgetService';
import { useToast } from '@/hooks/use-toast';

const ITEMS_PER_PAGE = 20;

export default function PlanningV2Index() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [budgets, setBudgets] = useState<BudgetListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  
  // Clients and Projects
  const [clients, setClients] = useState<Array<{ value: string; label: string }>>([]);
  const [projects, setProjects] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  
  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    budgetId: string | null;
    budgetName: string;
    action: 'trash' | 'restore' | 'permanent';
  }>({
    open: false,
    budgetId: null,
    budgetName: '',
    action: 'trash'
  });

  // Cleanup dialog on unmount to prevent stuck overlays
  useEffect(() => {
    return () => {
      setDeleteDialog({ open: false, budgetId: null, budgetName: '', action: 'trash' });
    };
  }, []);

  // Load clients for filter
  useEffect(() => {
    loadClients();
  }, []);

  // Load projects when client changes
  useEffect(() => {
    if (selectedClientId) {
      loadProjects(selectedClientId);
    } else {
      setProjects([]);
      setSelectedProjectId('');
    }
  }, [selectedClientId]);

  useEffect(() => {
    loadBudgets();
  }, [showTrash]);

  const loadClients = async () => {
    try {
      setLoadingClients(true);
      const clientsData = await clientsAdapter.getAll();
      setClients(
        clientsData.map((c) => ({
          value: c.id,
          label: c.full_name
        }))
      );
    } catch (error) {
      console.error('Error loading clients:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los clientes',
        variant: 'destructive'
      });
    } finally {
      setLoadingClients(false);
    }
  };

  const loadProjects = async (clientId: string) => {
    try {
      setLoadingProjects(true);
      const result = await projectsAdapter.search({ clientId });
      setProjects(
        result.items.map((p) => ({
          value: p.id,
          label: p.project_name
        }))
      );
    } catch (error) {
      console.error('Error loading projects:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los proyectos',
        variant: 'destructive'
      });
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadBudgets = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('planning_budgets')
        .select(`
          id,
          name,
          status,
          created_at,
          updated_at,
          deleted_at,
          project_id,
          client_id
        `)
        .order('created_at', { ascending: false });

      // Filter by trash status
      if (showTrash) {
        query = query.not('deleted_at', 'is', null);
      } else {
        query = query.is('deleted_at', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data to include project and client names
      const budgetsWithNames: BudgetListItem[] = await Promise.all(
        (data || []).map(async (budget) => {
          let projectName = null;
          let clientName = null;

          if (budget.project_id) {
            const { data: project } = await supabase
              .from('client_projects')
              .select('project_name')
              .eq('id', budget.project_id)
              .single();
            projectName = project?.project_name || null;
          }

          if (budget.client_id) {
            const { data: client } = await supabase
              .from('clients')
              .select('full_name')
              .eq('id', budget.client_id)
              .single();
            clientName = client?.full_name || null;
          }

          return {
            id: budget.id,
            name: budget.name,
            project_name: projectName,
            client_name: clientName,
            status: budget.status as 'draft' | 'published' | 'closed',
            created_at: budget.created_at,
            updated_at: budget.updated_at,
            deleted_at: budget.deleted_at,
            project_id: budget.project_id,
            client_id: budget.client_id
          };
        })
      );

      setBudgets(budgetsWithNames);
    } catch (error) {
      console.error('Error loading budgets:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los presupuestos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNewBudget = () => {
    setWizardOpen(true);
  };

  // Mutations with proper cleanup - close dialog FIRST, then refresh
  const moveToTrashMutation = useMutation({
    mutationFn: (budgetId: string) => moveToTrash(budgetId),
    onSuccess: async () => {
      // 1. Close dialog immediately
      setDeleteDialog({ open: false, budgetId: null, budgetName: '', action: 'trash' });
      
      // 2. Yield a frame to let dialog unmount
      await new Promise(r => setTimeout(r, 0));
      
      // 3. Show toast and refresh
      toast({
        title: 'Presupuesto movido a papelera',
        description: 'El presupuesto se movió a la papelera exitosamente'
      });
      loadBudgets();
    },
    onError: (error: any) => {
      console.error('Error moving to trash:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo mover el presupuesto a la papelera',
        variant: 'destructive'
      });
    },
    onSettled: () => {
      // Always ensure dialog is closed
      setDeleteDialog({ open: false, budgetId: null, budgetName: '', action: 'trash' });
    }
  });

  const restoreMutation = useMutation({
    mutationFn: (budgetId: string) => restoreBudget(budgetId),
    onSuccess: async () => {
      // 1. Close dialog immediately
      setDeleteDialog({ open: false, budgetId: null, budgetName: '', action: 'trash' });
      
      // 2. Yield a frame to let dialog unmount
      await new Promise(r => setTimeout(r, 0));
      
      // 3. Show toast and refresh
      toast({
        title: 'Presupuesto restaurado',
        description: 'El presupuesto se restauró exitosamente'
      });
      loadBudgets();
    },
    onError: (error: any) => {
      console.error('Error restoring budget:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo restaurar el presupuesto',
        variant: 'destructive'
      });
    },
    onSettled: () => {
      // Always ensure dialog is closed
      setDeleteDialog({ open: false, budgetId: null, budgetName: '', action: 'trash' });
    }
  });

  const deletePermanentlyMutation = useMutation({
    mutationFn: (budgetId: string) => deleteBudgetPermanently(budgetId),
    onSuccess: async () => {
      // 1. Close dialog immediately
      setDeleteDialog({ open: false, budgetId: null, budgetName: '', action: 'trash' });
      
      // 2. Yield a frame to let dialog unmount
      await new Promise(r => setTimeout(r, 0));
      
      // 3. Show toast and refresh
      toast({
        title: 'Presupuesto eliminado',
        description: 'El presupuesto se eliminó permanentemente'
      });
      loadBudgets();
    },
    onError: (error: any) => {
      console.error('Error deleting budget:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar el presupuesto',
        variant: 'destructive'
      });
    },
    onSettled: () => {
      // Always ensure dialog is closed
      setDeleteDialog({ open: false, budgetId: null, budgetName: '', action: 'trash' });
    }
  });

  const confirmAction = () => {
    if (!deleteDialog.budgetId) return;

    // Execute the appropriate mutation
    switch (deleteDialog.action) {
      case 'trash':
        moveToTrashMutation.mutate(deleteDialog.budgetId);
        break;
      case 'restore':
        restoreMutation.mutate(deleteDialog.budgetId);
        break;
      case 'permanent':
        deletePermanentlyMutation.mutate(deleteDialog.budgetId);
        break;
    }
  };

  // Check if any mutation is pending
  const isDeleting = moveToTrashMutation.isPending || restoreMutation.isPending || deletePermanentlyMutation.isPending;

  // Filter budgets
  const filteredBudgets = useMemo(() => {
    let filtered = budgets;

    // Text search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.name.toLowerCase().includes(term) ||
          b.project_name?.toLowerCase().includes(term) ||
          b.client_name?.toLowerCase().includes(term)
      );
    }

    // Client filter
    if (selectedClientId) {
      filtered = filtered.filter((b) => b.client_id === selectedClientId);
    }

    // Project filter
    if (selectedProjectId) {
      filtered = filtered.filter((b) => b.project_id === selectedProjectId);
    }

    return filtered;
  }, [budgets, searchTerm, selectedClientId, selectedProjectId]);

  // Paginate
  const paginatedBudgets = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBudgets.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredBudgets, currentPage]);

  const totalPages = Math.ceil(filteredBudgets.length / ITEMS_PER_PAGE);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Borrador', className: 'bg-gray-100 text-gray-800' },
      published: { label: 'Publicado', className: 'bg-green-100 text-green-800' },
      closed: { label: 'Cerrado', className: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const handleDuplicate = async (budget: BudgetListItem) => {
    // TODO: Implement duplicate functionality
    toast({
      title: 'Funcionalidad no disponible',
      description: 'La duplicación de presupuestos estará disponible próximamente',
      variant: 'default'
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Planeación v2 (Beta)</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona presupuestos con el nuevo sistema de planeación
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showTrash ? 'default' : 'outline'}
            onClick={() => {
              setShowTrash(!showTrash);
              setCurrentPage(1);
            }}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {showTrash ? 'Ver presupuestos' : 'Papelera'}
          </Button>
          <Button onClick={handleNewBudget} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo presupuesto
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {showTrash ? 'Papelera' : 'Presupuestos'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          {!showTrash && (
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o folio..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Cliente</label>
                <SearchableCombobox
                  items={clients}
                  value={selectedClientId}
                  onValueChange={(value) => {
                    setSelectedClientId(value);
                    setCurrentPage(1);
                  }}
                  placeholder="Todos los clientes"
                  searchPlaceholder="Buscar cliente..."
                  emptyText="No se encontraron clientes"
                  loading={loadingClients}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Proyecto</label>
                <SearchableCombobox
                  items={projects}
                  value={selectedProjectId}
                  onValueChange={(value) => {
                    setSelectedProjectId(value);
                    setCurrentPage(1);
                  }}
                  placeholder="Todos los proyectos"
                  searchPlaceholder="Buscar proyecto..."
                  emptyText="No se encontraron proyectos"
                  loading={loadingProjects}
                  disabled={!selectedClientId}
                />
              </div>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : paginatedBudgets.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                {showTrash
                  ? 'La papelera está vacía'
                  : filteredBudgets.length === 0 && budgets.length > 0
                  ? 'No se encontraron presupuestos'
                  : 'Sin presupuestos todavía'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {showTrash
                  ? 'No hay presupuestos en la papelera'
                  : filteredBudgets.length === 0 && budgets.length > 0
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'Crea tu primer presupuesto para comenzar'}
              </p>
              {!showTrash && budgets.length === 0 && (
                <Button onClick={handleNewBudget} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Crear primer presupuesto
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Proyecto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Última edición</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBudgets.map((budget) => (
                    <TableRow
                      key={budget.id}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() => !showTrash && navigate(`/planning-v2/budgets/${budget.id}`)}
                    >
                      <TableCell className="font-medium">{budget.name}</TableCell>
                      <TableCell>{budget.client_name || '-'}</TableCell>
                      <TableCell>{budget.project_name || '-'}</TableCell>
                      <TableCell>{getStatusBadge(budget.status)}</TableCell>
                      <TableCell>
                        {new Date(budget.updated_at).toLocaleDateString('es-MX')}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {showTrash ? (
                              <>
                                 <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteDialog({
                                      open: true,
                                      budgetId: budget.id,
                                      budgetName: budget.name,
                                      action: 'restore'
                                    });
                                  }}
                                  disabled={isDeleting}
                                >
                                  <ArchiveRestore className="h-4 w-4 mr-2" />
                                  Restaurar
                                </DropdownMenuItem>
                                {budget.status === 'draft' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteDialog({
                                          open: true,
                                          budgetId: budget.id,
                                          budgetName: budget.name,
                                          action: 'permanent'
                                        });
                                      }}
                                      className="text-destructive"
                                      disabled={isDeleting}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Eliminar definitivamente
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </>
                            ) : (
                              <>
                                <DropdownMenuItem onClick={() => navigate(`/planning-v2/budgets/${budget.id}`)}>
                                  Abrir
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicate(budget)}>
                                  Duplicar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteDialog({
                                      open: true,
                                      budgetId: budget.id,
                                      budgetName: budget.name,
                                      action: 'trash'
                                    });
                                  }}
                                  className="text-destructive"
                                  disabled={isDeleting}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Mover a papelera
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} a{' '}
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredBudgets.length)} de{' '}
                    {filteredBudgets.length} presupuestos
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {!loading && !showTrash && filteredBudgets.length > 0 && (
            <div className="text-center mt-6">
              <p className="text-xs text-muted-foreground">
                {filteredBudgets.length === budgets.length
                  ? `${budgets.length} presupuesto${budgets.length !== 1 ? 's' : ''} total${
                      budgets.length !== 1 ? 'es' : ''
                    }`
                  : `${filteredBudgets.length} de ${budgets.length} presupuestos`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <NewBudgetWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />

      {/* Confirmation Dialog - Controlled and Portaled */}
      <AlertDialog 
        open={deleteDialog.open} 
        onOpenChange={(open) => {
          if (!isDeleting) {
            setDeleteDialog({ ...deleteDialog, open });
          }
        }}
      >
        <AlertDialogContent
          onEscapeKeyDown={(e) => {
            if (!isDeleting) {
              setDeleteDialog({ open: false, budgetId: null, budgetName: '', action: 'trash' });
            } else {
              e.preventDefault();
            }
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              {deleteDialog.action === 'trash' && 'Mover a papelera'}
              {deleteDialog.action === 'restore' && 'Restaurar presupuesto'}
              {deleteDialog.action === 'permanent' && 'Eliminar permanentemente'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.action === 'trash' && (
                <>
                  ¿Estás seguro de que deseas mover <strong>{deleteDialog.budgetName}</strong> a la
                  papelera? Podrás restaurarlo más tarde.
                </>
              )}
              {deleteDialog.action === 'restore' && (
                <>
                  ¿Estás seguro de que deseas restaurar <strong>{deleteDialog.budgetName}</strong>?
                </>
              )}
              {deleteDialog.action === 'permanent' && (
                <>
                  ¿Estás seguro de que deseas eliminar permanentemente{' '}
                  <strong>{deleteDialog.budgetName}</strong>? Esta acción no se puede deshacer y solo
                  está disponible para borradores sin snapshots.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              disabled={isDeleting}
              className={deleteDialog.action === 'permanent' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {isDeleting ? (
                <>
                  <span className="inline-block animate-spin mr-2">⏳</span>
                  Procesando...
                </>
              ) : (
                <>
                  {deleteDialog.action === 'trash' && 'Mover a papelera'}
                  {deleteDialog.action === 'restore' && 'Restaurar'}
                  {deleteDialog.action === 'permanent' && 'Eliminar definitivamente'}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
