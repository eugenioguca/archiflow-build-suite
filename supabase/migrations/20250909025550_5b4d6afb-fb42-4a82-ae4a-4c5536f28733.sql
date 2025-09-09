-- Create the approved two-table model for executive budget

-- PARENT: one per parametric partida
CREATE TABLE IF NOT EXISTS public.presupuesto_ejecutivo_partida (
  id BIGSERIAL PRIMARY KEY,
  cliente_id UUID NOT NULL,
  proyecto_id UUID NOT NULL,
  parametrico_partida_id BIGINT NOT NULL REFERENCES public.presupuesto_parametrico_partida(id) ON DELETE CASCADE,
  importe_ejecutivo NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL DEFAULT (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1),
  UNIQUE (cliente_id, proyecto_id, parametrico_partida_id)
);

-- CHILDREN: executive subpartidas
CREATE TABLE IF NOT EXISTS public.presupuesto_ejecutivo_subpartida (
  id BIGSERIAL PRIMARY KEY,
  cliente_id UUID NOT NULL,
  proyecto_id UUID NOT NULL,
  partida_ejecutivo_id BIGINT NOT NULL REFERENCES public.presupuesto_ejecutivo_partida(id) ON DELETE CASCADE,
  subpartida_id UUID NOT NULL REFERENCES public.chart_of_accounts_subpartidas(id),
  nombre_snapshot TEXT NOT NULL,
  unidad TEXT NOT NULL,
  cantidad NUMERIC(14,3) NOT NULL,
  precio_unitario NUMERIC(14,2) NOT NULL,
  importe NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL DEFAULT (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
);

-- Enable RLS
ALTER TABLE public.presupuesto_ejecutivo_partida ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuesto_ejecutivo_subpartida ENABLE ROW LEVEL SECURITY;

-- RLS Policies for parent table
CREATE POLICY "Employees and admins can manage executive partidas"
ON public.presupuesto_ejecutivo_partida
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.role IN ('admin', 'employee')
  )
);

-- RLS Policies for child table
CREATE POLICY "Employees and admins can manage executive subpartidas"
ON public.presupuesto_ejecutivo_subpartida
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.role IN ('admin', 'employee')
  )
);

-- Trigger to recalculate parent total when child changes
CREATE OR REPLACE FUNCTION public.update_partida_ejecutivo_total()
RETURNS TRIGGER AS $$
BEGIN
  -- Update parent total when child is inserted, updated, or deleted
  UPDATE public.presupuesto_ejecutivo_partida
  SET 
    importe_ejecutivo = (
      SELECT COALESCE(SUM(importe), 0)
      FROM public.presupuesto_ejecutivo_subpartida
      WHERE partida_ejecutivo_id = COALESCE(NEW.partida_ejecutivo_id, OLD.partida_ejecutivo_id)
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.partida_ejecutivo_id, OLD.partida_ejecutivo_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach trigger to child table
CREATE TRIGGER trigger_update_partida_ejecutivo_total
  AFTER INSERT OR UPDATE OR DELETE ON public.presupuesto_ejecutivo_subpartida
  FOR EACH ROW EXECUTE FUNCTION public.update_partida_ejecutivo_total();

-- RPC function for manual recalculation
CREATE OR REPLACE FUNCTION public.recalc_pep_total(pep_id BIGINT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.presupuesto_ejecutivo_partida
  SET 
    importe_ejecutivo = (
      SELECT COALESCE(SUM(importe), 0)
      FROM public.presupuesto_ejecutivo_subpartida
      WHERE partida_ejecutivo_id = pep_id
    ),
    updated_at = now()
  WHERE id = pep_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;