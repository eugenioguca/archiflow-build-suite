-- Fase 1: Reestructuración de Base de Datos (sin políticas duplicadas)

-- Actualizar el enum client_status con las 4 fases de ventas
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'nuevo_lead' AND enumtypid = 'client_status'::regtype) THEN
    ALTER TYPE client_status ADD VALUE 'nuevo_lead';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'en_contacto' AND enumtypid = 'client_status'::regtype) THEN
    ALTER TYPE client_status ADD VALUE 'en_contacto';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'lead_perdido' AND enumtypid = 'client_status'::regtype) THEN
    ALTER TYPE client_status ADD VALUE 'lead_perdido';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cliente_cerrado' AND enumtypid = 'client_status'::regtype) THEN
    ALTER TYPE client_status ADD VALUE 'cliente_cerrado';
  END IF;
END $$;

-- Agregar campos necesarios a la tabla clients
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'curp') THEN
    ALTER TABLE public.clients ADD COLUMN curp TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'payment_plan') THEN
    ALTER TABLE public.clients ADD COLUMN payment_plan JSONB DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'service_type') THEN
    ALTER TABLE public.clients ADD COLUMN service_type TEXT DEFAULT 'diseño';
  END IF;
END $$;

-- Modificar design_appointments para agregar client_id y visible_to_sales
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'design_appointments' AND column_name = 'client_id') THEN
    ALTER TABLE public.design_appointments ADD COLUMN client_id UUID REFERENCES public.clients(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'design_appointments' AND column_name = 'visible_to_sales') THEN
    ALTER TABLE public.design_appointments ADD COLUMN visible_to_sales BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Crear tabla para notificaciones entre módulos
CREATE TABLE IF NOT EXISTS public.module_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id),
  source_module TEXT NOT NULL,
  target_module TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS en module_notifications si no está habilitado
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'module_notifications' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.module_notifications ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Crear políticas para module_notifications si no existen
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'module_notifications' 
    AND policyname = 'Users can view their own notifications'
  ) THEN
    CREATE POLICY "Users can view their own notifications"
    ON public.module_notifications
    FOR SELECT
    USING (user_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'module_notifications' 
    AND policyname = 'Employees and admins can create notifications'
  ) THEN
    CREATE POLICY "Employees and admins can create notifications"
    ON public.module_notifications
    FOR INSERT
    WITH CHECK (EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee')
    ));
  END IF;
END $$;

-- Función para actualizar client_id en design_appointments basado en project_id
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
$$ LANGUAGE plpgsql;

-- Trigger para sincronizar client_id automáticamente
DROP TRIGGER IF EXISTS sync_design_appointment_client_trigger ON public.design_appointments;
CREATE TRIGGER sync_design_appointment_client_trigger
  BEFORE INSERT OR UPDATE ON public.design_appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_design_appointment_client_id();

-- Función para crear notificación cuando se programa cita de diseño
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
$$ LANGUAGE plpgsql;

-- Trigger para notificar al asesor de ventas sobre citas de diseño
DROP TRIGGER IF EXISTS notify_sales_appointment_trigger ON public.design_appointments;
CREATE TRIGGER notify_sales_appointment_trigger
  AFTER INSERT ON public.design_appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_sales_advisor_appointment();