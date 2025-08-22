import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  Upload,
  Search,
  FileSpreadsheet,
  AlertCircleIcon,
  BugIcon,
  LightbulbIcon,
  ExternalLink
} from "lucide-react";
import { useImportReports } from "@/hooks/useImportReports";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ErrorCategoryDisplayProps {
  categories: any; // More flexible to handle various data structures
}

interface ParsedError {
  type: string;
  row: number;
  description: string;
  suggestion: string;
  originalError: string;
}

function parseErrorDetails(errorSummary: string[]): ParsedError[] {
  return errorSummary.map(error => {
    // Extract row number and type from error message
    const rowMatch = error.match(/fila (\d+)/);
    const typeMatch = error.match(/(Mayor|Partida|Subpartida)/);
    
    let suggestion = "";
    let description = error;
    
    if (error.includes("duplicate key value")) {
      if (error.includes("codigo_key")) {
        suggestion = "Revisar el archivo Excel y eliminar códigos duplicados en la columna 'Código'";
        description = "Código duplicado encontrado";
      }
    } else if (error.includes("foreign key")) {
      suggestion = "Verificar que existan las referencias padre (departamentos para mayores, mayores para partidas)";
      description = "Referencia padre faltante";
    } else if (error.includes("not null")) {
      suggestion = "Completar campos obligatorios que están vacíos";
      description = "Campo obligatorio vacío";
    } else if (error.includes("invalid input")) {
      suggestion = "Verificar formato de datos (fechas, números, texto)";
      description = "Formato de datos inválido";
    } else {
      suggestion = "Revisar manualmente este error específico";
    }
    
    return {
      type: typeMatch ? typeMatch[1] : "Desconocido",
      row: rowMatch ? parseInt(rowMatch[1]) : 0,
      description,
      suggestion,
      originalError: error
    };
  });
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
  const [errorSearchTerm, setErrorSearchTerm] = useState("");
  const [showDetailedErrors, setShowDetailedErrors] = useState(false);
  const { 
    importHistory, 
    latestImport, 
    analysis, 
    loading, 
    refresh 
  } = useImportReports();

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadErrorReport = () => {
    if (!latestImport?.error_summary) return;
    
    const parsedErrors = parseErrorDetails(latestImport.error_summary);
    const csvContent = [
      ['Tipo', 'Fila', 'Descripción', 'Sugerencia', 'Error Original'].join(','),
      ...parsedErrors.map(error => [
        error.type,
        error.row,
        `"${error.description}"`,
        `"${error.suggestion}"`,
        `"${error.originalError}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `errores_importacion_${format(new Date(latestImport.created_at), 'yyyyMMdd_HHmm')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

              {/* Análisis de Errores Mejorado */}
              {latestImport.total_rows_failed > 0 && latestImport.error_categories && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-red-600">
                        <XCircle className="h-5 w-5" />
                        Análisis Detallado de Errores ({latestImport.total_rows_failed} errores)
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowDetailedErrors(true)}
                        >
                          <BugIcon className="h-4 w-4 mr-2" />
                          Ver Detalles
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={downloadErrorReport}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Descargar CSV
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ErrorCategoryDisplay categories={latestImport.error_categories} />
                    
                    {/* Sugerencias Inteligentes */}
                    <Alert>
                      <LightbulbIcon className="h-4 w-4" />
                      <AlertDescription>
                        <p className="font-semibold mb-2">Sugerencias de Corrección:</p>
                        <div className="space-y-2">
                          {latestImport.error_categories?.duplicates > 0 && (
                            <div className="flex items-start gap-2">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
                              <div>
                                <p className="font-medium">Códigos Duplicados ({latestImport.error_categories.duplicates})</p>
                                <p className="text-sm text-muted-foreground">
                                  Buscar y eliminar códigos repetidos en las columnas "Código" de las hojas Mayor, Partidas y Subpartidas.
                                </p>
                              </div>
                            </div>
                          )}
                          {latestImport.error_categories?.missing_references > 0 && (
                            <div className="flex items-start gap-2">
                              <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                              <div>
                                <p className="font-medium">Referencias Faltantes ({latestImport.error_categories.missing_references})</p>
                                <p className="text-sm text-muted-foreground">
                                  Verificar que existan los departamentos padre antes de crear mayores, y mayores padre antes de crear partidas.
                                </p>
                              </div>
                            </div>
                          )}
                          {(latestImport.error_categories?.format_errors > 0 || latestImport.error_categories?.validation_errors > 0) && (
                            <div className="flex items-start gap-2">
                              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                              <div>
                                <p className="font-medium">Errores de Formato</p>
                                <p className="text-sm text-muted-foreground">
                                  Revisar que las columnas contengan el tipo de datos correcto (texto, números, valores booleanos).
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                    
                     {analysis?.recommendations && Array.isArray(analysis.recommendations) && analysis.recommendations.length > 0 && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <p className="font-semibold mb-2">Recomendaciones Adicionales:</p>
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
              <CardContent className="p-8 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="bg-muted/50 p-4 rounded-full">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">No hay importaciones recientes</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Para generar reportes, necesitas realizar una importación de catálogo de cuentas desde un archivo Excel.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button variant="outline" className="text-sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Usar pestaña "Catálogo de Cuentas"
                  </Button>
                  <Button variant="ghost" onClick={refresh}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Actualizar
                  </Button>
                </div>
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
                <div className="text-center py-8 space-y-4">
                  <div className="flex justify-center">
                    <div className="bg-muted/50 p-4 rounded-full">
                      <Clock className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">No hay historial disponible</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      El historial se creará automáticamente cuando realices importaciones de archivos Excel.
                    </p>
                  </div>
                  <Button variant="outline" onClick={refresh}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Verificar nuevamente
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Análisis Mejorado */}
        <TabsContent value="analisis" className="space-y-4">
          {latestImport ? (
            <div className="space-y-6">
              {/* Análisis de Tendencias */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Métricas de Importación
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {Math.round((latestImport.total_rows_successful / latestImport.total_rows_processed) * 100)}%
                      </div>
                      <p className="text-sm text-muted-foreground">Tasa de Éxito</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {latestImport.duration_seconds ? Math.round(latestImport.duration_seconds) : 0}s
                      </div>
                      <p className="text-sm text-muted-foreground">Tiempo Procesamiento</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {Math.round(latestImport.total_rows_processed / (latestImport.duration_seconds || 1))}
                      </div>
                      <p className="text-sm text-muted-foreground">Registros/Segundo</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {analysis?.quality_score ? Math.round(analysis.quality_score) : 0}
                      </div>
                      <p className="text-sm text-muted-foreground">Puntuación Calidad</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Distribución de Errores */}
              {latestImport.total_rows_failed > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Distribución de Errores por Tipo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(latestImport.error_categories || {}).map(([key, value]) => {
                        const count = value as number;
                        if (count === 0) return null;
                        
                        const percentage = Math.round((count / latestImport.total_rows_failed) * 100);
                        const labels: {[key: string]: string} = {
                          duplicates: 'Duplicados',
                          missing_references: 'Referencias Faltantes',
                          validation_errors: 'Validación',
                          format_errors: 'Formato',
                          database_errors: 'Base de Datos',
                          unknown_errors: 'Desconocidos'
                        };
                        
                        return (
                          <div key={key} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>{labels[key] || key}</span>
                              <span>{count} ({percentage}%)</span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="bg-muted/50 p-4 rounded-full">
                    <BarChart3 className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">No hay datos para analizar</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Realiza una importación para ver métricas detalladas y análisis de tendencias.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Validador Mejorado */}
        <TabsContent value="validador" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Validador Pre-Importación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 space-y-4">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                <h3 className="text-lg font-semibold">Validador en Desarrollo</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Próximamente: análisis previo de archivos Excel para detectar errores antes de importar.
                </p>
                <div className="border rounded-lg p-4 text-left max-w-md mx-auto space-y-2">
                  <p className="font-semibold text-sm">Características planificadas:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Detección de códigos duplicados</li>
                    <li>• Validación de referencias padre</li>
                    <li>• Verificación de formato de datos</li>
                    <li>• Estimación de éxito de importación</li>
                    <li>• Sugerencias de corrección automática</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Errores Detallados */}
      <Dialog open={showDetailedErrors} onOpenChange={setShowDetailedErrors}>
        <DialogContent className="max-w-6xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BugIcon className="h-5 w-5" />
              Errores Detallados de Importación
            </DialogTitle>
          </DialogHeader>
          
          {latestImport?.error_summary && (
            <div className="space-y-4">
              {/* Buscador de errores */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar por tipo, fila o descripción..."
                    value={errorSearchTerm}
                    onChange={(e) => setErrorSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={downloadErrorReport} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>

              <ScrollArea className="h-[400px]">
                <ErrorDetailsTable 
                  errors={parseErrorDetails(latestImport.error_summary)}
                  searchTerm={errorSearchTerm}
                />
              </ScrollArea>

              <Alert>
                <LightbulbIcon className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold">Cómo corregir errores:</p>
                  <p className="text-sm">
                    1. Descarga el reporte CSV con todos los errores • 
                    2. Abre tu archivo Excel original • 
                    3. Corrige los errores según las sugerencias • 
                    4. Guarda y vuelve a importar el archivo
                  </p>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

// Componente para mostrar tabla de errores detallados
function ErrorDetailsTable({ errors, searchTerm }: { errors: ParsedError[], searchTerm: string }) {
  const filteredErrors = errors.filter(error => 
    error.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    error.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    error.row.toString().includes(searchTerm) ||
    error.suggestion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tipo</TableHead>
          <TableHead>Fila</TableHead>
          <TableHead>Descripción</TableHead>
          <TableHead>Sugerencia</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredErrors.map((error, index) => (
          <TableRow key={index}>
            <TableCell>
              <Badge variant="outline" className="text-xs">
                {error.type}
              </Badge>
            </TableCell>
            <TableCell className="font-mono text-sm">
              {error.row > 0 ? error.row : '-'}
            </TableCell>
            <TableCell className="text-sm">
              {error.description}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {error.suggestion}
            </TableCell>
          </TableRow>
        ))}
        {filteredErrors.length === 0 && (
          <TableRow>
            <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
              No se encontraron errores que coincidan con la búsqueda
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}