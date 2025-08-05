-- Clean up duplicate design phases, keeping only the most recent ones
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY project_id, phase_name, phase_order 
      ORDER BY created_at DESC
    ) as rn
  FROM public.design_phases
)
DELETE FROM public.design_phases 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);