-- Create planning_concepto_tu_links table
CREATE TABLE IF NOT EXISTS public.planning_concepto_tu_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concepto_id UUID NOT NULL REFERENCES public.planning_conceptos(id) ON DELETE CASCADE,
  tu_tx_id UUID NOT NULL REFERENCES public.unified_financial_transactions(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE(concepto_id, tu_tx_id)
);

-- Enable RLS
ALTER TABLE public.planning_concepto_tu_links ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Employees and admins can manage links
CREATE POLICY "Employees and admins can manage planning_concepto_tu_links"
ON public.planning_concepto_tu_links
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.role IN ('admin', 'employee')
  )
);

-- Add index for performance
CREATE INDEX idx_planning_concepto_tu_links_concepto ON public.planning_concepto_tu_links(concepto_id);
CREATE INDEX idx_planning_concepto_tu_links_tu_tx ON public.planning_concepto_tu_links(tu_tx_id);

-- Add updated_at trigger
CREATE TRIGGER update_planning_concepto_tu_links_updated_at
BEFORE UPDATE ON public.planning_concepto_tu_links
FOR EACH ROW
EXECUTE FUNCTION public.update_planning_updated_at();