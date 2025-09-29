-- Planning v2: Budget Snapshots and Versions
-- Immutable snapshots when publishing budgets

-- Budget snapshots table
CREATE TABLE IF NOT EXISTS public.planning_budget_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.planning_budgets(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  snapshot_data JSONB NOT NULL, -- Complete frozen state
  totals JSONB NOT NULL, -- Precalculated totals
  settings JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(budget_id, version_number)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_planning_snapshots_budget 
  ON public.planning_budget_snapshots(budget_id, version_number DESC);

-- RLS Policies
ALTER TABLE public.planning_budget_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees and admins can view snapshots"
  ON public.planning_budget_snapshots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('admin', 'employee')
    )
  );

CREATE POLICY "Employees and admins can create snapshots"
  ON public.planning_budget_snapshots
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('admin', 'employee')
    )
  );

-- Trigger to update budget updated_at when snapshot is created
CREATE OR REPLACE FUNCTION update_budget_on_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.planning_budgets
  SET updated_at = now()
  WHERE id = NEW.budget_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_budget_on_snapshot
  AFTER INSERT ON public.planning_budget_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_on_snapshot();