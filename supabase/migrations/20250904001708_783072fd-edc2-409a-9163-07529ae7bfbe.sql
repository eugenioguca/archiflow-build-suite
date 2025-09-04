-- Add month+week fields to cronograma_gantt table
ALTER TABLE cronograma_gantt 
ADD COLUMN start_month INTEGER,
ADD COLUMN start_week INTEGER CHECK (start_week >= 1 AND start_week <= 4),
ADD COLUMN end_month INTEGER,
ADD COLUMN end_week INTEGER CHECK (end_week >= 1 AND end_week <= 4),
ADD COLUMN duration_weeks INTEGER;

-- Backfill month+week data from existing dates
UPDATE cronograma_gantt 
SET 
  start_month = EXTRACT(MONTH FROM fecha_inicio)::INTEGER,
  start_week = LEAST(4, GREATEST(1, CEIL(EXTRACT(DAY FROM fecha_inicio) / 7.0)::INTEGER)),
  end_month = EXTRACT(MONTH FROM fecha_fin)::INTEGER,
  end_week = LEAST(4, GREATEST(1, CEIL(EXTRACT(DAY FROM fecha_fin) / 7.0)::INTEGER)),
  duration_weeks = GREATEST(1, CEIL((fecha_fin - fecha_inicio + 1) / 7.0)::INTEGER)
WHERE fecha_inicio IS NOT NULL AND fecha_fin IS NOT NULL;

-- Mark old date fields as deprecated (comment for future reference)
COMMENT ON COLUMN cronograma_gantt.fecha_inicio IS 'DEPRECATED: Use start_month/start_week instead';
COMMENT ON COLUMN cronograma_gantt.fecha_fin IS 'DEPRECATED: Use end_month/end_week instead';
COMMENT ON COLUMN cronograma_gantt.duracion IS 'DEPRECATED: Use duration_weeks instead';