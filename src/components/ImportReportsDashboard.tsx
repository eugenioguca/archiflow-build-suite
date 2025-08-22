import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  TrendingUp, 
  FileText,
  Clock,
  BarChart3,
  RefreshCw,
  Download,
  Upload
} from "lucide-react";
import { useImportReports } from "@/hooks/useImportReports";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ErrorCategoryDisplayProps {
  categories: any; // More flexible to handle various data structures
}

function ErrorCategoryDisplay({ categories }: ErrorCategoryDisplayProps) {
  const errorTypes = [
    { key: 'duplicates', label: 'Duplicados', color: 'bg-yellow-500', icon: AlertTriangle },
    { key: 'missing_references', label: 'Referencias faltantes', color: 'bg-red-500', icon: XCircle },
    { key: 'validation_errors', label: 'Errores de validación', color: 'bg-orange-500', icon: AlertTriangle },
    { key: 'format_errors', label: 'Errores de formato', color: 'bg-purple-500', icon: FileText },
    { key: 'database_errors', label: 'Errores de base de datos', color: 'bg-red-700', icon: XCircle },
    { key: 'unknown_errors', label: 'Errores desconocidos', color: 'bg-gray-500', icon: AlertTriangle }
  ] as const;

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {errorTypes.map(({ key, label, color, icon: Icon }) => {
          const count = categories?.[key] || 0;
          if (count === 0) return null;
          
          return (
            <div key={key} className="flex items-center gap-2 p-3 border rounded-lg">
              <div className={`w-3 h-3 rounded-full ${color}`} />
              <div className="flex-1">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xl font-bold">{count}</p>
              </div>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
          );
        })}
      </div>
    );
}

export function ImportReportsDashboard() {
  const [activeTab, setActiveTab] = useState("ultimo-reporte");
  const { 
    importHistory, 
    latestImport, 
    analysis, 
    loading, 
    refresh 
  } = useImportReports();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Completado</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Fallido</Badge>;
      case 'partial':
        return <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" />Parcial</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reportes de Importación</h2>
          <p className="text-muted-foreground">
            Análisis detallado de las importaciones de catálogo de cuentas
          </p>
        </div>
        <Button onClick={refresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ultimo-reporte">Último Reporte</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
          <TabsTrigger value="analisis">Análisis</TabsTrigger>
          <TabsTrigger value="validador">Validador</TabsTrigger>
        </TabsList>

        {/* Último Reporte */}
        <TabsContent value="ultimo-reporte" className="space-y-6">
          {latestImport ? (
            <>
              {/* Resumen General */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Upload className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Archivo</p>
                        <p className="font-semibold">{latestImport.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(latestImport.file_size)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Exitosos</p>
                        <p className="text-2xl font-bold text-green-600">
                          {latestImport.total_rows_successful}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-8 w-8 text-red-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Fallidos</p>
                        <p className="text-2xl font-bold text-red-600">
                          {latestImport.total_rows_failed}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(latestImport.status)}
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Estado</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(latestImport.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Progreso y Calidad */}
              {analysis && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Análisis de Calidad
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                       <div>
                         <p className="text-sm text-muted-foreground">Puntuación de Calidad</p>
                         <p className="text-2xl font-bold">{analysis.quality_grade || 'N/A'}</p>
                         <p className="text-sm text-muted-foreground">{analysis.success_rate || 'N/A'}</p>
                       </div>
                       <div className="text-right">
                         <p className="text-3xl font-bold">{Math.round(analysis.quality_score || 0)}</p>
                         <p className="text-sm text-muted-foreground">de 100</p>
                       </div>
                    </div>
                    <Progress value={analysis.quality_score || 0} className="h-2" />
                  </CardContent>
                </Card>
              )}

              {/* Desglose por Entidades */}
              <Card>
                <CardHeader>
                  <CardTitle>Desglose de Importación</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Mayores</p>
                      <p className="text-2xl font-bold text-blue-600">{latestImport.mayores_inserted}</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Partidas</p>
                      <p className="text-2xl font-bold text-green-600">{latestImport.partidas_inserted}</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Subpartidas</p>
                      <p className="text-2xl font-bold text-purple-600">{latestImport.subpartidas_inserted}</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Departamentos</p>
                      <p className="text-2xl font-bold text-orange-600">{latestImport.departamentos_inserted}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Análisis de Errores */}
              {latestImport.total_rows_failed > 0 && latestImport.error_categories && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                      <XCircle className="h-5 w-5" />
                      Análisis de Errores ({latestImport.total_rows_failed} errores)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ErrorCategoryDisplay categories={latestImport.error_categories} />
                    
                     {analysis?.recommendations && Array.isArray(analysis.recommendations) && analysis.recommendations.length > 0 && (
                       <Alert>
                         <AlertTriangle className="h-4 w-4" />
                         <AlertDescription>
                           <p className="font-semibold mb-2">Recomendaciones:</p>
                           <ul className="list-disc list-inside space-y-1">
                             {analysis.recommendations.map((rec: any, index: number) => (
                               <li key={index} className="text-sm">{typeof rec === 'string' ? rec : JSON.stringify(rec)}</li>
                             ))}
                           </ul>
                         </AlertDescription>
                       </Alert>
                     )}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay importaciones recientes</h3>
                <p className="text-muted-foreground">
                  Importa un archivo Excel en la pestaña "Catálogo de Cuentas" para ver los reportes aquí.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Historial */}
        <TabsContent value="historial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Importaciones</CardTitle>
            </CardHeader>
            <CardContent>
              {importHistory.length > 0 ? (
                <div className="space-y-4">
                  {importHistory.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-semibold">{record.file_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(record.created_at), "dd/MM/yyyy HH:mm", { locale: es })} • 
                            {formatFileSize(record.file_size)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm">
                            <span className="text-green-600 font-semibold">{record.total_rows_successful}</span> / 
                            <span className="text-red-600 font-semibold"> {record.total_rows_failed}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">éxito / errores</p>
                        </div>
                        {getStatusBadge(record.status)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No hay historial de importaciones disponible</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Análisis */}
        <TabsContent value="analisis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Dashboard de Métricas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Dashboard en Desarrollo</h3>
                <p className="text-muted-foreground">
                  Próximamente: gráficos de tendencias, análisis comparativo y métricas avanzadas.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Validador */}
        <TabsContent value="validador" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Validador de Archivos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Validador en Desarrollo</h3>
                <p className="text-muted-foreground">
                  Próximamente: validación previa de archivos Excel antes de la importación.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}