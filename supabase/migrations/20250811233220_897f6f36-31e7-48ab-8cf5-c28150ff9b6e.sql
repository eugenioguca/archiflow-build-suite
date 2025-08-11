-- Fix infinite recursion in profiles RLS policies
-- Create proper security definer functions first

-- Drop existing problematic function and recreate with proper search path
DROP FUNCTION IF EXISTS is_admin(uuid);

CREATE OR REPLACE FUNCTION is_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE user_id = user_uuid 
    AND role = 'admin'::user_role
  );
$$;

-- Drop existing policies that might be causing recursion
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Team members can view project team profiles" ON public.profiles;

-- Create new non-recursive policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles
FOR SELECT 
USING (
  user_id = auth.uid()
);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles
FOR SELECT 
USING (
  is_admin(auth.uid())
);

CREATE POLICY "Employees can view other employee profiles" 
ON public.profiles
FOR SELECT 
USING (
  -- Employees can see other employees and admins
  EXISTS (
    SELECT 1 
    FROM public.profiles viewer 
    WHERE viewer.user_id = auth.uid() 
    AND viewer.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
  )
  AND role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
);

CREATE POLICY "Clients can view assigned team profiles" 
ON public.profiles
FOR SELECT 
USING (
  -- Clients can see profiles of team members assigned to their projects
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
);

-- Allow profile updates by the user themselves or admins
CREATE POLICY "Users can update their own profile" 
ON public.profiles
FOR UPDATE 
USING (
  user_id = auth.uid() OR is_admin(auth.uid())
);

-- Allow profile creation by admins or new users for themselves
CREATE POLICY "Users can create profiles" 
ON public.profiles
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() OR is_admin(auth.uid())
);