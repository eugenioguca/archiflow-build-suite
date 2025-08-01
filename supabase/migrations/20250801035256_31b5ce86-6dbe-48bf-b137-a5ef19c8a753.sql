-- Fix user roles and create client redirection logic

-- First, update the handle_new_user function to set correct roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  user_role user_role;
  user_approval_status TEXT;
BEGIN
  -- Assign admin role to specific admin email, otherwise default to client
  IF NEW.email = 'eugenioguca@hotmail.com' THEN
    user_role := 'admin';
    user_approval_status := 'approved'; -- Admins are auto-approved
  ELSE
    user_role := 'client'; -- Default all new users to client role
    user_approval_status := 'pending'; -- New users need approval
  END IF;

  INSERT INTO public.profiles (user_id, email, full_name, role, approval_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    user_role,
    user_approval_status
  );
  
  RETURN NEW;
END;
$function$;

-- Update existing client profiles to ensure they have the correct role
UPDATE public.profiles 
SET role = 'client' 
WHERE email NOT IN ('eugenioguca@hotmail.com', 's.fernandezv@outlook.com') 
AND role != 'client';

-- Create or update RLS policies to restrict client access
-- Clients can only see their own data
CREATE POLICY "Clients can only view their own projects" ON public.projects
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM clients c
    JOIN profiles p ON p.id = c.profile_id 
    WHERE p.user_id = auth.uid() 
    AND c.id = projects.client_id
    AND p.role = 'client'
  )
);

-- Update existing policies for better client restrictions
DROP POLICY IF EXISTS "Clients can view their own data" ON public.clients;
CREATE POLICY "Clients can view their own data" ON public.clients
FOR SELECT USING (
  profile_id = (
    SELECT profiles.id FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'client'
  )
);

-- Ensure only client documents are visible to clients
CREATE POLICY "Clients can only view their client-accessible documents" ON public.documents
FOR SELECT USING (
  access_level = 'client' AND
  (client_id IN (
    SELECT c.id FROM clients c
    JOIN profiles p ON p.id = c.profile_id 
    WHERE p.user_id = auth.uid() AND p.role = 'client'
  ) OR project_id IN (
    SELECT pr.id FROM projects pr
    JOIN clients c ON c.id = pr.client_id
    JOIN profiles p ON p.id = c.profile_id 
    WHERE p.user_id = auth.uid() AND p.role = 'client'
  ))
);

-- Update client portal settings policy
DROP POLICY IF EXISTS "Clients can view their own portal settings" ON public.client_portal_settings;
CREATE POLICY "Clients can view their own portal settings" ON public.client_portal_settings
FOR SELECT USING (
  client_id IN (
    SELECT c.id FROM clients c
    JOIN profiles p ON p.id = c.profile_id 
    WHERE p.user_id = auth.uid() AND p.role = 'client'
  )
);