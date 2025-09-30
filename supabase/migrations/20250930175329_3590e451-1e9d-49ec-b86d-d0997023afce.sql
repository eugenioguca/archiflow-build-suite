-- Add soft delete column to planning_budgets
ALTER TABLE public.planning_budgets ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for better query performance on non-deleted budgets
CREATE INDEX idx_planning_budgets_deleted_at ON public.planning_budgets(deleted_at) WHERE deleted_at IS NULL;

-- Update RLS policies to hide deleted budgets by default
DROP POLICY IF EXISTS "Users with planning_v2 roles can manage budgets" ON public.planning_budgets;

CREATE POLICY "Users with planning_v2 roles can view non-deleted budgets"
ON public.planning_budgets
FOR SELECT
USING (
  deleted_at IS NULL 
  AND (
    public.has_planning_v2_role(auth.uid(), 'viewer')
    OR public.has_planning_v2_role(auth.uid(), 'editor')
    OR public.has_planning_v2_role(auth.uid(), 'publisher')
  )
);

CREATE POLICY "Users with planning_v2 roles can view trash"
ON public.planning_budgets
FOR SELECT
USING (
  deleted_at IS NOT NULL 
  AND (
    public.has_planning_v2_role(auth.uid(), 'editor')
    OR public.has_planning_v2_role(auth.uid(), 'publisher')
  )
);

CREATE POLICY "Users with editor+ can insert budgets"
ON public.planning_budgets
FOR INSERT
WITH CHECK (
  public.has_planning_v2_role(auth.uid(), 'editor')
  OR public.has_planning_v2_role(auth.uid(), 'publisher')
);

CREATE POLICY "Users with editor+ can update budgets"
ON public.planning_budgets
FOR UPDATE
USING (
  public.has_planning_v2_role(auth.uid(), 'editor')
  OR public.has_planning_v2_role(auth.uid(), 'publisher')
);

CREATE POLICY "Users with publisher can delete budgets permanently"
ON public.planning_budgets
FOR DELETE
USING (
  public.has_planning_v2_role(auth.uid(), 'publisher')
);