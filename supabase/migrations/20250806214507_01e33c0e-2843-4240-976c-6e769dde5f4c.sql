-- Fix the trigger that's causing the assigned_advisor_id error
-- The issue is in the notify_sales_advisor_appointment trigger
-- It's trying to access c.assigned_advisor_id but the clients table doesn't have this column
-- The correct column is in client_projects table

DROP TRIGGER IF EXISTS notify_sales_advisor_appointment_trigger ON design_appointments;

CREATE OR REPLACE FUNCTION public.notify_sales_advisor_appointment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  advisor_user_id UUID;
  client_name TEXT;
BEGIN
  -- Obtener el asesor de ventas del proyecto del cliente (no del cliente directamente)
  SELECT cp.assigned_advisor_id, c.full_name INTO advisor_user_id, client_name
  FROM public.client_projects cp
  JOIN public.clients c ON c.id = cp.client_id
  WHERE cp.id = (
    SELECT client_project_id FROM public.projects WHERE id = NEW.project_id LIMIT 1
  );
  
  -- Si no encontramos en projects, buscar directamente por client_id
  IF advisor_user_id IS NULL THEN
    SELECT cp.assigned_advisor_id, c.full_name INTO advisor_user_id, client_name
    FROM public.client_projects cp
    JOIN public.clients c ON c.id = cp.client_id
    WHERE cp.client_id = NEW.client_id
    LIMIT 1;
  END IF;
  
  -- Si hay asesor asignado, crear notificación
  IF advisor_user_id IS NOT NULL AND NEW.visible_to_sales = true THEN
    -- Obtener el user_id del asesor
    SELECT p.user_id INTO advisor_user_id
    FROM public.profiles p
    WHERE p.id = advisor_user_id;
    
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
      'appointment_scheduled',
      'Nueva cita de diseño programada',
      'Se ha programado una cita de diseño para el cliente ' || COALESCE(client_name, 'N/A') || ' el ' || NEW.appointment_date::DATE
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER notify_sales_advisor_appointment_trigger
  AFTER INSERT ON design_appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_sales_advisor_appointment();