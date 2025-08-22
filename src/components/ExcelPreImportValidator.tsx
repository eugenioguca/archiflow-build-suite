import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Upload, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  FileText, 
  Download,
  RefreshCw,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ValidationError {
  sheet: string;
  row: number;
  column: string;
  type: 'error' | 'warning';
  code: string;
  message: string;
  suggestion: string;
  data?: any;
}

interface ValidationSummary {
  totalRows: number;
  validRows: number;
  errorRows: number;
  warningRows: number;
  successRate: number;
  canProceed: boolean;
  departments: {
    total: number;
    valid: number;
    duplicates: number;
  };
  mayores: {
    total: number;
    valid: number;
    missingDepartments: number;
    duplicates: number;
  };
  partidas: {
    total: number;
    valid: number;
    missingMayores: number;
    duplicates: number;
  };
  subpartidas: {
    total: number;
    valid: number;
    missingPartidas: number;
    duplicates: number;
  };
}

interface ExcelData {
  departamentos: any[];
  mayores: any[];
  partidas: any[];
  subpartidas: any[];
}

export default function ExcelPreImportValidator() {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<{
    summary: ValidationSummary | null;
    errors: ValidationError[];
    data: ExcelData | null;
  }>({
    summary: null,
    errors: [],
    data: null
  });
  const [fileName, setFileName] = useState<string>('');
  
  const { toast } = useToast();

  const validateExcelStructure = useCallback((workbook: XLSX.WorkBook): ValidationError[] => {
    const errors: ValidationError[] = [];
    const requiredSheets = ['Departamentos', 'Mayores', 'Partidas', 'Subpartidas'];
    
    // Verificar hojas requeridas
    requiredSheets.forEach(sheetName => {
      if (!workbook.SheetNames.includes(sheetName)) {
        errors.push({
          sheet: 'General',
          row: 0,
          column: '',
          type: 'error',
          code: 'MISSING_SHEET',
          message: `Falta la hoja "${sheetName}"`,
          suggestion: `Agregar una hoja llamada "${sheetName}" al archivo Excel`
        });
      }
    });

    return errors;
  }, []);

  const validateDepartamentos = useCallback((data: any[]): ValidationError[] => {
    const errors: ValidationError[] = [];
    const seenCodes = new Set<string>();
    const seenNames = new Set<string>();

    data.forEach((row, index) => {
      const rowNum = index + 2; // Excel rows start at 1, plus header
      
      // Verificar campos requeridos
      if (!row.departamento || typeof row.departamento !== 'string') {
        errors.push({
          sheet: 'Departamentos',
          row: rowNum,
          column: 'departamento',
          type: 'error',
          code: 'MISSING_DEPARTMENT',
          message: 'Nombre de departamento requerido',
          suggestion: 'Agregar un nombre válido para el departamento'
        });
      } else {
        // Verificar duplicados por nombre
        const normalizedName = row.departamento.toLowerCase().trim();
        if (seenNames.has(normalizedName)) {
          errors.push({
            sheet: 'Departamentos',
            row: rowNum,
            column: 'departamento',
            type: 'error',
            code: 'DUPLICATE_DEPARTMENT',
            message: `Departamento duplicado: "${row.departamento}"`,
            suggestion: 'Eliminar o renombrar el departamento duplicado'
          });
        } else {
          seenNames.add(normalizedName);
        }
      }

      // Verificar formato activo
      if (row.activo !== undefined && typeof row.activo !== 'boolean') {
        errors.push({
          sheet: 'Departamentos',
          row: rowNum,
          column: 'activo',
          type: 'warning',
          code: 'INVALID_BOOLEAN',
          message: 'El campo "activo" debe ser TRUE/FALSE',
          suggestion: 'Cambiar a TRUE o FALSE, o dejar vacío para usar TRUE por defecto'
        });
      }
    });

    return errors;
  }, []);

  const validateMayores = useCallback((data: any[], departamentos: any[]): ValidationError[] => {
    const errors: ValidationError[] = [];
    const seenCodes = new Set<string>();
    const validDepartments = new Set(departamentos.map(d => d.departamento?.toLowerCase().trim()));

    data.forEach((row, index) => {
      const rowNum = index + 2;
      
      // Verificar campos requeridos
      if (!row.codigo || typeof row.codigo !== 'string') {
        errors.push({
          sheet: 'Mayores',
          row: rowNum,
          column: 'codigo',
          type: 'error',
          code: 'MISSING_CODE',
          message: 'Código requerido',
          suggestion: 'Agregar un código único para el mayor'
        });
      } else {
        // Verificar duplicados
        if (seenCodes.has(row.codigo)) {
          errors.push({
            sheet: 'Mayores',
            row: rowNum,
            column: 'codigo',
            type: 'error',
            code: 'DUPLICATE_CODE',
            message: `Código duplicado: "${row.codigo}"`,
            suggestion: 'Usar un código único diferente'
          });
        } else {
          seenCodes.add(row.codigo);
        }
      }

      if (!row.nombre || typeof row.nombre !== 'string') {
        errors.push({
          sheet: 'Mayores',
          row: rowNum,
          column: 'nombre',
          type: 'error',
          code: 'MISSING_NAME',
          message: 'Nombre requerido',
          suggestion: 'Agregar un nombre descriptivo para el mayor'
        });
      }

      if (!row.departamento || typeof row.departamento !== 'string') {
        errors.push({
          sheet: 'Mayores',
          row: rowNum,
          column: 'departamento',
          type: 'error',
          code: 'MISSING_DEPARTMENT_REF',
          message: 'Departamento requerido',
          suggestion: 'Especificar el departamento al que pertenece este mayor'
        });
      } else {
        // Verificar que el departamento existe
        const normalizedDept = row.departamento.toLowerCase().trim();
        if (!validDepartments.has(normalizedDept)) {
          errors.push({
            sheet: 'Mayores',
            row: rowNum,
            column: 'departamento',
            type: 'error',
            code: 'INVALID_DEPARTMENT_REF',
            message: `Departamento no encontrado: "${row.departamento}"`,
            suggestion: 'Usar un departamento que exista en la hoja "Departamentos"'
          });
        }
      }
    });

    return errors;
  }, []);

  const validatePartidas = useCallback((data: any[], mayores: any[]): ValidationError[] => {
    const errors: ValidationError[] = [];
    const seenCodes = new Set<string>();
    const validMayores = new Set(mayores.map(m => m.codigo));

    data.forEach((row, index) => {
      const rowNum = index + 2;
      
      if (!row.codigo || typeof row.codigo !== 'string') {
        errors.push({
          sheet: 'Partidas',
          row: rowNum,
          column: 'codigo',
          type: 'error',
          code: 'MISSING_CODE',
          message: 'Código requerido',
          suggestion: 'Agregar un código único para la partida'
        });
      } else {
        if (seenCodes.has(row.codigo)) {
          errors.push({
            sheet: 'Partidas',
            row: rowNum,
            column: 'codigo',
            type: 'error',
            code: 'DUPLICATE_CODE',
            message: `Código duplicado: "${row.codigo}"`,
            suggestion: 'Usar un código único diferente'
          });
        } else {
          seenCodes.add(row.codigo);
        }
      }

      if (!row.nombre || typeof row.nombre !== 'string') {
        errors.push({
          sheet: 'Partidas',
          row: rowNum,
          column: 'nombre',
          type: 'error',
          code: 'MISSING_NAME',
          message: 'Nombre requerido',
          suggestion: 'Agregar un nombre descriptivo para la partida'
        });
      }

      if (!row.mayor_codigo || typeof row.mayor_codigo !== 'string') {
        errors.push({
          sheet: 'Partidas',
          row: rowNum,
          column: 'mayor_codigo',
          type: 'error',
          code: 'MISSING_MAYOR_REF',
          message: 'Código de mayor requerido',
          suggestion: 'Especificar el código del mayor al que pertenece esta partida'
        });
      } else {
        if (!validMayores.has(row.mayor_codigo)) {
          errors.push({
            sheet: 'Partidas',
            row: rowNum,
            column: 'mayor_codigo',
            type: 'error',
            code: 'INVALID_MAYOR_REF',
            message: `Mayor no encontrado: "${row.mayor_codigo}"`,
            suggestion: 'Usar un código de mayor que exista en la hoja "Mayores"'
          });
        }
      }
    });

    return errors;
  }, []);

  const validateSubpartidas = useCallback((data: any[], partidas: any[]): ValidationError[] => {
    const errors: ValidationError[] = [];
    const seenCodes = new Set<string>();
    const validPartidas = new Set(partidas.map(p => p.codigo));

    data.forEach((row, index) => {
      const rowNum = index + 2;
      
      if (!row.codigo || typeof row.codigo !== 'string') {
        errors.push({
          sheet: 'Subpartidas',
          row: rowNum,
          column: 'codigo',
          type: 'error',
          code: 'MISSING_CODE',
          message: 'Código requerido',
          suggestion: 'Agregar un código único para la subpartida'
        });
      } else {
        if (seenCodes.has(row.codigo)) {
          errors.push({
            sheet: 'Subpartidas',
            row: rowNum,
            column: 'codigo',
            type: 'error',
            code: 'DUPLICATE_CODE',
            message: `Código duplicado: "${row.codigo}"`,
            suggestion: 'Usar un código único diferente'
          });
        } else {
          seenCodes.add(row.codigo);
        }
      }

      if (!row.nombre || typeof row.nombre !== 'string') {
        errors.push({
          sheet: 'Subpartidas',
          row: rowNum,
          column: 'nombre',
          type: 'error',
          code: 'MISSING_NAME',
          message: 'Nombre requerido',
          suggestion: 'Agregar un nombre descriptivo para la subpartida'
        });
      }

      if (!row.partida_codigo || typeof row.partida_codigo !== 'string') {
        errors.push({
          sheet: 'Subpartidas',
          row: rowNum,
          column: 'partida_codigo',
          type: 'error',
          code: 'MISSING_PARTIDA_REF',
          message: 'Código de partida requerido',
          suggestion: 'Especificar el código de la partida a la que pertenece esta subpartida'
        });
      } else {
        if (!validPartidas.has(row.partida_codigo)) {
          errors.push({
            sheet: 'Subpartidas',
            row: rowNum,
            column: 'partida_codigo',
            type: 'error',
            code: 'INVALID_PARTIDA_REF',
            message: `Partida no encontrada: "${row.partida_codigo}"`,
            suggestion: 'Usar un código de partida que exista en la hoja "Partidas"'
          });
        }
      }
    });

    return errors;
  }, []);

  const processExcelFile = useCallback(async (file: File) => {
    setIsValidating(true);
    setFileName(file.name);
    
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      
      // Validar estructura general
      let allErrors = validateExcelStructure(workbook);
      
      // Si hay errores críticos de estructura, no continuar
      if (allErrors.some(e => e.type === 'error')) {
        setValidationResults({
          summary: {
            totalRows: 0,
            validRows: 0,
            errorRows: allErrors.length,
            warningRows: 0,
            successRate: 0,
            canProceed: false,
            departments: { total: 0, valid: 0, duplicates: 0 },
            mayores: { total: 0, valid: 0, missingDepartments: 0, duplicates: 0 },
            partidas: { total: 0, valid: 0, missingMayores: 0, duplicates: 0 },
            subpartidas: { total: 0, valid: 0, missingPartidas: 0, duplicates: 0 }
          },
          errors: allErrors,
          data: null
        });
        return;
      }

      // Leer datos de cada hoja
      const departamentosSheet = workbook.Sheets['Departamentos'];
      const mayoresSheet = workbook.Sheets['Mayores'];
      const partidasSheet = workbook.Sheets['Partidas'];
      const subpartidasSheet = workbook.Sheets['Subpartidas'];

      const departamentos = departamentosSheet ? XLSX.utils.sheet_to_json(departamentosSheet) : [];
      const mayores = mayoresSheet ? XLSX.utils.sheet_to_json(mayoresSheet) : [];
      const partidas = partidasSheet ? XLSX.utils.sheet_to_json(partidasSheet) : [];
      const subpartidas = subpartidasSheet ? XLSX.utils.sheet_to_json(subpartidasSheet) : [];

      // Validar contenido de cada hoja
      const departamentosErrors = validateDepartamentos(departamentos);
      const mayoresErrors = validateMayores(mayores, departamentos);
      const partidasErrors = validatePartidas(partidas, mayores);
      const subpartidasErrors = validateSubpartidas(subpartidas, partidas);

      allErrors = [
        ...allErrors,
        ...departamentosErrors,
        ...mayoresErrors,
        ...partidasErrors,
        ...subpartidasErrors
      ];

      // Calcular estadísticas
      const totalRows = departamentos.length + mayores.length + partidas.length + subpartidas.length;
      const errorRows = allErrors.filter(e => e.type === 'error').length;
      const warningRows = allErrors.filter(e => e.type === 'warning').length;
      const validRows = totalRows - errorRows;
      const successRate = totalRows > 0 ? (validRows / totalRows) * 100 : 0;
      const canProceed = errorRows === 0;

      const summary: ValidationSummary = {
        totalRows,
        validRows,
        errorRows,
        warningRows,
        successRate,
        canProceed,
        departments: {
          total: departamentos.length,
          valid: departamentos.length - departamentosErrors.filter(e => e.type === 'error').length,
          duplicates: departamentosErrors.filter(e => e.code === 'DUPLICATE_DEPARTMENT').length
        },
        mayores: {
          total: mayores.length,
          valid: mayores.length - mayoresErrors.filter(e => e.type === 'error').length,
          missingDepartments: mayoresErrors.filter(e => e.code === 'INVALID_DEPARTMENT_REF').length,
          duplicates: mayoresErrors.filter(e => e.code === 'DUPLICATE_CODE').length
        },
        partidas: {
          total: partidas.length,
          valid: partidas.length - partidasErrors.filter(e => e.type === 'error').length,
          missingMayores: partidasErrors.filter(e => e.code === 'INVALID_MAYOR_REF').length,
          duplicates: partidasErrors.filter(e => e.code === 'DUPLICATE_CODE').length
        },
        subpartidas: {
          total: subpartidas.length,
          valid: subpartidas.length - subpartidasErrors.filter(e => e.type === 'error').length,
          missingPartidas: subpartidasErrors.filter(e => e.code === 'INVALID_PARTIDA_REF').length,
          duplicates: subpartidasErrors.filter(e => e.code === 'DUPLICATE_CODE').length
        }
      };

      setValidationResults({
        summary,
        errors: allErrors,
        data: { departamentos, mayores, partidas, subpartidas }
      });

      toast({
        title: canProceed ? "Validación Exitosa" : "Errores Encontrados",
        description: canProceed 
          ? `Archivo listo para importar. ${validRows} registros válidos.`
          : `Se encontraron ${errorRows} errores que deben corregirse.`,
        variant: canProceed ? "default" : "destructive"
      });

    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar el archivo Excel. Verifique el formato.",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  }, [validateExcelStructure, validateDepartamentos, validateMayores, validatePartidas, validateSubpartidas, toast]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      processExcelFile(file);
    }
  }, [processExcelFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

  const downloadErrorReport = useCallback(() => {
    if (!validationResults.errors.length) return;

    const csvContent = [
      ['Hoja', 'Fila', 'Columna', 'Tipo', 'Código', 'Mensaje', 'Sugerencia'].join(','),
      ...validationResults.errors.map(error => [
        error.sheet,
        error.row,
        error.column,
        error.type,
        error.code,
        `"${error.message}"`,
        `"${error.suggestion}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `errores_validacion_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }, [validationResults.errors]);

  const resetValidator = useCallback(() => {
    setValidationResults({ summary: null, errors: [], data: null });
    setFileName('');
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Validador Pre-Importación
          </CardTitle>
          <CardDescription>
            Analiza archivos Excel antes de importar para detectar errores y validar la estructura
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Zona de carga de archivos */}
          {!validationResults.summary && (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">
                {isDragActive ? 'Suelta el archivo aquí' : 'Arrastra un archivo Excel aquí'}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                o haz clic para seleccionar un archivo (.xlsx, .xls)
              </p>
              <Button variant="outline" disabled={isValidating}>
                {isValidating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Validando...
                  </>
                ) : (
                  'Seleccionar Archivo'
                )}
              </Button>
            </div>
          )}

          {/* Resultados de validación */}
          {validationResults.summary && (
            <div className="space-y-6">
              {/* Header con resumen */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    {validationResults.summary.canProceed ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    {fileName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {validationResults.summary.canProceed 
                      ? 'Archivo listo para importar'
                      : 'Se encontraron errores que deben corregirse'
                    }
                  </p>
                </div>
                <div className="flex gap-2">
                  {validationResults.errors.length > 0 && (
                    <Button onClick={downloadErrorReport} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar Errores
                    </Button>
                  )}
                  <Button onClick={resetValidator} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Nuevo Archivo
                  </Button>
                </div>
              </div>

              {/* Progreso general */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Tasa de éxito</span>
                  <span>{validationResults.summary.successRate.toFixed(1)}%</span>
                </div>
                <Progress value={validationResults.summary.successRate} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{validationResults.summary.validRows} válidos</span>
                  <span>{validationResults.summary.errorRows} errores</span>
                  <span>{validationResults.summary.warningRows} advertencias</span>
                </div>
              </div>

              {/* Estadísticas por sección */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{validationResults.summary.departments.total}</div>
                      <div className="text-sm text-muted-foreground">Departamentos</div>
                      <div className="text-xs mt-1">
                        {validationResults.summary.departments.duplicates > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {validationResults.summary.departments.duplicates} duplicados
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{validationResults.summary.mayores.total}</div>
                      <div className="text-sm text-muted-foreground">Mayores</div>
                      <div className="text-xs mt-1 space-x-1">
                        {validationResults.summary.mayores.duplicates > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {validationResults.summary.mayores.duplicates} duplicados
                          </Badge>
                        )}
                        {validationResults.summary.mayores.missingDepartments > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {validationResults.summary.mayores.missingDepartments} referencias inválidas
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{validationResults.summary.partidas.total}</div>
                      <div className="text-sm text-muted-foreground">Partidas</div>
                      <div className="text-xs mt-1 space-x-1">
                        {validationResults.summary.partidas.duplicates > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {validationResults.summary.partidas.duplicates} duplicados
                          </Badge>
                        )}
                        {validationResults.summary.partidas.missingMayores > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {validationResults.summary.partidas.missingMayores} referencias inválidas
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{validationResults.summary.subpartidas.total}</div>
                      <div className="text-sm text-muted-foreground">Subpartidas</div>
                      <div className="text-xs mt-1 space-x-1">
                        {validationResults.summary.subpartidas.duplicates > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {validationResults.summary.subpartidas.duplicates} duplicados
                          </Badge>
                        )}
                        {validationResults.summary.subpartidas.missingPartidas > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {validationResults.summary.subpartidas.missingPartidas} referencias inválidas
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Lista de errores */}
              {validationResults.errors.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Errores y Advertencias ({validationResults.errors.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Hoja</TableHead>
                            <TableHead>Fila</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead>Sugerencia</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {validationResults.errors.map((error, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <Badge variant={error.type === 'error' ? 'destructive' : 'secondary'}>
                                  {error.type === 'error' ? 'Error' : 'Advertencia'}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">{error.sheet}</TableCell>
                              <TableCell>{error.row || '-'}</TableCell>
                              <TableCell>{error.message}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {error.suggestion}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* Recomendaciones */}
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">Recomendaciones:</p>
                    {validationResults.summary.canProceed ? (
                      <p className="text-sm">
                        ✅ El archivo está listo para importar. Todos los registros son válidos y no se encontraron errores críticos.
                      </p>
                    ) : (
                      <div className="text-sm space-y-1">
                        <p>❌ Corrige los errores antes de importar:</p>
                        <ul className="list-disc list-inside ml-4 space-y-1">
                          <li>Descarga el reporte de errores para obtener detalles específicos</li>
                          <li>Corrige los errores en tu archivo Excel original</li>
                          <li>Vuelve a validar el archivo antes de importar</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}