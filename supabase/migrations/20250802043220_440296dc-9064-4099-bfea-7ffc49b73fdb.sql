-- Fix create_default_design_phases function to handle auth.uid() issues
CREATE OR REPLACE FUNCTION public.create_default_design_phases(project_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  admin_profile_id uuid;
BEGIN
  -- Get first admin profile as creator
  SELECT id INTO admin_profile_id 
  FROM public.profiles 
  WHERE role = 'admin' 
  LIMIT 1;
  
  -- If no admin found, use null
  IF admin_profile_id IS NULL THEN
    admin_profile_id := NULL;
  END IF;

  INSERT INTO public.design_phases (
    project_id, 
    phase_name, 
    phase_order, 
    status, 
    created_by
  ) VALUES
  (project_id_param, 'Zonificación', 1, 'pending', admin_profile_id),
  (project_id_param, 'Volumetría', 2, 'pending', admin_profile_id),
  (project_id_param, 'Acabados', 3, 'pending', admin_profile_id),
  (project_id_param, 'Renders', 4, 'pending', admin_profile_id),
  (project_id_param, 'Diseño Completado', 5, 'pending', admin_profile_id);
END;
$function$;

-- Update auto_transition_to_design to call create_default_design_phases
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
        
        -- Create default design phases if they don't exist
        IF NOT EXISTS (SELECT 1 FROM public.design_phases WHERE project_id = NEW.id) THEN
          PERFORM public.create_default_design_phases(NEW.id);
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create the trigger on client_projects table
DROP TRIGGER IF EXISTS trigger_auto_transition_to_design ON public.client_projects;
CREATE TRIGGER trigger_auto_transition_to_design
    AFTER UPDATE ON public.client_projects
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_transition_to_design();

-- Manually create design phases for the existing project in design status
DO $$
DECLARE
    project_record RECORD;
BEGIN
    -- Find client_projects with status = 'design' but no design_phases
    FOR project_record IN 
        SELECT cp.id 
        FROM public.client_projects cp
        WHERE cp.status = 'design' 
        AND NOT EXISTS (SELECT 1 FROM public.design_phases dp WHERE dp.project_id = cp.id)
    LOOP
        -- Create default phases for each project
        PERFORM public.create_default_design_phases(project_record.id);
    END LOOP;
END $$;