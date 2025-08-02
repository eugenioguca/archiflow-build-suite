-- Fix the trigger for sales pipeline stage transitions
-- First create a simpler version without complex foreign key issues

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

-- Force update existing projects that meet criteria but haven't transitioned
UPDATE public.client_projects 
SET status = 'design'
WHERE sales_pipeline_stage = 'cliente_cerrado'
  AND constancia_situacion_fiscal_uploaded = true 
  AND contract_uploaded = true
  AND status NOT IN ('design', 'construction', 'design_completed', 'design_only_completed')
  AND has_existing_design = false;

-- Force transition to construction for projects with existing design
UPDATE public.client_projects 
SET status = 'construction',
    moved_to_construction_at = now()
WHERE sales_pipeline_stage = 'cliente_cerrado'
  AND constancia_situacion_fiscal_uploaded = true 
  AND contract_uploaded = true
  AND status NOT IN ('construction', 'design_completed', 'design_only_completed')
  AND has_existing_design = true;