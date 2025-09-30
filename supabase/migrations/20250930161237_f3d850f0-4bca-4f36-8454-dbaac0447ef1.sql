-- Tabla para mapear la estructura de Planning v2 con Transacciones Unificadas
CREATE TABLE IF NOT EXISTS public.planning_tu_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.planning_budgets(id) ON DELETE CASCADE,
  partida_id UUID NOT NULL REFERENCES public.planning_partidas(id) ON DELETE CASCADE,
  
  -- Referencias a TU (solo IDs, read-only)
  tu_departamento TEXT,
  tu_mayor_id UUID REFERENCES public.chart_of_accounts_mayor(id) ON DELETE SET NULL,
  tu_partida_id UUID REFERENCES public.chart_of_accounts_partidas(id) ON DELETE SET NULL,
  tu_subpartida_id UUID REFERENCES public.chart_of_accounts_subpartidas(id) ON DELETE SET NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  notes TEXT,
  
  -- Un mapeo único por partida en un presupuesto
  UNIQUE(budget_id, partida_id)
);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_planning_tu_mapping_budget_id ON public.planning_tu_mapping(budget_id);
CREATE INDEX IF NOT EXISTS idx_planning_tu_mapping_partida_id ON public.planning_tu_mapping(partida_id);
CREATE INDEX IF NOT EXISTS idx_planning_tu_mapping_tu_mayor_id ON public.planning_tu_mapping(tu_mayor_id);

-- RLS
ALTER TABLE public.planning_tu_mapping ENABLE ROW LEVEL SECURITY;

-- Policy para SELECT: usuarios con acceso al presupuesto
CREATE POLICY "Users can view TU mappings for their budgets"
  ON public.planning_tu_mapping FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.planning_budgets pb
      WHERE pb.id = planning_tu_mapping.budget_id
      AND (
        pb.created_by = auth.uid()
        OR public.has_planning_v2_role(auth.uid(), 'viewer')
        OR public.has_planning_v2_role(auth.uid(), 'editor')
      )
    )
  );

-- Policy para INSERT/UPDATE/DELETE: solo creadores y editores
CREATE POLICY "Users can manage TU mappings for their budgets"
  ON public.planning_tu_mapping FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.planning_budgets pb
      WHERE pb.id = planning_tu_mapping.budget_id
      AND (
        pb.created_by = auth.uid()
        OR public.has_planning_v2_role(auth.uid(), 'editor')
      )
    )
  );