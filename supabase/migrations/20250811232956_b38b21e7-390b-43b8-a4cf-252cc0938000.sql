-- Actualizar función is_client_of_project con search_path seguro
CREATE OR REPLACE FUNCTION is_client_of_project(project_uuid uuid, user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
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