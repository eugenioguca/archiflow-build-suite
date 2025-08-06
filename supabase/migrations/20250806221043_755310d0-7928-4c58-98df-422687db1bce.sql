-- ===============================
-- FASE 1: CORRECCIONES DE ARQUITECTURA DE DATOS
-- ===============================

-- 1. Crear función para sincronizar client_id automáticamente
CREATE OR REPLACE FUNCTION public.sync_design_appointment_client_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Sincronizar client_id desde client_projects cuando project_id es proporcionado
  IF NEW.project_id IS NOT NULL AND NEW.client_id IS NULL THEN
    SELECT cp.client_id INTO NEW.client_id
    FROM public.client_projects cp
    WHERE cp.id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Crear trigger para sincronización automática
DROP TRIGGER IF EXISTS sync_appointment_client_id ON public.design_appointments;
CREATE TRIGGER sync_appointment_client_id
  BEFORE INSERT OR UPDATE ON public.design_appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_design_appointment_client_id();

-- 3. Función para normalizar attendees de string a objetos
CREATE OR REPLACE FUNCTION public.normalize_appointment_attendees()
RETURNS TRIGGER AS $$
DECLARE
  normalized_attendees JSONB := '[]'::jsonb;
  attendee_item JSONB;
  profile_name TEXT;
  profile_email TEXT;
BEGIN
  -- Si attendees es un array de strings, convertir a objetos
  IF NEW.attendees IS NOT NULL THEN
    FOR attendee_item IN SELECT * FROM jsonb_array_elements(NEW.attendees)
    LOOP
      -- Si es un string (profile_id), convertir a objeto
      IF jsonb_typeof(attendee_item) = 'string' THEN
        -- Obtener información del perfil
        SELECT p.full_name, 
               COALESCE(c.email, p.email) as email
        INTO profile_name, profile_email
        FROM public.profiles p
        LEFT JOIN public.clients c ON c.profile_id = p.id
        WHERE p.id = (attendee_item #>> '{}')::uuid;
        
        -- Crear objeto attendee normalizado
        normalized_attendees := normalized_attendees || jsonb_build_object(
          'profile_id', attendee_item #>> '{}',
          'name', COALESCE(profile_name, 'Usuario'),
          'email', COALESCE(profile_email, ''),
          'status', 'invited'
        );
      -- Si ya es un objeto, mantenerlo
      ELSIF jsonb_typeof(attendee_item) = 'object' THEN
        normalized_attendees := normalized_attendees || attendee_item;
      END IF;
    END LOOP;
    
    NEW.attendees := normalized_attendees;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Crear trigger para normalización de attendees
DROP TRIGGER IF EXISTS normalize_attendees ON public.design_appointments;
CREATE TRIGGER normalize_attendees
  BEFORE INSERT OR UPDATE ON public.design_appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_appointment_attendees();

-- ===============================
-- FASE 2: SISTEMA DE NOTIFICACIONES
-- ===============================

-- 5. Función para notificar al asesor sobre nuevas citas
CREATE OR REPLACE FUNCTION public.notify_sales_advisor_appointment()
RETURNS TRIGGER AS $$
DECLARE
  advisor_user_id UUID;
  client_name TEXT;
  project_name TEXT;
BEGIN
  -- Obtener información del asesor y cliente
  SELECT cp.assigned_advisor_id, c.full_name, cp.project_name
  INTO advisor_user_id, client_name, project_name
  FROM public.client_projects cp
  JOIN public.clients c ON c.id = cp.client_id
  WHERE cp.id = NEW.project_id;
  
  -- Si hay asesor asignado, crear notificación
  IF advisor_user_id IS NOT NULL THEN
    -- Obtener user_id del asesor
    SELECT p.user_id INTO advisor_user_id
    FROM public.profiles p
    WHERE p.id = advisor_user_id;
    
    -- Crear notificación
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
      'Se ha programado una nueva cita para el cliente ' || client_name || ' en el proyecto ' || project_name
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Crear trigger para notificaciones de citas
DROP TRIGGER IF EXISTS notify_sales_advisor_appointment_trigger ON public.design_appointments;
CREATE TRIGGER notify_sales_advisor_appointment_trigger
  AFTER INSERT ON public.design_appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_sales_advisor_appointment();

-- 7. Función para notificar cambios de estado en invitaciones
CREATE OR REPLACE FUNCTION public.notify_appointment_status_change()
RETURNS TRIGGER AS $$
DECLARE
  creator_user_id UUID;
  client_name TEXT;
BEGIN
  -- Solo notificar si hay cambios en attendees
  IF OLD.attendees IS DISTINCT FROM NEW.attendees THEN
    -- Obtener creador de la cita
    SELECT p.user_id INTO creator_user_id
    FROM public.profiles p
    WHERE p.id = NEW.created_by;
    
    -- Obtener nombre del cliente
    SELECT c.full_name INTO client_name
    FROM public.clients c
    WHERE c.id = NEW.client_id;
    
    -- Crear notificación para el creador
    IF creator_user_id IS NOT NULL THEN
      INSERT INTO public.module_notifications (
        user_id,
        client_id,
        source_module,
        target_module,
        notification_type,
        title,
        message
      ) VALUES (
        creator_user_id,
        NEW.client_id,
        'client_portal',
        'design',
        'appointment_status_update',
        'Respuesta a invitación de cita',
        'Ha habido cambios en las respuestas de invitación para la cita "' || NEW.title || '" del cliente ' || client_name
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Crear trigger para notificaciones de cambio de estado
DROP TRIGGER IF EXISTS notify_appointment_status_change_trigger ON public.design_appointments;
CREATE TRIGGER notify_appointment_status_change_trigger
  AFTER UPDATE ON public.design_appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_appointment_status_change();

-- ===============================
-- FASE 3: CORRECCIONES DE DATOS EXISTENTES
-- ===============================

-- 9. Actualizar citas existentes para sincronizar client_id faltantes
UPDATE public.design_appointments da
SET client_id = cp.client_id
FROM public.client_projects cp
WHERE da.project_id = cp.id 
AND da.client_id IS NULL;

-- 10. Actualizar attendees existentes que sean strings a formato de objetos
UPDATE public.design_appointments
SET attendees = (
  SELECT jsonb_agg(
    CASE 
      WHEN jsonb_typeof(attendee) = 'string' THEN
        jsonb_build_object(
          'profile_id', attendee #>> '{}',
          'name', COALESCE(p.full_name, 'Usuario'),
          'email', COALESCE(c.email, p.email, ''),
          'status', 'invited'
        )
      ELSE attendee
    END
  )
  FROM jsonb_array_elements(attendees) AS attendee
  LEFT JOIN public.profiles p ON p.id = (attendee #>> '{}')::uuid
  LEFT JOIN public.clients c ON c.profile_id = p.id
)
WHERE attendees IS NOT NULL 
AND EXISTS (
  SELECT 1 FROM jsonb_array_elements(attendees) AS elem 
  WHERE jsonb_typeof(elem) = 'string'
);