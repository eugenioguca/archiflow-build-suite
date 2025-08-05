-- Corregir el trigger auto_create_project_for_client para remover created_by
CREATE OR REPLACE FUNCTION public.auto_create_project_for_client()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Solo crear proyecto si el cliente pasa de 'nuevo_lead' a 'en_contacto' y no tiene proyecto
  IF OLD.sales_pipeline_stage = 'nuevo_lead' 
     AND NEW.sales_pipeline_stage = 'en_contacto' 
     AND NOT EXISTS (SELECT 1 FROM public.projects WHERE client_id = NEW.client_id) THEN
    
    INSERT INTO public.projects (
      client_id,
      name,
      description,
      status
    ) VALUES (
      NEW.client_id,
      'Proyecto para ' || (SELECT full_name FROM public.clients WHERE id = NEW.client_id),
      'Proyecto creado automáticamente al convertir lead',
      'planning'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;