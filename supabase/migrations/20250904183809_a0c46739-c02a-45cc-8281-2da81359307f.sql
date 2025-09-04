-- Create cronograma_matriz_manual table for storing manual overrides in the monthly matrix
CREATE TABLE IF NOT EXISTS public.cronograma_matriz_manual (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  proyecto_id UUID NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  mes TEXT NOT NULL, -- YYYY-MM format
  concepto TEXT NOT NULL CHECK (concepto IN ('gasto_obra', 'avance_parcial', 'avance_acumulado', 'ministraciones', 'inversion_acumulada', 'fecha_pago')),
  valor TEXT NOT NULL, -- Can store numeric or text values
  sobrescribe BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for performance (with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_cronograma_matriz_manual_cliente_proyecto ON public.cronograma_matriz_manual(cliente_id, proyecto_id);
CREATE INDEX IF NOT EXISTS idx_cronograma_matriz_manual_mes ON public.cronograma_matriz_manual(mes);
CREATE INDEX IF NOT EXISTS idx_cronograma_matriz_manual_concepto ON public.cronograma_matriz_manual(concepto);

-- Create unique constraint to prevent duplicate entries (with IF NOT EXISTS)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cronograma_matriz_manual_unique ON public.cronograma_matriz_manual(cliente_id, proyecto_id, mes, concepto);

-- Enable RLS
ALTER TABLE public.cronograma_matriz_manual ENABLE ROW LEVEL SECURITY;

-- Drop and recreate RLS policy to avoid conflicts
DROP POLICY IF EXISTS "Employees and admins can manage cronograma matriz manual" ON public.cronograma_matriz_manual;
CREATE POLICY "Employees and admins can manage cronograma matriz manual" 
ON public.cronograma_matriz_manual 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'employee')
  )
);

-- Drop existing trigger if it exists, then create function and trigger
DROP TRIGGER IF EXISTS update_cronograma_matriz_manual_updated_at ON public.cronograma_matriz_manual;

CREATE OR REPLACE FUNCTION public.update_cronograma_matriz_manual_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = 'public';

CREATE TRIGGER update_cronograma_matriz_manual_updated_at
  BEFORE UPDATE ON public.cronograma_matriz_manual
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cronograma_matriz_manual_updated_at();