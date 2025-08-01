-- Arreglar funciones sin search_path para seguridad

-- Función para actualizar client_id en design_appointments (con search_path)
CREATE OR REPLACE FUNCTION public.sync_design_appointment_client_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.project_id IS NOT NULL AND NEW.client_id IS NULL THEN
    SELECT p.client_id INTO NEW.client_id
    FROM public.projects p
    WHERE p.id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Función para crear notificación cuando se programa cita de diseño (con search_path)
CREATE OR REPLACE FUNCTION public.notify_sales_advisor_appointment()
RETURNS TRIGGER AS $$
DECLARE
  advisor_user_id UUID;
  client_name TEXT;
BEGIN
  -- Obtener el asesor de ventas del cliente
  SELECT c.assigned_advisor_id, c.full_name INTO advisor_user_id, client_name
  FROM public.clients c
  WHERE c.id = NEW.client_id;
  
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
      'Se ha programado una cita de diseño para el cliente ' || client_name || ' el ' || NEW.appointment_date::DATE
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;