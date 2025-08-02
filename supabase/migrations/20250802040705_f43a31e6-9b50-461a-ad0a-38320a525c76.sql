-- Add field for existing design checkbox to client_projects
ALTER TABLE public.client_projects 
ADD COLUMN has_existing_design boolean DEFAULT false;

-- Add field to track when project moves to construction
ALTER TABLE public.client_projects 
ADD COLUMN moved_to_construction_at timestamp with time zone;

-- Update the function to create default design phases with correct names
CREATE OR REPLACE FUNCTION public.create_default_design_phases(project_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.design_phases (
    project_id, 
    phase_name, 
    phase_order, 
    status, 
    created_by
  ) VALUES
  (project_id_param, 'Zonificación', 1, 'pending', (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)),
  (project_id_param, 'Volumetría', 2, 'pending', (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)),
  (project_id_param, 'Acabados', 3, 'pending', (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)),
  (project_id_param, 'Renders', 4, 'pending', (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)),
  (project_id_param, 'Diseño Completado', 5, 'pending', (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1));
END;
$function$;

-- Create function to auto-transition from sales to design
CREATE OR REPLACE FUNCTION public.auto_transition_to_design()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if project status changed to 'cerrado' and doesn't have design phases yet
  IF OLD.status != 'cerrado' AND NEW.status = 'cerrado' 
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

-- Create trigger for auto-transition
CREATE TRIGGER trigger_auto_transition_to_design
  BEFORE UPDATE ON public.client_projects
  FOR EACH ROW
  EXECUTE FUNCTION auto_transition_to_design();

-- Function to update days elapsed in design phases
CREATE OR REPLACE FUNCTION public.update_design_phase_days_elapsed()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.design_phases 
  SET days_elapsed = CASE 
    WHEN status = 'completed' AND actual_completion_date IS NOT NULL THEN
      EXTRACT(DAY FROM (actual_completion_date - created_at))::integer
    WHEN status != 'completed' THEN
      EXTRACT(DAY FROM (now() - created_at))::integer
    ELSE days_elapsed
  END
  WHERE status IN ('in_progress', 'completed');
END;
$function$;