-- Actualizar el trigger para usar estados en español
CREATE OR REPLACE FUNCTION public.auto_create_material_finance_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  project_client_id UUID;
  requester_profile_id UUID;
BEGIN
  -- Only create request when status changes to 'requerido' (instead of 'required')
  IF NEW.status = 'requerido' AND (OLD.status IS NULL OR OLD.status != 'requerido') THEN
    -- Get client_id from project
    SELECT client_id INTO project_client_id
    FROM public.client_projects
    WHERE id = NEW.project_id;
    
    -- Get current user's profile
    SELECT id INTO requester_profile_id
    FROM public.profiles
    WHERE user_id = auth.uid()
    LIMIT 1;
    
    -- Insert finance request if not exists
    INSERT INTO public.material_finance_requests (
      material_requirement_id,
      project_id,
      client_id,
      requested_by,
      supplier_id
    ) VALUES (
      NEW.id,
      NEW.project_id,
      project_client_id,
      COALESCE(requester_profile_id, NEW.created_by),
      NEW.supplier_id
    )
    ON CONFLICT (material_requirement_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;