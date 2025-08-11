-- Crear función para verificar si usuario es cliente del proyecto sin usar unnest
CREATE OR REPLACE FUNCTION is_client_of_project(project_uuid uuid, user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.client_projects cp
    JOIN public.clients c ON c.id = cp.client_id
    JOIN public.profiles p ON p.id = c.profile_id
    WHERE cp.id = project_uuid 
    AND p.user_id = user_uuid
    AND p.role = 'client'::user_role
  );
$$;

-- Actualizar política para client_portal_chat con mejor manejo
DROP POLICY IF EXISTS "Clients can create their project chat messages" ON public.client_portal_chat;
CREATE POLICY "Clients can create their project chat messages" 
ON public.client_portal_chat
FOR INSERT 
WITH CHECK (
  is_client_of_project(project_id, auth.uid()) 
  AND is_client_message = true
);

DROP POLICY IF EXISTS "Clients can view their project chat messages" ON public.client_portal_chat;
CREATE POLICY "Clients can view their project chat messages" 
ON public.client_portal_chat
FOR SELECT 
USING (
  is_client_of_project(project_id, auth.uid())
);

-- Simplificar las políticas de perfiles para evitar problemas
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles
FOR SELECT 
USING (
  (user_id = auth.uid()) 
  OR is_admin(auth.uid())
  OR (
    -- Los clientes pueden ver perfiles de empleados asignados a sus proyectos
    EXISTS (
      SELECT 1 
      FROM public.client_projects cp
      JOIN public.clients c ON c.id = cp.client_id
      JOIN public.profiles client_profile ON client_profile.id = c.profile_id
      WHERE client_profile.user_id = auth.uid()
      AND client_profile.role = 'client'::user_role
      AND (
        cp.assigned_advisor_id = profiles.id 
        OR cp.project_manager_id = profiles.id 
        OR cp.construction_supervisor_id = profiles.id
      )
    )
  )
  OR (
    -- Los empleados pueden ver perfiles de otros empleados del equipo
    role = ANY(ARRAY['admin'::user_role, 'employee'::user_role]) 
    AND profiles.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
  )
);