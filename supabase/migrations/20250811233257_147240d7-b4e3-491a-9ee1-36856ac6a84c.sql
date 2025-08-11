-- Fix infinite recursion by dropping all dependent policies first
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;  
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage user approvals" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can manage platform settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Team members can view project team profiles" ON public.profiles;

-- Now drop and recreate the function
DROP FUNCTION IF EXISTS is_admin(uuid) CASCADE;

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

-- Recreate the essential policies without recursion
CREATE POLICY "Users can view their own profile" 
ON public.profiles
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles" 
ON public.profiles
FOR SELECT 
USING (is_admin(auth.uid()));

CREATE POLICY "Employees can view employee profiles" 
ON public.profiles
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles viewer 
    WHERE viewer.user_id = auth.uid() 
    AND viewer.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
  )
  AND role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
);

CREATE POLICY "Users can update their own profile" 
ON public.profiles
FOR UPDATE 
USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage all profiles" 
ON public.profiles
FOR ALL
USING (is_admin(auth.uid()));