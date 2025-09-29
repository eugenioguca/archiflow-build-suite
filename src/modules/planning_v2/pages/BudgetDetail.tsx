/**
 * Planning v2 - Budget Detail page
 * Vista detallada de un presupuesto con tabs
 */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, FileText, History, Paperclip, BarChart3, Download, Upload, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { CatalogGrid } from '../components/catalog/CatalogGrid';
import { Summary } from '../components/summary/Summary';
import { VersionsComparison } from '../components/versions/VersionsComparison';
import { ImportDialog } from '../components/import/ImportDialog';
import { ExportDialog } from '../components/export/ExportDialog';
import { getBudgetById } from '../services/budgetService';


export default function BudgetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedPartidaId, setSelectedPartidaId] = useState<string | null>(null);

  // Mock data - en producción vendría de useQuery
  const budgetName = 'Presupuesto Ejemplo';
  const clientName = 'Cliente Demo';
  const projectName = 'Proyecto Demo';
  const partidas = []; // De la query
  const conceptos = []; // De la query

  const handleImport = () => {
    // Necesitamos una partida seleccionada
    if (!selectedPartidaId) {
      // Por ahora usar la primera partida o crear una nueva
      setSelectedPartidaId('temp-id'); // TODO: obtener partida real
    }
    setImportOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/planning-v2')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Presupuesto</h1>
          <p className="text-muted-foreground mt-1">
            ID: {id}
          </p>
        </div>
        
        {/* Import/Export buttons */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleImport}>
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </Button>
          <Button variant="outline" onClick={() => setExportOpen(true)}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="catalog" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="catalog" className="gap-2">
            <List className="h-4 w-4" />
            Catálogo
          </TabsTrigger>
          <TabsTrigger value="summary" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="versions" className="gap-2">
            <FileText className="h-4 w-4" />
            Versiones
          </TabsTrigger>
          <TabsTrigger value="attachments" className="gap-2">
            <Paperclip className="h-4 w-4" />
            Adjuntos
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Historial
          </TabsTrigger>
          <TabsTrigger value="export" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-4">
          <Card className="h-[calc(100vh-250px)]">
            <CardContent className="p-0 h-full">
              {id && <CatalogGrid budgetId={id} />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          {id && <Summary budgetId={id} />}
        </TabsContent>

        <TabsContent value="versions" className="space-y-4">
          {id && <VersionsComparison budgetId={id} />}
        </TabsContent>

        <TabsContent value="attachments" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Paperclip className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                  Archivos adjuntos
                </h3>
                <p className="text-sm text-muted-foreground">
                  Documentos relacionados al presupuesto
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <History className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                  Historial de cambios
                </h3>
                <p className="text-sm text-muted-foreground">
                  Registro de modificaciones y auditoría
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Download className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                  Exportar presupuesto
                </h3>
                <p className="text-sm text-muted-foreground">
                  Genera documentos PDF y Excel
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Import Dialog */}
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        budgetId={id || ''}
        partidaId={selectedPartidaId || ''}
      />
      
      {/* Export Dialog */}
      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        budgetId={id || ''}
        budgetName={budgetName}
        clientName={clientName}
        projectName={projectName}
        partidas={partidas}
        conceptos={conceptos}
      />
    </div>
  );
}
