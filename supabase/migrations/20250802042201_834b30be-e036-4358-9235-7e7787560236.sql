-- Update the auto_transition_to_design trigger to activate on sales_pipeline_stage changes
DROP TRIGGER IF EXISTS auto_transition_to_design_trigger ON client_projects;
DROP FUNCTION IF EXISTS auto_transition_to_design();

CREATE OR REPLACE FUNCTION public.auto_transition_to_design()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if project status changed to 'cliente_cerrado' and has required documents
  IF NEW.sales_pipeline_stage = 'cliente_cerrado' 
     AND OLD.sales_pipeline_stage != 'cliente_cerrado'
     AND NEW.constancia_situacion_fiscal_uploaded = true 
     AND NEW.contract_uploaded = true
     AND NOT EXISTS (SELECT 1 FROM public.design_phases WHERE project_id = NEW.id) THEN
    
    -- Create default design phases
    PERFORM create_default_design_phases(NEW.id);
    
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
  
  RETURN NEW;
END;
$function$;

-- Create trigger for auto transition
CREATE TRIGGER auto_transition_to_design_trigger
  AFTER UPDATE ON public.client_projects
  FOR EACH ROW
  EXECUTE FUNCTION auto_transition_to_design();

-- Update existing projects that meet criteria but haven't transitioned
UPDATE public.client_projects 
SET status = 'design'
WHERE sales_pipeline_stage = 'cliente_cerrado'
  AND constancia_situacion_fiscal_uploaded = true 
  AND contract_uploaded = true
  AND status != 'design'
  AND status != 'construction'
  AND NOT EXISTS (SELECT 1 FROM public.design_phases WHERE project_id = client_projects.id);

-- Create design phases for projects that should have transitioned
INSERT INTO public.design_phases (project_id, phase_name, phase_order, status, created_by)
SELECT 
  cp.id,
  phase_name,
  phase_order,
  'pending',
  (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
FROM public.client_projects cp
CROSS JOIN (
  VALUES 
    ('Zonificación', 1),
    ('Volumetría', 2), 
    ('Acabados', 3),
    ('Renders', 4),
    ('Diseño Completado', 5)
) AS phases(phase_name, phase_order)
WHERE cp.sales_pipeline_stage = 'cliente_cerrado'
  AND cp.constancia_situacion_fiscal_uploaded = true 
  AND cp.contract_uploaded = true
  AND cp.status = 'design'
  AND NOT EXISTS (SELECT 1 FROM public.design_phases WHERE project_id = cp.id);