-- CORRECCIÓN INTEGRAL DEL SISTEMA DE CHAT
-- Paso 1: Limpiar todas las políticas RLS existentes en project_chat

DROP POLICY IF EXISTS "Clients can view chat messages for their projects" ON public.project_chat;
DROP POLICY IF EXISTS "Clients can create chat messages for their projects" ON public.project_chat;
DROP POLICY IF EXISTS "Employees can view all project chat messages" ON public.project_chat;
DROP POLICY IF EXISTS "Employees can create project chat messages" ON public.project_chat;
DROP POLICY IF EXISTS "Team members and clients can view project chat messages" ON public.project_chat;
DROP POLICY IF EXISTS "Team members and clients can create project chat messages" ON public.project_chat;
DROP POLICY IF EXISTS "Admins can manage all project chat messages" ON public.project_chat;
DROP POLICY IF EXISTS "Project team members can manage chat messages" ON public.project_chat;

-- Paso 2: Crear políticas RLS unificadas para project_chat usando profiles.id
CREATE POLICY "Unified project chat view access" 
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

CREATE POLICY "Unified project chat insert access" 
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

-- Paso 3: Limpiar y corregir políticas RLS en chat_notifications
DROP POLICY IF EXISTS "Clients can view their chat notifications" ON public.chat_notifications;
DROP POLICY IF EXISTS "Clients can update their chat notification read status" ON public.chat_notifications;

-- Recrear políticas de clientes con profiles.id consistente
CREATE POLICY "Clients can view their chat notifications" 
ON public.chat_notifications 
FOR SELECT 
USING (
  recipient_type = 'client' 
  AND recipient_id = (
    SELECT p.id 
    FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'client'
  )
);

CREATE POLICY "Clients can update their chat notification read status" 
ON public.chat_notifications 
FOR UPDATE 
USING (
  recipient_type = 'client' 
  AND recipient_id = (
    SELECT p.id 
    FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'client'
  )
)
WITH CHECK (
  recipient_type = 'client' 
  AND recipient_id = (
    SELECT p.id 
    FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'client'
  )
);

-- Paso 4: Verificar que el trigger create_chat_notification() esté correcto
-- El trigger ya usa profiles.id correctamente según la función existente

-- Paso 5: Crear función de validación para testing
CREATE OR REPLACE FUNCTION public.test_chat_access(test_project_id uuid)
RETURNS TABLE(
  user_role text,
  profile_id uuid,
  can_view_chat boolean,
  can_send_message boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_profile_id uuid;
  current_user_role text;
BEGIN
  -- Obtener perfil actual
  SELECT p.id, p.role INTO current_profile_id, current_user_role
  FROM profiles p
  WHERE p.user_id = auth.uid();
  
  IF current_profile_id IS NULL THEN
    RETURN QUERY SELECT 'none'::text, null::uuid, false, false;
    RETURN;
  END IF;
  
  -- Probar acceso según el rol
  IF current_user_role IN ('admin', 'employee') THEN
    RETURN QUERY SELECT 
      current_user_role,
      current_profile_id,
      public.employee_has_project_access(current_profile_id, test_project_id),
      public.employee_has_project_access(current_profile_id, test_project_id);
  ELSIF current_user_role = 'client' THEN
    RETURN QUERY SELECT 
      current_user_role,
      current_profile_id,
      public.client_has_project_access_by_profile_id(current_profile_id, test_project_id),
      public.client_has_project_access_by_profile_id(current_profile_id, test_project_id);
  ELSE
    RETURN QUERY SELECT current_user_role, current_profile_id, false, false;
  END IF;
END;
$$;