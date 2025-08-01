-- Fase 1: Reestructuración de Base de Datos

-- Actualizar el enum client_status con las 4 fases de ventas
ALTER TYPE client_status ADD VALUE IF NOT EXISTS 'nuevo_lead';
ALTER TYPE client_status ADD VALUE IF NOT EXISTS 'en_contacto'; 
ALTER TYPE client_status ADD VALUE IF NOT EXISTS 'lead_perdido';
ALTER TYPE client_status ADD VALUE IF NOT EXISTS 'cliente_cerrado';

-- Agregar campos necesarios a la tabla clients
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS curp TEXT,
ADD COLUMN IF NOT EXISTS payment_plan JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'diseño';

-- Modificar design_appointments para agregar client_id y visible_to_sales
ALTER TABLE public.design_appointments 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id),
ADD COLUMN IF NOT EXISTS visible_to_sales BOOLEAN DEFAULT true;

-- Crear tabla para plantillas de contratos reutilizables
CREATE TABLE IF NOT EXISTS public.contract_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  template_type TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS en contract_templates
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

-- Política para que empleados y admins puedan gestionar plantillas de contratos
CREATE POLICY "Employees and admins can manage contract templates" 
ON public.contract_templates 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee')
));

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

-- Habilitar RLS en module_notifications
ALTER TABLE public.module_notifications ENABLE ROW LEVEL SECURITY;

-- Política para que usuarios vean sus propias notificaciones
CREATE POLICY "Users can view their own notifications"
ON public.module_notifications
FOR SELECT
USING (user_id = auth.uid());

-- Política para que empleados y admins puedan crear notificaciones
CREATE POLICY "Employees and admins can create notifications"
ON public.module_notifications
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee')
));

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

-- Agregar trigger de actualización para contract_templates
CREATE TRIGGER update_contract_templates_updated_at
  BEFORE UPDATE ON public.contract_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();