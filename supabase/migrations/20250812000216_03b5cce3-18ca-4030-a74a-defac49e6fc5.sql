-- FASE 1: Sistema de Chat - Base de Datos y RLS Policies

-- Crear tabla para mensajes de chat del proyecto
CREATE TABLE public.project_chat (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('employee', 'client')),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_read BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT fk_project_chat_project FOREIGN KEY (project_id) REFERENCES client_projects(id) ON DELETE CASCADE
);

-- Crear tabla para notificaciones de chat
CREATE TABLE public.chat_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  message_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('employee', 'client')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_chat_notifications_project FOREIGN KEY (project_id) REFERENCES client_projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_chat_notifications_message FOREIGN KEY (message_id) REFERENCES project_chat(id) ON DELETE CASCADE
);

-- Índices para optimizar rendimiento
CREATE INDEX idx_project_chat_project_id ON public.project_chat(project_id);
CREATE INDEX idx_project_chat_created_at ON public.project_chat(created_at DESC);
CREATE INDEX idx_chat_notifications_recipient ON public.chat_notifications(recipient_id, recipient_type);
CREATE INDEX idx_chat_notifications_project ON public.chat_notifications(project_id);

-- Habilitar RLS en ambas tablas
ALTER TABLE public.project_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_notifications ENABLE ROW LEVEL SECURITY;

