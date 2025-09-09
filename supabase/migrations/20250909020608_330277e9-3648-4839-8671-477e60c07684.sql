-- Crear tabla padre para presupuesto ejecutivo por partida
CREATE TABLE IF NOT EXISTS public.presupuesto_ejecutivo_partida (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id uuid NOT NULL,
  proyecto_id uuid NOT NULL, 
  parametrico_partida_id uuid NOT NULL REFERENCES public.presupuesto_parametrico(id) ON DELETE CASCADE,
  importe_ejecutivo numeric NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unique_ejecutivo_partida UNIQUE (cliente_id, proyecto_id, parametrico_partida_id)
);

-- Habilitar RLS
ALTER TABLE public.presupuesto_ejecutivo_partida ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para presupuesto_ejecutivo_partida
CREATE POLICY "Employees and admins can manage executive partidas" 
ON public.presupuesto_ejecutivo_partida 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin'::user_role, 'employee'::user_role)
));

-- Modificar tabla actual para ser tabla hija con FK a la padre
ALTER TABLE public.presupuesto_ejecutivo 
ADD COLUMN IF NOT EXISTS partida_ejecutivo_id uuid REFERENCES public.presupuesto_ejecutivo_partida(id) ON DELETE CASCADE;

-- Renombrar campo para mayor claridad
ALTER TABLE public.presupuesto_ejecutivo 
RENAME COLUMN cantidad_requerida TO cantidad;

ALTER TABLE public.presupuesto_ejecutivo 
RENAME COLUMN precio_unitario TO precio_unitario;

ALTER TABLE public.presupuesto_ejecutivo 
RENAME COLUMN monto_total TO importe;

-- Añadir snapshot del nombre de subpartida
ALTER TABLE public.presupuesto_ejecutivo 
ADD COLUMN IF NOT EXISTS nombre_subpartida_snapshot text;

-- Crear índices para performance
CREATE INDEX IF NOT EXISTS idx_presupuesto_ejecutivo_partida_cliente_proyecto 
ON public.presupuesto_ejecutivo_partida(cliente_id, proyecto_id);

CREATE INDEX IF NOT EXISTS idx_presupuesto_ejecutivo_partida_ejecutivo 
ON public.presupuesto_ejecutivo(partida_ejecutivo_id);

-- Trigger para recalcular totales automáticamente
CREATE OR REPLACE FUNCTION public.recalculate_executive_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalcular importe_ejecutivo de la partida padre
  UPDATE public.presupuesto_ejecutivo_partida 
  SET importe_ejecutivo = COALESCE((
    SELECT SUM(importe) 
    FROM public.presupuesto_ejecutivo 
    WHERE partida_ejecutivo_id = COALESCE(NEW.partida_ejecutivo_id, OLD.partida_ejecutivo_id)
  ), 0),
  updated_at = now()
  WHERE id = COALESCE(NEW.partida_ejecutivo_id, OLD.partida_ejecutivo_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Aplicar trigger a la tabla de subpartidas
DROP TRIGGER IF EXISTS recalculate_executive_totals_trigger ON public.presupuesto_ejecutivo;
CREATE TRIGGER recalculate_executive_totals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.presupuesto_ejecutivo
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_executive_totals();