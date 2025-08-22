-- Create table for import history and error analysis
CREATE TABLE IF NOT EXISTS public.import_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  
  -- Import metadata
  import_type text NOT NULL, -- 'chart_of_accounts', 'transactions', etc.
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  
  -- Results summary
  total_rows_processed integer NOT NULL DEFAULT 0,
  total_rows_successful integer NOT NULL DEFAULT 0,
  total_rows_failed integer NOT NULL DEFAULT 0,
  
  -- Detailed breakdown by entity type
  mayores_inserted integer NOT NULL DEFAULT 0,
  partidas_inserted integer NOT NULL DEFAULT 0,
  subpartidas_inserted integer NOT NULL DEFAULT 0,
  departamentos_inserted integer NOT NULL DEFAULT 0,
  
  -- Error analysis
  error_summary jsonb NOT NULL DEFAULT '[]'::jsonb,
  error_categories jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation_warnings text[],
  
  -- Import status
  status text NOT NULL DEFAULT 'completed', -- 'completed', 'failed', 'partial'
  duration_seconds numeric,
  
  -- Raw data for analysis
  processed_sheets text[],
  sheet_summaries jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Employees and admins can manage import history" 
ON public.import_history 
FOR ALL 
USING (EXISTS (
  SELECT 1 
  FROM profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));

-- Create indexes for better performance
CREATE INDEX idx_import_history_created_by ON public.import_history(created_by);
CREATE INDEX idx_import_history_import_type ON public.import_history(import_type);
CREATE INDEX idx_import_history_created_at ON public.import_history(created_at DESC);
CREATE INDEX idx_import_history_status ON public.import_history(status);

-- Create function to categorize errors
CREATE OR REPLACE FUNCTION categorize_import_errors(errors text[])
RETURNS jsonb AS $$
DECLARE
  categories jsonb := '{}'::jsonb;
  error_text text;
  duplicate_count integer := 0;
  reference_count integer := 0;
  validation_count integer := 0;
  format_count integer := 0;
  database_count integer := 0;
  unknown_count integer := 0;
BEGIN
  FOREACH error_text IN ARRAY errors
  LOOP
    IF error_text ILIKE '%duplicate%' OR error_text ILIKE '%already exists%' OR error_text ILIKE '%duplicated%' THEN
      duplicate_count := duplicate_count + 1;
    ELSIF error_text ILIKE '%no se encontró%' OR error_text ILIKE '%not found%' OR error_text ILIKE '%reference%' THEN
      reference_count := reference_count + 1;
    ELSIF error_text ILIKE '%formato%' OR error_text ILIKE '%format%' OR error_text ILIKE '%invalid%' THEN
      validation_count := validation_count + 1;
    ELSIF error_text ILIKE '%violates%' OR error_text ILIKE '%constraint%' OR error_text ILIKE '%foreign key%' THEN
      format_count := format_count + 1;
    ELSIF error_text ILIKE '%database%' OR error_text ILIKE '%connection%' OR error_text ILIKE '%timeout%' THEN
      database_count := database_count + 1;
    ELSE
      unknown_count := unknown_count + 1;
    END IF;
  END LOOP;

  categories := jsonb_build_object(
    'duplicates', duplicate_count,
    'missing_references', reference_count,
    'validation_errors', validation_count,
    'format_errors', format_count,
    'database_errors', database_count,
    'unknown_errors', unknown_count
  );

  RETURN categories;
END;
$$ LANGUAGE plpgsql;

-- Create function to analyze import quality
CREATE OR REPLACE FUNCTION analyze_import_quality(history_id uuid)
RETURNS jsonb AS $$
DECLARE
  import_record record;
  quality_score numeric;
  quality_grade text;
  recommendations text[];
  analysis jsonb;
BEGIN
  SELECT * INTO import_record 
  FROM import_history 
  WHERE id = history_id;

  IF NOT FOUND THEN
    RETURN '{"error": "Import record not found"}'::jsonb;
  END IF;

  -- Calculate quality score (0-100)
  IF import_record.total_rows_processed = 0 THEN
    quality_score := 0;
  ELSE
    quality_score := (import_record.total_rows_successful::numeric / import_record.total_rows_processed::numeric) * 100;
  END IF;

  -- Determine quality grade
  IF quality_score >= 95 THEN
    quality_grade := 'Excelente';
  ELSIF quality_score >= 85 THEN
    quality_grade := 'Bueno';
  ELSIF quality_score >= 70 THEN
    quality_grade := 'Regular';
  ELSIF quality_score >= 50 THEN
    quality_grade := 'Deficiente';
  ELSE
    quality_grade := 'Crítico';
  END IF;

  -- Generate recommendations
  recommendations := ARRAY[]::text[];
  
  IF (import_record.error_categories->>'duplicates')::integer > 0 THEN
    recommendations := array_append(recommendations, 'Revisar datos duplicados antes de la importación');
  END IF;
  
  IF (import_record.error_categories->>'missing_references')::integer > 0 THEN
    recommendations := array_append(recommendations, 'Verificar que existen las referencias padre (Mayores -> Partidas -> Subpartidas)');
  END IF;
  
  IF (import_record.error_categories->>'format_errors')::integer > 0 THEN
    recommendations := array_append(recommendations, 'Revisar el formato de los datos (códigos, nombres, valores booleanos)');
  END IF;

  IF quality_score < 70 THEN
    recommendations := array_append(recommendations, 'Considerar validar el archivo antes de importar usando el validador');
  END IF;

  analysis := jsonb_build_object(
    'quality_score', quality_score,
    'quality_grade', quality_grade,
    'recommendations', array_to_json(recommendations),
    'success_rate', quality_score || '%',
    'total_errors', import_record.total_rows_failed,
    'error_breakdown', import_record.error_categories
  );

  RETURN analysis;
END;
$$ LANGUAGE plpgsql;