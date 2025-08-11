-- Crear función de verificación de permisos para clientes
CREATE OR REPLACE FUNCTION public.is_client_of_project(project_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM client_projects cp
    JOIN clients c ON c.id = cp.client_id
    JOIN profiles p ON p.id = c.profile_id
    WHERE cp.id = project_uuid 
    AND p.user_id = auth.uid() 
    AND p.role = 'client'
  );
$$;

-- Eliminar políticas RLS existentes para client_portal_chat
DROP POLICY IF EXISTS "Clients can view their own chat messages" ON public.client_portal_chat;
DROP POLICY IF EXISTS "Clients can create chat messages" ON public.client_portal_chat;
DROP POLICY IF EXISTS "Team members can view project chat" ON public.client_portal_chat;
DROP POLICY IF EXISTS "Team members can create chat messages" ON public.client_portal_chat;

-- Crear nuevas políticas RLS simplificadas
CREATE POLICY "Clients can view their project chat messages" 
ON public.client_portal_chat 
FOR SELECT 
TO authenticated
USING (public.is_client_of_project(project_id));

CREATE POLICY "Clients can create their project chat messages" 
ON public.client_portal_chat 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_client_of_project(project_id) AND is_client_message = true);

CREATE POLICY "Team members can view all project chat" 
ON public.client_portal_chat 
FOR SELECT 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
));

CREATE POLICY "Team members can create team chat messages" 
ON public.client_portal_chat 
FOR INSERT 
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
) AND is_client_message = false);

-- Añadir índices para optimizar rendimiento
CREATE INDEX IF NOT EXISTS idx_client_portal_chat_project_client ON public.client_portal_chat(project_id, client_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_chat_created_at ON public.client_portal_chat(created_at DESC);