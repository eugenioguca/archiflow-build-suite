-- Phase 7: Templates & Tests for Planning v2

-- Tabla de plantillas
CREATE TABLE IF NOT EXISTS public.planning_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  department TEXT, -- Para filtrar plantillas por departamento
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  settings JSONB DEFAULT '{}'::jsonb -- Configuración general
);

-- Tabla de campos dinámicos de plantilla
CREATE TABLE IF NOT EXISTS public.planning_template_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.planning_templates(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL, -- 'number', 'text', 'boolean', 'date'
  field_role TEXT NOT NULL DEFAULT 'input', -- 'input' o 'computed'
  default_value TEXT,
  formula TEXT, -- Fórmula si es computed
  visible BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  helptext TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_id, field_key)
);

-- Tabla de partidas base de plantilla
CREATE TABLE IF NOT EXISTS public.planning_template_partidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.planning_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de conceptos base de plantilla
CREATE TABLE IF NOT EXISTS public.planning_template_conceptos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_partida_id UUID NOT NULL REFERENCES public.planning_template_partidas(id) ON DELETE CASCADE,
  code TEXT,
  short_description TEXT NOT NULL,
  long_description TEXT,
  unit TEXT NOT NULL,
  provider TEXT,
  order_index INTEGER NOT NULL,
  sumable BOOLEAN DEFAULT true,
  default_values JSONB DEFAULT '{}'::jsonb, -- Valores por defecto para campos dinámicos
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de tests por plantilla
CREATE TABLE IF NOT EXISTS public.planning_template_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.planning_templates(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  test_inputs JSONB NOT NULL, -- Array de conceptos con valores de entrada
  expected_grand_total NUMERIC(15,2) NOT NULL,
  expected_outputs JSONB, -- Valores esperados de campos calculados específicos
  last_run_status TEXT, -- 'passed', 'failed', 'not_run'
  last_run_at TIMESTAMPTZ,
  last_run_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_planning_template_fields_template ON public.planning_template_fields(template_id);
CREATE INDEX IF NOT EXISTS idx_planning_template_partidas_template ON public.planning_template_partidas(template_id);
CREATE INDEX IF NOT EXISTS idx_planning_template_conceptos_partida ON public.planning_template_conceptos(template_partida_id);
CREATE INDEX IF NOT EXISTS idx_planning_template_tests_template ON public.planning_template_tests(template_id);

-- RLS Policies
ALTER TABLE public.planning_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_template_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_template_partidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_template_conceptos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_template_tests ENABLE ROW LEVEL SECURITY;

-- Employees and admins can manage templates
CREATE POLICY "Employees can manage templates"
ON public.planning_templates
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.role IN ('admin', 'employee')
  )
);

CREATE POLICY "Employees can manage template fields"
ON public.planning_template_fields
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.role IN ('admin', 'employee')
  )
);

CREATE POLICY "Employees can manage template partidas"
ON public.planning_template_partidas
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.role IN ('admin', 'employee')
  )
);

CREATE POLICY "Employees can manage template conceptos"
ON public.planning_template_conceptos
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.role IN ('admin', 'employee')
  )
);

CREATE POLICY "Employees can manage template tests"
ON public.planning_template_tests
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.role IN ('admin', 'employee')
  )
);

-- Trigger para updated_at en templates
CREATE OR REPLACE FUNCTION update_planning_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_planning_templates_updated_at
BEFORE UPDATE ON public.planning_templates
FOR EACH ROW
EXECUTE FUNCTION update_planning_template_updated_at();

CREATE TRIGGER trigger_update_planning_template_tests_updated_at
BEFORE UPDATE ON public.planning_template_tests
FOR EACH ROW
EXECUTE FUNCTION update_planning_template_updated_at();