-- Función de seguridad para verificar acceso del empleado al proyecto
CREATE OR REPLACE FUNCTION public.employee_has_project_access(project_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_profile_id UUID;
BEGIN
  -- Obtener profile_id del usuario autenticado
  SELECT id INTO user_profile_id 
  FROM public.profiles 
  WHERE user_id = auth.uid() AND role IN ('admin', 'employee');
  
  IF user_profile_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar si es admin (acceso completo)
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar si está asignado al proyecto
  RETURN EXISTS (
    SELECT 1 FROM public.client_projects cp
    WHERE cp.id = project_id_param
    AND (
      cp.assigned_advisor_id = user_profile_id OR
      cp.project_manager_id = user_profile_id OR
      cp.construction_supervisor_id = user_profile_id
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Función de seguridad para verificar acceso del cliente al proyecto
CREATE OR REPLACE FUNCTION public.client_has_project_access(project_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_client_id UUID;
BEGIN
  -- Obtener client_id del usuario autenticado
  SELECT c.id INTO user_client_id
  FROM public.clients c
  JOIN public.profiles p ON p.id = c.profile_id
  WHERE p.user_id = auth.uid() AND p.role = 'client';
  
  IF user_client_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar si el proyecto pertenece al cliente
  RETURN EXISTS (
    SELECT 1 FROM public.client_projects cp
    WHERE cp.id = project_id_param AND cp.client_id = user_client_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- RLS Policies para project_chat
-- Empleados pueden ver mensajes de proyectos asignados
CREATE POLICY "Employees can view project chat messages" 
ON public.project_chat FOR SELECT 
USING (public.employee_has_project_access(project_id));

-- Clientes pueden ver mensajes de sus proyectos
CREATE POLICY "Clients can view their project chat messages" 
ON public.project_chat FOR SELECT 
USING (public.client_has_project_access(project_id));

-- Empleados pueden crear mensajes en proyectos asignados
CREATE POLICY "Employees can create project chat messages" 
ON public.project_chat FOR INSERT 
WITH CHECK (
  public.employee_has_project_access(project_id) AND 
  sender_type = 'employee' AND
  sender_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Clientes pueden crear mensajes en sus proyectos
CREATE POLICY "Clients can create their project chat messages" 
ON public.project_chat FOR INSERT 
WITH CHECK (
  public.client_has_project_access(project_id) AND 
  sender_type = 'client' AND
  sender_id = (SELECT c.id FROM public.clients c JOIN public.profiles p ON p.id = c.profile_id WHERE p.user_id = auth.uid())
);

-- Empleados pueden actualizar estado de lectura en proyectos asignados
CREATE POLICY "Employees can update read status in project chat" 
ON public.project_chat FOR UPDATE 
USING (public.employee_has_project_access(project_id))
WITH CHECK (public.employee_has_project_access(project_id));

-- Clientes pueden actualizar estado de lectura en sus proyectos
CREATE POLICY "Clients can update read status in their project chat" 
ON public.project_chat FOR UPDATE 
USING (public.client_has_project_access(project_id))
WITH CHECK (public.client_has_project_access(project_id));

-- RLS Policies para chat_notifications
-- Empleados pueden ver notificaciones de chat
CREATE POLICY "Employees can view chat notifications" 
ON public.chat_notifications FOR SELECT 
USING (
  recipient_type = 'employee' AND 
  recipient_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Clientes pueden ver sus notificaciones de chat
CREATE POLICY "Clients can view their chat notifications" 
ON public.chat_notifications FOR SELECT 
USING (
  recipient_type = 'client' AND 
  recipient_id = (SELECT c.id FROM public.clients c JOIN public.profiles p ON p.id = c.profile_id WHERE p.user_id = auth.uid())
);

-- Empleados pueden actualizar estado de lectura de notificaciones
CREATE POLICY "Employees can update chat notification read status" 
ON public.chat_notifications FOR UPDATE 
USING (
  recipient_type = 'employee' AND 
  recipient_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
)
WITH CHECK (
  recipient_type = 'employee' AND 
  recipient_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Clientes pueden actualizar estado de lectura de sus notificaciones
CREATE POLICY "Clients can update their chat notification read status" 
ON public.chat_notifications FOR UPDATE 
USING (
  recipient_type = 'client' AND 
  recipient_id = (SELECT c.id FROM public.clients c JOIN public.profiles p ON p.id = c.profile_id WHERE p.user_id = auth.uid())
)
WITH CHECK (
  recipient_type = 'client' AND 
  recipient_id = (SELECT c.id FROM public.clients c JOIN public.profiles p ON p.id = c.profile_id WHERE p.user_id = auth.uid())
);

-- Sistema puede crear notificaciones (para triggers)
CREATE POLICY "System can create chat notifications" 
ON public.chat_notifications FOR INSERT 
WITH CHECK (true);

-- Función para crear notificaciones automáticas
CREATE OR REPLACE FUNCTION public.create_chat_notifications()
RETURNS TRIGGER AS $$
DECLARE
  project_record RECORD;
  recipient_record RECORD;
BEGIN
  -- Obtener información del proyecto
  SELECT * INTO project_record FROM public.client_projects WHERE id = NEW.project_id;
  
  IF project_record IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Si el mensaje es de un empleado, notificar al cliente
  IF NEW.sender_type = 'employee' THEN
    INSERT INTO public.chat_notifications (
      project_id, message_id, recipient_id, recipient_type
    ) VALUES (
      NEW.project_id, NEW.id, project_record.client_id, 'client'
    );
  END IF;
  
  -- Si el mensaje es de un cliente, notificar a empleados asignados
  IF NEW.sender_type = 'client' THEN
    -- Notificar al asesor asignado
    IF project_record.assigned_advisor_id IS NOT NULL THEN
      INSERT INTO public.chat_notifications (
        project_id, message_id, recipient_id, recipient_type
      ) VALUES (
        NEW.project_id, NEW.id, project_record.assigned_advisor_id, 'employee'
      );
    END IF;
    
    -- Notificar al project manager
    IF project_record.project_manager_id IS NOT NULL AND 
       project_record.project_manager_id != project_record.assigned_advisor_id THEN
      INSERT INTO public.chat_notifications (
        project_id, message_id, recipient_id, recipient_type
      ) VALUES (
        NEW.project_id, NEW.id, project_record.project_manager_id, 'employee'
      );
    END IF;
    
    -- Notificar al supervisor de construcción
    IF project_record.construction_supervisor_id IS NOT NULL AND 
       project_record.construction_supervisor_id != project_record.assigned_advisor_id AND
       project_record.construction_supervisor_id != project_record.project_manager_id THEN
      INSERT INTO public.chat_notifications (
        project_id, message_id, recipient_id, recipient_type
      ) VALUES (
        NEW.project_id, NEW.id, project_record.construction_supervisor_id, 'employee'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear notificaciones automáticamente
CREATE TRIGGER trigger_create_chat_notifications
  AFTER INSERT ON public.project_chat
  FOR EACH ROW
  EXECUTE FUNCTION public.create_chat_notifications();

-- Función para actualizar timestamp
CREATE OR REPLACE FUNCTION public.update_project_chat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar timestamp automáticamente
CREATE TRIGGER trigger_update_project_chat_updated_at
  BEFORE UPDATE ON public.project_chat
  FOR EACH ROW
  EXECUTE FUNCTION public.update_project_chat_updated_at();

-- Habilitar Realtime para actualizaciones en tiempo real
ALTER TABLE public.project_chat REPLICA IDENTITY FULL;
ALTER TABLE public.chat_notifications REPLICA IDENTITY FULL;

-- Añadir a la publicación de realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_chat;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_notifications;