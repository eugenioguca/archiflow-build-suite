-- Create new Cronograma Gantt v2 tables

-- Main plan table
CREATE TABLE IF NOT EXISTS public.cronograma_gantt_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL,
  proyecto_id UUID NOT NULL,
  start_month TEXT NOT NULL, -- YYYYMM format
  months_count INTEGER NOT NULL DEFAULT 12,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  CONSTRAINT valid_months_count CHECK (months_count >= 3 AND months_count <= 24),
  CONSTRAINT valid_start_month CHECK (start_month ~ '^(19|20)\d{2}(0[1-9]|1[0-2])$'),
  UNIQUE(cliente_id, proyecto_id)
);

-- Lines in the gantt table (visible rows)
CREATE TABLE IF NOT EXISTS public.cronograma_gantt_line (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.cronograma_gantt_plan(id) ON DELETE CASCADE,
  line_no INTEGER NOT NULL,
  mayor_id UUID NULL, -- reference to chart_of_accounts_mayor
  label TEXT NULL, -- custom label if not using mayor_id
  is_discount BOOLEAN NOT NULL DEFAULT FALSE,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  percent NUMERIC(6,3) NULL, -- percentage of subtotal
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID
);

-- Activities (week ranges) for each line
CREATE TABLE IF NOT EXISTS public.cronograma_gantt_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id UUID NOT NULL REFERENCES public.cronograma_gantt_line(id) ON DELETE CASCADE,
  start_month TEXT NOT NULL, -- YYYYMM format
  start_week INTEGER NOT NULL,
  end_month TEXT NOT NULL, -- YYYYMM format
  end_week INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  CONSTRAINT valid_start_month CHECK (start_month ~ '^(19|20)\d{2}(0[1-9]|1[0-2])$'),
  CONSTRAINT valid_end_month CHECK (end_month ~ '^(19|20)\d{2}(0[1-9]|1[0-2])$'),
  CONSTRAINT valid_start_week CHECK (start_week >= 1 AND start_week <= 4),
  CONSTRAINT valid_end_week CHECK (end_week >= 1 AND end_week <= 4)
);

-- Matrix manual overrides table (create if not exists)
CREATE TABLE IF NOT EXISTS public.cronograma_matriz_manual (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL,
  proyecto_id UUID NOT NULL,
  mes TEXT NOT NULL, -- YYYYMM format
  concepto TEXT NOT NULL,
  valor NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  CONSTRAINT valid_mes CHECK (mes ~ '^(19|20)\d{2}(0[1-9]|1[0-2])$'),
  UNIQUE(cliente_id, proyecto_id, mes, concepto)
);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_cronograma_gantt_plan_updated_at
  BEFORE UPDATE ON public.cronograma_gantt_plan
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cronograma_gantt_line_updated_at
  BEFORE UPDATE ON public.cronograma_gantt_line
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cronograma_gantt_activity_updated_at
  BEFORE UPDATE ON public.cronograma_gantt_activity
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cronograma_gantt_plan_cliente_proyecto 
  ON public.cronograma_gantt_plan(cliente_id, proyecto_id);

CREATE INDEX IF NOT EXISTS idx_cronograma_gantt_line_plan_id 
  ON public.cronograma_gantt_line(plan_id);

CREATE INDEX IF NOT EXISTS idx_cronograma_gantt_line_order 
  ON public.cronograma_gantt_line(plan_id, order_index);

CREATE INDEX IF NOT EXISTS idx_cronograma_gantt_activity_line_id 
  ON public.cronograma_gantt_activity(line_id);

CREATE INDEX IF NOT EXISTS idx_cronograma_matriz_manual_cliente_proyecto 
  ON public.cronograma_matriz_manual(cliente_id, proyecto_id);

-- RLS Policies
ALTER TABLE public.cronograma_gantt_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cronograma_gantt_line ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.cronograma_gantt_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cronograma_matriz_manual ENABLE ROW LEVEL SECURITY;

-- Employees and admins can manage all cronograma data
CREATE POLICY "Employees and admins can manage cronograma plans" ON public.cronograma_gantt_plan
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role IN ('admin', 'employee')
    )
  );

CREATE POLICY "Employees and admins can manage cronograma lines" ON public.cronograma_gantt_line
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role IN ('admin', 'employee')
    )
  );

CREATE POLICY "Employees and admins can manage cronograma activities" ON public.cronograma_gantt_activity
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role IN ('admin', 'employee')
    )
  );

CREATE POLICY "Employees and admins can manage matriz manual" ON public.cronograma_matriz_manual
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role IN ('admin', 'employee')
    )
  );