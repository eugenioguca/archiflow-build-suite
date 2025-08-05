-- Eliminar el trigger problemático que causa errores al cambiar status de fases de diseño
DROP TRIGGER IF EXISTS trigger_design_phases_create_expense ON public.design_phases;

-- Eliminar la función que crea gastos automáticos (las fases solo deben trackear tiempo)
DROP FUNCTION IF EXISTS public.create_design_expense();