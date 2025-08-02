-- Eliminar todas las tablas construction y funciones relacionadas

-- Eliminar funciones que usan tablas construction
DROP FUNCTION IF EXISTS public.insert_default_construction_budget_items(uuid);
DROP FUNCTION IF EXISTS public.create_construction_project_from_client(uuid);
DROP FUNCTION IF EXISTS public.revert_project_from_construction(uuid, text);
DROP FUNCTION IF EXISTS public.auto_create_construction_project();
DROP FUNCTION IF EXISTS public.check_budget_alerts(uuid);
DROP FUNCTION IF EXISTS public.update_budget_item_total();

-- Eliminar todas las tablas construction
DROP TABLE IF EXISTS public.construction_budget_changes CASCADE;
DROP TABLE IF EXISTS public.construction_budget_alerts CASCADE;
DROP TABLE IF EXISTS public.construction_budget_items CASCADE;
DROP TABLE IF EXISTS public.construction_deliveries CASCADE;
DROP TABLE IF EXISTS public.construction_expenses CASCADE;
DROP TABLE IF EXISTS public.construction_materials CASCADE;
DROP TABLE IF EXISTS public.construction_teams CASCADE;
DROP TABLE IF EXISTS public.construction_timelines CASCADE;
DROP TABLE IF EXISTS public.construction_phases CASCADE;
DROP TABLE IF EXISTS public.construction_projects CASCADE;

-- Actualizar función para auto-transición a diseño (sin crear construction_project)
CREATE OR REPLACE FUNCTION public.auto_transition_to_design()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if project sales_pipeline_stage changed to 'cliente_cerrado' and has required documents
  IF NEW.sales_pipeline_stage = 'cliente_cerrado' 
     AND (OLD.sales_pipeline_stage != 'cliente_cerrado' OR OLD.sales_pipeline_stage IS NULL)
     AND NEW.constancia_situacion_fiscal_uploaded = true 
     AND NEW.contract_uploaded = true THEN
    
    -- Update status to design if not already
    IF NEW.status NOT IN ('design', 'construction', 'design_completed', 'design_only_completed') THEN
      -- If has existing design, skip to construction
      IF NEW.has_existing_design = true THEN
        UPDATE public.client_projects 
        SET status = 'construction',
            moved_to_construction_at = now()
        WHERE id = NEW.id;
      ELSE
        -- Move to design phase
        UPDATE public.client_projects 
        SET status = 'design'
        WHERE id = NEW.id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;