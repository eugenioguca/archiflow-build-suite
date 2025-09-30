/**
 * Budget Detail Page - Planning v2
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CatalogGrid } from '../components/catalog/CatalogGrid';
import { Summary } from '../components/summary/Summary';
import { VersionsList } from '../components/versions/VersionsList';
import { ApplyTemplateDialog } from '../components/templates/ApplyTemplateDialog';
import { useCatalogGrid } from '../hooks/useCatalogGrid';

export default function BudgetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showApplyTemplateDialog, setShowApplyTemplateDialog] = useState(false);
  
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowApplyTemplateDialog(true)}
        >
          <FileText className="h-4 w-4 mr-2" />
          Aplicar Plantilla
        </Button>
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
    </div>
  );
}
