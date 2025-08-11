-- First, drop all existing policies that depend on the function
DROP POLICY IF EXISTS "Clients can view their project chat messages" ON public.client_portal_chat;
DROP POLICY IF EXISTS "Clients can create their project chat messages" ON public.client_portal_chat;
DROP POLICY IF EXISTS "Team members can view all project chat" ON public.client_portal_chat;
DROP POLICY IF EXISTS "Team members can create team chat messages" ON public.client_portal_chat;

-- Drop any other policies that might exist
DROP POLICY IF EXISTS "Clients can view their own chat messages" ON public.client_portal_chat;
DROP POLICY IF EXISTS "Clients can create chat messages" ON public.client_portal_chat;
DROP POLICY IF EXISTS "Team members can view project chat" ON public.client_portal_chat;
DROP POLICY IF EXISTS "Team members can create chat messages" ON public.client_portal_chat;

-- Now drop the existing function
DROP FUNCTION IF EXISTS public.is_client_of_project(uuid);

-- Create the new function that accepts user_id as parameter (Option 1 - No SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_client_of_project(project_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM client_projects cp
    JOIN clients c ON c.id = cp.client_id
    JOIN profiles p ON p.id = c.profile_id
    WHERE cp.id = project_uuid 
    AND p.user_id = user_uuid
    AND p.role = 'client'
  );
$$;

-- Create new RLS policies with the updated function signature
CREATE POLICY "Clients can view their project chat messages" 
ON public.client_portal_chat 
FOR SELECT 
TO authenticated
USING (public.is_client_of_project(project_id, auth.uid()));

CREATE POLICY "Clients can create their project chat messages" 
ON public.client_portal_chat 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_client_of_project(project_id, auth.uid()) AND is_client_message = true);

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