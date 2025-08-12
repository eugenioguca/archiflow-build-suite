-- Paso 1: Eliminar todas las políticas RLS conflictivas de project_chat
DROP POLICY IF EXISTS "Employees can view project chat" ON public.project_chat;
DROP POLICY IF EXISTS "Employees can create project chat messages" ON public.project_chat;
DROP POLICY IF EXISTS "Employees can update project chat messages" ON public.project_chat;
DROP POLICY IF EXISTS "Clients can view their project chat" ON public.project_chat;
DROP POLICY IF EXISTS "Clients can create their project chat messages" ON public.project_chat;
DROP POLICY IF EXISTS "Clients can update their project chat messages" ON public.project_chat;
DROP POLICY IF EXISTS "Employees can manage project chat" ON public.project_chat;
DROP POLICY IF EXISTS "Clients can manage their project chat" ON public.project_chat;

-- Paso 2: Crear las políticas RLS unificadas correctas para project_chat
CREATE POLICY "Employees can manage project chat" 
ON public.project_chat 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'employee')
    AND public.employee_has_project_access(p.id, project_chat.project_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'employee')
    AND public.employee_has_project_access(p.id, project_chat.project_id)
    AND project_chat.sender_id = p.id
    AND project_chat.sender_type = 'employee'
  )
);

CREATE POLICY "Clients can manage their project chat" 
ON public.project_chat 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'client'
    AND public.client_has_project_access_by_profile_id(p.id, project_chat.project_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'client'
    AND public.client_has_project_access_by_profile_id(p.id, project_chat.project_id)
    AND project_chat.sender_id = p.id
    AND project_chat.sender_type = 'client'
  )
);

-- Paso 3: Verificar y corregir políticas RLS de chat_notifications
DROP POLICY IF EXISTS "Clients can view their chat notifications" ON public.chat_notifications;
DROP POLICY IF EXISTS "Clients can update their chat notification read status" ON public.chat_notifications;

-- Crear políticas corregidas para chat_notifications usando profiles.id
CREATE POLICY "Clients can view their chat notifications" 
ON public.chat_notifications 
FOR SELECT 
USING (
  recipient_type = 'client' AND recipient_id = (
    SELECT p.id FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'client'
  )
);

CREATE POLICY "Clients can update their chat notification read status" 
ON public.chat_notifications 
FOR UPDATE 
USING (
  recipient_type = 'client' AND recipient_id = (
    SELECT p.id FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'client'
  )
)
WITH CHECK (
  recipient_type = 'client' AND recipient_id = (
    SELECT p.id FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'client'
  )
);