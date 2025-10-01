-- Add provider_id column to planning_conceptos table
ALTER TABLE public.planning_conceptos
ADD COLUMN provider_id UUID REFERENCES public.suppliers(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_planning_conceptos_provider_id 
ON public.planning_conceptos(provider_id);

-- Add comment
COMMENT ON COLUMN public.planning_conceptos.provider_id IS 'Foreign key to suppliers table - replaces text provider field';