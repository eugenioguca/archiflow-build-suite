-- Fix problem 1: Update RPC function to include orden and respect parametric order
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
  total_mayor NUMERIC,
  orden_minimo INTEGER
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
    SUM(p.cantidad_requerida * p.precio_unitario) as total_mayor,
    MIN(p.orden) as orden_minimo
  FROM public.presupuesto_parametrico p
  JOIN public.chart_of_accounts_mayor m ON p.mayor_id = m.id
  WHERE p.cliente_id = cliente_id_param 
    AND p.proyecto_id = proyecto_id_param
  GROUP BY p.cliente_id, p.proyecto_id, p.mayor_id, m.codigo, m.nombre
  ORDER BY MIN(p.orden) ASC;
END;
$$;