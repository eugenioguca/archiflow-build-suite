-- Función mejorada para sincronizar construction_budget con la suma de construction_budget_items
CREATE OR REPLACE FUNCTION public.sync_construction_budget_improved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Actualizar el construction_budget del proyecto con la suma actual de items
  UPDATE public.client_projects 
  SET 
    construction_budget = (
      SELECT COALESCE(SUM(total_price), 0)
      FROM public.construction_budget_items 
      WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Eliminar trigger anterior si existe
DROP TRIGGER IF EXISTS sync_construction_budget_trigger ON public.construction_budget_items;

-- Crear nuevo trigger mejorado
CREATE TRIGGER sync_construction_budget_improved_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.construction_budget_items
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_construction_budget_improved();

-- Función para corregir inmediatamente todos los proyectos con discrepancias
CREATE OR REPLACE FUNCTION public.fix_budget_discrepancies()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Actualizar todos los proyectos para que construction_budget coincida con la suma de sus items
  UPDATE public.client_projects 
  SET 
    construction_budget = calculated_budget.total_budget,
    updated_at = now()
  FROM (
    SELECT 
      cp.id as project_id,
      COALESCE(SUM(cbi.total_price), 0) as total_budget
    FROM public.client_projects cp
    LEFT JOIN public.construction_budget_items cbi ON cp.id = cbi.project_id
    WHERE cp.status = 'construction'
    GROUP BY cp.id
  ) as calculated_budget
  WHERE client_projects.id = calculated_budget.project_id
  AND client_projects.construction_budget != calculated_budget.total_budget;
  
  RAISE NOTICE 'Budget discrepancies fixed for construction projects';
END;
$function$;

-- Ejecutar la corrección inmediata
SELECT public.fix_budget_discrepancies();