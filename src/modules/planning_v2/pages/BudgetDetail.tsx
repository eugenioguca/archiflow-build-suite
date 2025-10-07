/**
 * Budget Detail Page - Planning v2
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Copy, FileDown, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { CatalogGrid } from '../components/catalog/CatalogGrid';
import { Summary } from '../components/summary/Summary';
import { VersionsList } from '../components/versions/VersionsList';
import { ApplyTemplateDialog } from '../components/templates/ApplyTemplateDialog';
import { DuplicateBudgetDialog } from '../components/budget/DuplicateBudgetDialog';
import { PlanningExportDialog } from '../components/export/PlanningExportDialog';
import { useCatalogGrid } from '../hooks/useCatalogGrid';
import { PlanningV2Shell } from '../components/common/PlanningV2Shell';
import { deleteBudget } from '../services/budgetService';
import { useUILoadingStore } from '@/stores/uiLoadingStore';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function BudgetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { withLoading } = useUILoadingStore();
  
  const [showApplyTemplateDialog, setShowApplyTemplateDialog] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const {
    rows,
    isLoading,
    budget,
  } = useCatalogGrid(id || '');

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (budgetId: string) => deleteBudget(budgetId),
    onError: (error: any) => {
      toast.error(error.message || 'No se pudo eliminar el presupuesto');
    },
    onSettled: () => {
      // Invalidate budget list to refresh
      queryClient.invalidateQueries({ queryKey: ['planning_v2', 'budgets'] });
      queryClient.invalidateQueries({ queryKey: ['planning-budget', id] });
    },
  });

  // Reset delete dialog on unmount
  useEffect(() => {
    return () => {
      setDeleteDialogOpen(false);
    };
  }, []);

  useEffect(() => {
    if (!id) {
      navigate('/planning-v2');
    }
  }, [id, navigate]);

  // Handle delete from detail
  const handleDeleteFromDetail = async () => {
    if (!id) return;

    try {
      await withLoading(async () => {
        // 1. Navigate first to unmount dependent views (prevents stuck suspense)
        navigate('/planning-v2', { replace: true });
        
        // 2. Execute deletion
        await deleteMutation.mutateAsync(id);
        
        // 3. Show success message
        toast.success('Presupuesto eliminado correctamente');
      });
    } finally {
      // 4. Always cleanup modal state
      setDeleteDialogOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Presupuesto no encontrado</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate('/planning-v2')}
          >
            Volver a la lista
          </Button>
        </div>
      </div>
    );
  }

  return (
    <PlanningV2Shell>
      <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/planning-v2')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{budget.name}</h1>
            {budget.settings?.needs_total_review && (
              <Badge variant="outline" className="border-yellow-500 text-yellow-700 bg-yellow-50 dark:bg-yellow-950/20">
                Revisar totales
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            Presupuesto #{budget.id.slice(0, 8)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDuplicateDialogOpen(true)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicar
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Crear una copia de este presupuesto</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExportDialogOpen(true)}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Exportar a PDF o Excel con branding</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowApplyTemplateDialog(true)}
          >
            <FileText className="h-4 w-4 mr-2" />
            Aplicar Plantilla
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Eliminar este presupuesto permanentemente</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <Tabs defaultValue="catalog" className="w-full">
        <TabsList>
          <TabsTrigger value="catalog">Catálogo</TabsTrigger>
          <TabsTrigger value="summary">Resumen y Publicar</TabsTrigger>
          <TabsTrigger value="versions">Versiones</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="mt-6">
          <CatalogGrid budgetId={id!} />
        </TabsContent>

        <TabsContent value="summary" className="mt-6">
          <Summary budgetId={id!} />
        </TabsContent>

        <TabsContent value="versions" className="mt-6">
          <VersionsList budgetId={id!} />
        </TabsContent>
      </Tabs>

      {/* Apply Template Dialog */}
      <ApplyTemplateDialog
        open={showApplyTemplateDialog}
        onOpenChange={setShowApplyTemplateDialog}
        budgetId={id!}
      />

      {/* Duplicate Budget Dialog */}
      <DuplicateBudgetDialog
        open={duplicateDialogOpen}
        onOpenChange={setDuplicateDialogOpen}
        budgetId={id!}
        budgetName={budget.name}
      />

      {/* Export Dialog */}
      <PlanningExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        budgetId={id!}
        budgetName={budget.name}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar presupuesto</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas eliminar el presupuesto "{budget?.name}"? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFromDetail}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </PlanningV2Shell>
  );
}
