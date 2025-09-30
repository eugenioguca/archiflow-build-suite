/**
 * Hook para gestionar importación y exportación
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { importService, ImportResult, ImportColumn } from '../services/importService';
import { exportService, ExportColumn, ExportOptions } from '../services/exportService';
import { createConcepto, createPartida } from '../services/budgetService';
import { useToast } from '@/hooks/use-toast';

export function useImportExport(budgetId: string) {
  const [parsedData, setParsedData] = useState<ImportResult | null>(null);
  const [columnMapping, setColumnMapping] = useState<Map<string, string>>(new Map());
  const [rawFileData, setRawFileData] = useState<any[][] | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Parsear archivo
  const parseFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const result = await importService.parseFile(file);
      
      // Extraer datos crudos para mapeo posterior
      const reader = new FileReader();
      const rawData = await new Promise<any[][]>((resolve) => {
        reader.onload = (e) => {
          const workbook = (window as any).XLSX.read(e.target?.result, { type: 'binary' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const data = (window as any).XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          resolve(data);
        };
        reader.readAsBinaryString(file);
      });
      
      setRawFileData(rawData);
      
      // Sugerir mapeo automático
      const suggestedMapping = importService.suggestMapping(result.columns);
      setColumnMapping(suggestedMapping);
      
      return result;
    },
    onSuccess: (data) => {
      setParsedData(data);
      toast({
        title: 'Archivo cargado',
        description: `Se encontraron ${data.totalRows} filas. Configure el mapeo de columnas.`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error al cargar archivo',
        description: error.message,
      });
    },
  });

  // Aplicar mapeo y validar
  const applyMapping = () => {
    if (!rawFileData) return;
    
    const validatedRows = importService.applyColumnMapping(rawFileData, columnMapping);
    
    setParsedData(prev => {
      if (!prev) return null;
      
      const validCount = validatedRows.filter(r => r.isValid).length;
      
      return {
        ...prev,
        rows: validatedRows,
        validRows: validCount,
        invalidRows: validatedRows.length - validCount,
      };
    });

    toast({
      title: 'Mapeo aplicado',
      description: `${validatedRows.filter(r => r.isValid).length} filas válidas de ${validatedRows.length}`,
    });
  };

  // Importar datos validados usando transacción atómica
  const importDataMutation = useMutation({
    mutationFn: async ({ partidaId, rows, referenceTotal }: { partidaId: string; rows: any[]; referenceTotal?: number }) => {
      // Usar servicio de importación atómica
      const result = await importService.persistImport(budgetId, partidaId, rows, referenceTotal);
      
      if (!result.success) {
        throw new Error(result.message);
      }
      
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['budget', budgetId] });
      
      toast({
        title: 'Importación completada',
        description: result.message,
      });
      
      // Limpiar estado
      setParsedData(null);
      setColumnMapping(new Map());
      setRawFileData(null);
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error en importación',
        description: error.message,
      });
    },
  });

  // Exportar
  const exportMutation = useMutation({
    mutationFn: async ({
      partidas,
      conceptos,
      options,
    }: {
      partidas: any[];
      conceptos: any[];
      options: ExportOptions;
    }) => {
      if (options.format === 'excel') {
        await exportService.exportToExcel(partidas, conceptos, options);
      } else {
        await exportService.exportToPDF(partidas, conceptos, options);
      }
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Exportación completada',
        description: `Presupuesto exportado a ${variables.options.format.toUpperCase()}`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error en exportación',
        description: error.message,
      });
    },
  });

  return {
    // Import state
    importData: parsedData,
    columnMapping,
    setColumnMapping,
    
    // Import actions
    parseFile: parseFileMutation.mutate,
    isParsingFile: parseFileMutation.isPending,
    applyMapping,
    importRows: importDataMutation.mutate,
    isImporting: importDataMutation.isPending,
    
    // Export action
    exportBudget: exportMutation.mutate,
    isExporting: exportMutation.isPending,
    
    // Utilities
    getAvailableFields: importService.getAvailableFields,
    getDefaultExportColumns: exportService.getDefaultColumns,
  };
}
