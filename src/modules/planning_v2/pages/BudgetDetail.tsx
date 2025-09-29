/**
 * Planning v2 - Budget Detail page
 * Vista detallada de un presupuesto con tabs
 */
import { useParams } from 'react-router-dom';
import { ArrowLeft, FileText, History, Paperclip, BarChart3, Download, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';

export default function BudgetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <List className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                  Catálogo de conceptos
                </h3>
                <p className="text-sm text-muted-foreground">
                  Gestiona partidas y conceptos del presupuesto
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                  Resumen financiero
                </h3>
                <p className="text-sm text-muted-foreground">
                  Vista consolidada de totales y estadísticas
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versions" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                  Versiones del presupuesto
                </h3>
                <p className="text-sm text-muted-foreground">
                  Historial de cambios y comparativas
                </p>
              </div>
            </CardContent>
          </Card>
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
    </div>
  );
}
