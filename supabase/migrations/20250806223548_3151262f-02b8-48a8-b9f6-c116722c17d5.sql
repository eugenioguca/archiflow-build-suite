-- Corregir el trigger de notificación del asesor
CREATE OR REPLACE FUNCTION public.notify_sales_advisor_appointment()
RETURNS TRIGGER AS $$
DECLARE
  advisor_user_id UUID;
  client_name TEXT;
  project_name TEXT;
BEGIN
  -- Obtener información del asesor y cliente desde client_projects
  SELECT cp.assigned_advisor_id, c.full_name, cp.project_name
  INTO advisor_user_id, client_name, project_name
  FROM public.client_projects cp
  JOIN public.clients c ON c.id = cp.client_id
  WHERE cp.id = NEW.project_id; -- NEW.project_id ahora apunta a client_projects.id
  
  -- Si hay asesor asignado, crear notificación
  IF advisor_user_id IS NOT NULL THEN
    -- Obtener user_id del asesor
    SELECT p.user_id INTO advisor_user_id
    FROM public.profiles p
    WHERE p.id = advisor_user_id;
    
    -- Crear notificación si se encontró el user_id
    IF advisor_user_id IS NOT NULL THEN
      INSERT INTO public.module_notifications (
        user_id,
        client_id,
        source_module,
        target_module,
        notification_type,
        title,
        message
      ) VALUES (
        advisor_user_id,
        NEW.client_id,
        'design',
        'sales',
        'new_appointment',
        'Nueva cita programada',
        'Se ha programado una nueva cita para el cliente ' || COALESCE(client_name, 'Sin nombre') || ' en el proyecto ' || COALESCE(project_name, 'Sin nombre')
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';