-- Planning v2 Module - Phase 0: New isolated tables
-- All tables prefixed with planning_ to avoid conflicts

-- Main budget table
CREATE TABLE IF NOT EXISTS public.planning_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.client_projects(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MXN',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
  settings JSONB DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partidas (sections/divisions)
CREATE TABLE IF NOT EXISTS public.planning_partidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.planning_budgets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Conceptos (line items)
CREATE TABLE IF NOT EXISTS public.planning_conceptos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partida_id UUID NOT NULL REFERENCES public.planning_partidas(id) ON DELETE CASCADE,
  code TEXT,
  short_description TEXT NOT NULL,
  long_description TEXT,
  unit TEXT NOT NULL,
  provider TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sumable BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  props JSONB DEFAULT '{}'::jsonb,
  
  -- Quantity fields
  cantidad_real NUMERIC(18, 6) DEFAULT 0,
  desperdicio_pct NUMERIC(18, 6) DEFAULT 0,
  cantidad NUMERIC(18, 6) DEFAULT 0,
  
  -- Price fields
  precio_real NUMERIC(18, 6) DEFAULT 0,
  honorarios_pct NUMERIC(18, 6) DEFAULT 0,
  pu NUMERIC(18, 6) DEFAULT 0,
  
  -- Total fields
  total_real NUMERIC(18, 6) DEFAULT 0,
  total NUMERIC(18, 6) DEFAULT 0,
  
  -- WBS reference
  wbs_code TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Templates for budget structures
CREATE TABLE IF NOT EXISTS public.planning_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Template field definitions
CREATE TABLE IF NOT EXISTS public.planning_template_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.planning_templates(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('input', 'computed')),
  default_value TEXT,
  formula TEXT,
  visible BOOLEAN NOT NULL DEFAULT true,
  helptext TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WBS codes catalog (linking to TU dimensions)
CREATE TABLE IF NOT EXISTS public.planning_wbs_codes (
  code TEXT PRIMARY KEY,
  departamento TEXT,
  mayor TEXT,
  partida TEXT,
  subpartida TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Price observations (historical prices)
CREATE TABLE IF NOT EXISTS public.planning_price_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wbs_code TEXT REFERENCES public.planning_wbs_codes(code) ON DELETE SET NULL,
  unit TEXT NOT NULL,
  pu NUMERIC(18, 6) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MXN',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  provider TEXT,
  project_id UUID REFERENCES public.client_projects(id) ON DELETE SET NULL,
  region TEXT,
  source TEXT NOT NULL CHECK (source IN ('budget', 'tu')),
  props JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_planning_budgets_project ON public.planning_budgets(project_id);
CREATE INDEX IF NOT EXISTS idx_planning_budgets_client ON public.planning_budgets(client_id);
CREATE INDEX IF NOT EXISTS idx_planning_budgets_status ON public.planning_budgets(status);
CREATE INDEX IF NOT EXISTS idx_planning_partidas_budget ON public.planning_partidas(budget_id);
CREATE INDEX IF NOT EXISTS idx_planning_conceptos_partida ON public.planning_conceptos(partida_id);
CREATE INDEX IF NOT EXISTS idx_planning_conceptos_wbs ON public.planning_conceptos(wbs_code);
CREATE INDEX IF NOT EXISTS idx_planning_template_fields_template ON public.planning_template_fields(template_id);
CREATE INDEX IF NOT EXISTS idx_planning_price_observations_wbs ON public.planning_price_observations(wbs_code);
CREATE INDEX IF NOT EXISTS idx_planning_price_observations_project ON public.planning_price_observations(project_id);

-- RLS Policies
ALTER TABLE public.planning_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_partidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_conceptos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_template_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_wbs_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_price_observations ENABLE ROW LEVEL SECURITY;

-- Employees and admins can manage all planning v2 data
CREATE POLICY "Employees and admins can manage planning budgets"
  ON public.planning_budgets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('admin', 'employee')
    )
  );

CREATE POLICY "Employees and admins can manage planning partidas"
  ON public.planning_partidas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('admin', 'employee')
    )
  );

CREATE POLICY "Employees and admins can manage planning conceptos"
  ON public.planning_conceptos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('admin', 'employee')
    )
  );

CREATE POLICY "Employees and admins can manage planning templates"
  ON public.planning_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('admin', 'employee')
    )
  );

CREATE POLICY "Employees and admins can view template fields"
  ON public.planning_template_fields
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('admin', 'employee')
    )
  );

CREATE POLICY "Employees and admins can view wbs codes"
  ON public.planning_wbs_codes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('admin', 'employee')
    )
  );

CREATE POLICY "Employees and admins can manage price observations"
  ON public.planning_price_observations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.role IN ('admin', 'employee')
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_planning_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_planning_budgets_updated_at
  BEFORE UPDATE ON public.planning_budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_planning_updated_at();

CREATE TRIGGER update_planning_partidas_updated_at
  BEFORE UPDATE ON public.planning_partidas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_planning_updated_at();

CREATE TRIGGER update_planning_conceptos_updated_at
  BEFORE UPDATE ON public.planning_conceptos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_planning_updated_at();