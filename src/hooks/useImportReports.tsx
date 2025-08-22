import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ImportHistoryRecord {
  id: string;
  created_at: string;
  file_name: string;
  file_size: number;
  total_rows_processed: number;
  total_rows_successful: number;
  total_rows_failed: number;
  mayores_inserted: number;
  partidas_inserted: number;
  subpartidas_inserted: number;
  departamentos_inserted: number;
  error_summary: any; // Can be string[] or JSON
  error_categories: any; // JSON object
  validation_warnings?: string[] | null;
  status: string;
  duration_seconds?: number;
  processed_sheets: string[];
  sheet_summaries: any;
}

interface ImportAnalysis {
  quality_score?: number;
  quality_grade?: string;
  recommendations?: any; // Can be string[] or JSON
  success_rate?: string;
  total_errors?: number;
  error_breakdown?: any;
}

export function useImportReports() {
  const [importHistory, setImportHistory] = useState<ImportHistoryRecord[]>([]);
  const [latestImport, setLatestImport] = useState<ImportHistoryRecord | null>(null);
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch import history
  const fetchImportHistory = async (limit: number = 10) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('import_history')
        .select('*')
        .eq('import_type', 'chart_of_accounts')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Process and normalize the data
      const processedData = (data || []).map(record => ({
        ...record,
        error_summary: Array.isArray(record.error_summary) ? record.error_summary : 
                      typeof record.error_summary === 'string' ? JSON.parse(record.error_summary) : [],
        error_categories: typeof record.error_categories === 'object' ? record.error_categories : {},
        processed_sheets: Array.isArray(record.processed_sheets) ? record.processed_sheets : []
      }));

      setImportHistory(processedData);
      if (processedData && processedData.length > 0) {
        setLatestImport(processedData[0]);
        await fetchAnalysis(processedData[0].id);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Error al cargar el historial: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch quality analysis for an import
  const fetchAnalysis = async (importId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('analyze_import_quality', { history_id: importId });

      if (error) throw error;
      
      // Handle the JSON data from the database function
      if (data) {
        const analysisData = typeof data === 'string' ? JSON.parse(data) : data;
        // Normalize recommendations to array
        if (analysisData.recommendations && typeof analysisData.recommendations === 'string') {
          analysisData.recommendations = JSON.parse(analysisData.recommendations);
        }
        setAnalysis(analysisData as ImportAnalysis);
      }
    } catch (error: any) {
      console.error('Error fetching analysis:', error);
    }
  };

  // Save import result to history
  const saveImportResult = async (importData: {
    file_name: string;
    file_size: number;
    total_rows_processed: number;
    total_rows_successful: number;
    total_rows_failed: number;
    mayores_inserted: number;
    partidas_inserted: number;
    subpartidas_inserted: number;
    departamentos_inserted?: number;
    error_summary: string[];
    processed_sheets: string[];
    duration_seconds?: number;
    status: 'completed' | 'failed' | 'partial';
  }) => {
    try {
      // Get current user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile) {
        throw new Error("No se pudo obtener el perfil del usuario");
      }

      // Categorize errors using database function
      const { data: errorCategories } = await supabase
        .rpc('categorize_import_errors', { errors: importData.error_summary });

      // Build sheet summaries
      const sheetSummaries = {
        mayores: { processed: true, records: importData.mayores_inserted },
        partidas: { processed: true, records: importData.partidas_inserted },
        subpartidas: { processed: true, records: importData.subpartidas_inserted },
        ...(importData.departamentos_inserted && {
          departamentos: { processed: true, records: importData.departamentos_inserted }
        })
      };

      const { data, error } = await supabase
        .from('import_history')
        .insert({
          import_type: 'chart_of_accounts',
          file_name: importData.file_name,
          file_size: importData.file_size,
          total_rows_processed: importData.total_rows_processed,
          total_rows_successful: importData.total_rows_successful,
          total_rows_failed: importData.total_rows_failed,
          mayores_inserted: importData.mayores_inserted,
          partidas_inserted: importData.partidas_inserted,
          subpartidas_inserted: importData.subpartidas_inserted,
          departamentos_inserted: importData.departamentos_inserted || 0,
          error_summary: importData.error_summary,
          error_categories: errorCategories || {},
          processed_sheets: importData.processed_sheets,
          sheet_summaries: sheetSummaries,
          status: importData.status,
          duration_seconds: importData.duration_seconds,
          created_by: profile.id
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh history after saving
      await fetchImportHistory();
      
      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Error al guardar el historial: " + error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  // Pre-validate Excel file
  const validateExcelFile = async (file: File): Promise<{
    isValid: boolean;
    warnings: string[];
    estimatedSuccess: number;
    sheetAnalysis: any;
  }> => {
    try {
      // This would analyze the file structure without importing
      // For now, return mock validation
      return {
        isValid: true,
        warnings: [],
        estimatedSuccess: 85,
        sheetAnalysis: {
          mayores: { found: true, rows: 10 },
          partidas: { found: true, rows: 25 },
          subpartidas: { found: true, rows: 50 }
        }
      };
    } catch (error: any) {
      return {
        isValid: false,
        warnings: [error.message],
        estimatedSuccess: 0,
        sheetAnalysis: {}
      };
    }
  };

  // Initialize data on mount
  useEffect(() => {
    fetchImportHistory();
  }, []);

  return {
    importHistory,
    latestImport,
    analysis,
    loading,
    fetchImportHistory,
    fetchAnalysis,
    saveImportResult,
    validateExcelFile,
    refresh: () => fetchImportHistory()
  };
}