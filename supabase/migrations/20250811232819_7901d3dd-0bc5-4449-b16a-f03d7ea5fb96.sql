-- Eliminar función existente y recrear
DROP FUNCTION IF EXISTS is_admin(uuid);

-- Crear función is_admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE user_id = user_uuid 
    AND role = 'admin'::user_role
  );
$$;

-- Función para verificar si usuario es cliente del proyecto  
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

-- Actualizar política para permitir ver perfiles de equipo de proyecto
DROP POLICY IF EXISTS "Team members can view project team profiles" ON public.profiles;
CREATE POLICY "Team members can view project team profiles" 
ON public.profiles
FOR SELECT 
USING (
  -- Los usuarios pueden ver sus propios perfiles
  (user_id = auth.uid()) 
  OR 
  -- Los admins pueden ver todos los perfiles
  is_admin(auth.uid())
  OR
  -- Los miembros del equipo pueden ver perfiles de otros miembros del mismo proyecto
  (
    role = ANY(ARRAY['admin'::user_role, 'employee'::user_role]) 
    AND EXISTS (
      SELECT 1 
      FROM public.client_projects cp
      WHERE 
        cp.assigned_advisor_id = profiles.id 
        OR cp.project_manager_id = profiles.id 
        OR cp.construction_supervisor_id = profiles.id
    )
  )
  OR
  -- Los clientes pueden ver perfiles de empleados asignados a sus proyectos
  (
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
);