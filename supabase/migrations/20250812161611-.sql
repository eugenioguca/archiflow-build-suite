-- CORRECCIÓN INTEGRAL DEL SISTEMA DE CHAT - LIMPIEZA COMPLETA
-- Paso 1: Eliminar TODAS las políticas existentes de project_chat y chat_notifications

-- Eliminar políticas de project_chat
DROP POLICY IF EXISTS "Unified project chat view access" ON public.project_chat;
DROP POLICY IF EXISTS "Unified project chat insert access" ON public.project_chat;
DROP POLICY IF EXISTS "Clients can view chat messages for their projects" ON public.project_chat;
DROP POLICY IF EXISTS "Clients can create chat messages for their projects" ON public.project_chat;
DROP POLICY IF EXISTS "Employees can view all project chat messages" ON public.project_chat;
DROP POLICY IF EXISTS "Employees can create project chat messages" ON public.project_chat;
DROP POLICY IF EXISTS "Team members and clients can view project chat messages" ON public.project_chat;
DROP POLICY IF EXISTS "Team members and clients can create project chat messages" ON public.project_chat;
DROP POLICY IF EXISTS "Admins can manage all project chat messages" ON public.project_chat;
DROP POLICY IF EXISTS "Project team members can manage chat messages" ON public.project_chat;

-- Eliminar políticas de chat_notifications
DROP POLICY IF EXISTS "Clients can view their chat notifications" ON public.chat_notifications;
DROP POLICY IF EXISTS "Clients can update their chat notification read status" ON public.chat_notifications;
DROP POLICY IF EXISTS "Employees can view chat notifications" ON public.chat_notifications;
DROP POLICY IF EXISTS "Employees can update chat notification read status" ON public.chat_notifications;
DROP POLICY IF EXISTS "System can create chat notifications" ON public.chat_notifications;

-- Paso 2: Crear políticas RLS NUEVAS y UNIFICADAS

-- Para project_chat - Solo 2 políticas unificadas
CREATE POLICY "Chat view access for project members" 
ON public.project_chat 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND (
      -- Empleados con acceso al proyecto
      (p.role IN ('admin', 'employee') AND public.employee_has_project_access(p.id, project_chat.project_id))
      OR
      -- Clientes con acceso al proyecto
      (p.role = 'client' AND public.client_has_project_access_by_profile_id(p.id, project_chat.project_id))
    )
  )
);

CREATE POLICY "Chat message creation for project members" 
ON public.project_chat 
FOR INSERT 
WITH CHECK (
  sender_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND (
      -- Empleados con acceso al proyecto
      (p.role IN ('admin', 'employee') AND public.employee_has_project_access(p.id, project_chat.project_id))
      OR
      -- Clientes con acceso al proyecto
      (p.role = 'client' AND public.client_has_project_access_by_profile_id(p.id, project_chat.project_id))
    )
  )
);

-- Para chat_notifications - Recrear todas las políticas usando profiles.id
CREATE POLICY "Chat notifications view for employees" 
ON public.chat_notifications 
FOR SELECT 
USING (
  recipient_type = 'employee' 
  AND recipient_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Chat notifications update for employees" 
ON public.chat_notifications 
FOR UPDATE 
USING (
  recipient_type = 'employee' 
  AND recipient_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
)
WITH CHECK (
  recipient_type = 'employee' 
  AND recipient_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Chat notifications view for clients" 
ON public.chat_notifications 
FOR SELECT 
USING (
  recipient_type = 'client' 
  AND recipient_id = (SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'client')
);

CREATE POLICY "Chat notifications update for clients" 
ON public.chat_notifications 
FOR UPDATE 
USING (
  recipient_type = 'client' 
  AND recipient_id = (SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'client')
)
WITH CHECK (
  recipient_type = 'client' 
  AND recipient_id = (SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'client')
);

CREATE POLICY "System can create notifications" 
ON public.chat_notifications 
FOR INSERT 
WITH CHECK (true);