-- Fix the auto_transition_to_design trigger to avoid concurrent update conflicts
-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS auto_transition_to_design_trigger ON public.client_projects;
DROP FUNCTION IF EXISTS public.auto_transition_to_design();

-- Create the new trigger function that modifies NEW instead of doing separate UPDATEs
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
    
    -- Update status to design if not already, by modifying NEW directly
    IF NEW.status NOT IN ('design', 'construction', 'design_completed', 'design_only_completed') THEN
      -- If has existing design, skip to construction
      IF NEW.has_existing_design = true THEN
        NEW.status = 'construction';
        NEW.moved_to_construction_at = now();
      ELSE
        -- Move to design phase
        NEW.status = 'design';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create the trigger as BEFORE UPDATE to modify NEW before the row is actually updated
CREATE TRIGGER auto_transition_to_design_trigger
  BEFORE UPDATE ON public.client_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_transition_to_design();