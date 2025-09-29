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

  // Importar datos validados
  const importDataMutation = useMutation({
    mutationFn: async ({ partidaId, rows }: { partidaId: string; rows: any[] }) => {
      // Crear conceptos uno por uno
      const results = [];
      for (const row of rows) {
        if (!row.isValid) continue;
        
        try {
          await createConcepto({
            partida_id: partidaId,
            code: row.data.code || null,
            short_description: row.data.short_description,
            long_description: row.data.long_description || null,
            unit: row.data.unit,
            provider: row.data.provider || null,
            active: true,
            sumable: true,
            order_index: 0,
            props: {},
            cantidad_real: row.data.cantidad_real || 0,
            desperdicio_pct: row.data.desperdicio_pct || 0,
            cantidad: 0, // Se calculará
            precio_real: row.data.precio_real || 0,
            honorarios_pct: row.data.honorarios_pct || 0,
            pu: 0, // Se calculará
            total_real: 0, // Se calculará
            total: 0, // Se calculará
            wbs_code: row.data.wbs_code || null,
          });
          results.push({ success: true, row: row.rowIndex });
        } catch (error) {
          results.push({ success: false, row: row.rowIndex, error });
        }
      }
      
      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      queryClient.invalidateQueries({ queryKey: ['budget', budgetId] });
      
      toast({
        title: 'Importación completada',
        description: `${successCount} conceptos importados correctamente`,
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
