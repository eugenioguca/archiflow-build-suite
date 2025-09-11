-- Agregar campo orden a la tabla presupuesto_parametrico
ALTER TABLE public.presupuesto_parametrico 
ADD COLUMN IF NOT EXISTS orden INTEGER DEFAULT 0;

-- Inicializar el campo orden para registros existentes usando una subconsulta
WITH ordered_rows AS (
  SELECT id, 
         row_number() OVER (PARTITION BY cliente_id, proyecto_id ORDER BY created_at) as new_orden
  FROM public.presupuesto_parametrico 
  WHERE orden = 0
)
UPDATE public.presupuesto_parametrico 
SET orden = ordered_rows.new_orden
FROM ordered_rows 
WHERE public.presupuesto_parametrico.id = ordered_rows.id;

-- Crear índice para mejorar rendimiento en consultas ordenadas
CREATE INDEX IF NOT EXISTS idx_presupuesto_parametrico_orden 
ON public.presupuesto_parametrico(cliente_id, proyecto_id, orden);

-- Función para obtener siguiente orden al crear nueva partida
CREATE OR REPLACE FUNCTION public.get_next_parametrico_order(cliente_id_param UUID, proyecto_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT MAX(orden) + 1 
     FROM public.presupuesto_parametrico 
     WHERE cliente_id = cliente_id_param AND proyecto_id = proyecto_id_param),
    1
  );
END;
$$;