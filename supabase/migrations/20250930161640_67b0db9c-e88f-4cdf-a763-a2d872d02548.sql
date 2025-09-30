-- Agregar campos de override de defaults a nivel partida
ALTER TABLE public.planning_partidas
ADD COLUMN IF NOT EXISTS honorarios_pct_override NUMERIC(10,6) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS desperdicio_pct_override NUMERIC(10,6) DEFAULT NULL;

-- Comentarios para documentar el propósito
COMMENT ON COLUMN public.planning_partidas.honorarios_pct_override IS 'Override de % honorarios a nivel partida. Si es NULL, usa el default del budget.';
COMMENT ON COLUMN public.planning_partidas.desperdicio_pct_override IS 'Override de % desperdicio a nivel partida. Si es NULL, usa el default del budget.';