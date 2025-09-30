-- Add post-venta support to Planning v2

-- Add post-venta fields to planning_conceptos
ALTER TABLE public.planning_conceptos
ADD COLUMN IF NOT EXISTS is_postventa BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS change_reason TEXT;

COMMENT ON COLUMN public.planning_conceptos.is_postventa IS 'Marca si el concepto es un cambio post-venta';
COMMENT ON COLUMN public.planning_conceptos.change_reason IS 'Motivo del cambio post-venta';

-- Add version_type to planning_budget_snapshots
ALTER TABLE public.planning_budget_snapshots
ADD COLUMN IF NOT EXISTS version_type TEXT NOT NULL DEFAULT 'base' CHECK (version_type IN ('base', 'postventa'));

COMMENT ON COLUMN public.planning_budget_snapshots.version_type IS 'Tipo de versión: base (inicial) o postventa (cambios)';

-- Create index for filtering post-venta conceptos
CREATE INDEX IF NOT EXISTS idx_planning_conceptos_is_postventa 
ON public.planning_conceptos(is_postventa) 
WHERE is_postventa = true;

-- Create index for filtering snapshots by version type
CREATE INDEX IF NOT EXISTS idx_planning_budget_snapshots_version_type
ON public.planning_budget_snapshots(version_type);
