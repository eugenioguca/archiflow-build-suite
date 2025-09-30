-- Add UNIQUE constraint to planning_price_observations to prevent duplicates
-- This ensures no duplicate observations for the same concepto version

-- Drop existing constraint if it exists (safe operation)
ALTER TABLE public.planning_price_observations 
DROP CONSTRAINT IF EXISTS planning_price_observations_unique_version;

-- Add UNIQUE constraint
ALTER TABLE public.planning_price_observations
ADD CONSTRAINT planning_price_observations_unique_version 
UNIQUE (budget_id, concepto_id, version_number);

-- Add comment
COMMENT ON CONSTRAINT planning_price_observations_unique_version ON public.planning_price_observations 
IS 'Prevents duplicate price observations for the same concepto version. Uses ON CONFLICT DO NOTHING in insert operations.';
