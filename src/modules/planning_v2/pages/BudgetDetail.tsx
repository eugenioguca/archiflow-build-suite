/**
 * Budget Detail Page - Planning v2
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Copy, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CatalogGrid } from '../components/catalog/CatalogGrid';
import { Summary } from '../components/summary/Summary';
import { VersionsList } from '../components/versions/VersionsList';
import { ApplyTemplateDialog } from '../components/templates/ApplyTemplateDialog';
import { DuplicateBudgetDialog } from '../components/budget/DuplicateBudgetDialog';
import { PlanningExportDialog } from '../components/export/PlanningExportDialog';
import { useCatalogGrid } from '../hooks/useCatalogGrid';
import { PlanningV2Shell } from '../components/common/PlanningV2Shell';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function BudgetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showApplyTemplateDialog, setShowApplyTemplateDialog] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  
  const {
    rows,
    isLoading,
    budget,
  } = useCatalogGrid(id || '');

  useEffect(() => {
    if (!id) {
      navigate('/planning-v2');
    }
  }, [id, navigate]);

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
    </div>
    </PlanningV2Shell>
  );
}
