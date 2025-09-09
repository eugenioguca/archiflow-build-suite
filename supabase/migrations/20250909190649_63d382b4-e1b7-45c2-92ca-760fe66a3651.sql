-- Add codigo_snapshot to presupuesto_ejecutivo_subpartida for caching subpartida codes
ALTER TABLE public.presupuesto_ejecutivo_subpartida 
ADD COLUMN IF NOT EXISTS codigo_snapshot text;