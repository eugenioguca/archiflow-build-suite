-- Create synchronization link table for Parametric Budget → Gantt Chart
CREATE TABLE IF NOT EXISTS public.cronograma_vinculos_parametrico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL,
  proyecto_id UUID NOT NULL,
  mayor_id UUID NOT NULL REFERENCES public.chart_of_accounts_mayor(id),
  cronograma_line_id UUID NOT NULL REFERENCES public.cronograma_gantt_line(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'parametrico' CHECK (source IN ('parametrico')),
  override_importe BOOLEAN DEFAULT FALSE,
  last_synced_total NUMERIC DEFAULT 0,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicates
  UNIQUE(cliente_id, proyecto_id, mayor_id, source)
);

-- Add sync status and import flag to existing Gantt lines
ALTER TABLE public.cronograma_gantt_line 
ADD COLUMN IF NOT EXISTS estado_sync TEXT CHECK (estado_sync IN ('pendiente_fechas', 'completo', 'fuera_de_sync')) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS es_importado BOOLEAN DEFAULT FALSE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_cronograma_vinculos_cliente_proyecto 
ON public.cronograma_vinculos_parametrico(cliente_id, proyecto_id);

CREATE INDEX IF NOT EXISTS idx_cronograma_vinculos_mayor 
ON public.cronograma_vinculos_parametrico(mayor_id);

-- Create function to get parametric budget totals by mayor
CREATE OR REPLACE FUNCTION public.get_parametric_budget_totals(
  cliente_id_param UUID,
  proyecto_id_param UUID
)
RETURNS TABLE (
  cliente_id UUID,
  proyecto_id UUID,
  mayor_id UUID,
  mayor_codigo TEXT,
  mayor_nombre TEXT,
  total_mayor NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.cliente_id,
    p.proyecto_id,
    p.mayor_id,
    m.codigo as mayor_codigo,
    m.nombre as mayor_nombre,
    SUM(p.cantidad_requerida * p.precio_unitario) as total_mayor
  FROM public.presupuesto_parametrico p
  JOIN public.chart_of_accounts_mayor m ON p.mayor_id = m.id
  WHERE p.cliente_id = cliente_id_param 
    AND p.proyecto_id = proyecto_id_param
  GROUP BY p.cliente_id, p.proyecto_id, p.mayor_id, m.codigo, m.nombre;
END;
$$;

-- Add RLS policies for the new table
ALTER TABLE public.cronograma_vinculos_parametrico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees and admins can manage cronograma vinculos parametrico"
ON public.cronograma_vinculos_parametrico
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.role IN ('admin', 'employee')
  )
);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_cronograma_vinculos_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_cronograma_vinculos_updated_at
  BEFORE UPDATE ON public.cronograma_vinculos_parametrico
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cronograma_vinculos_updated_at();