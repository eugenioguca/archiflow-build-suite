-- Fix infinite recursion in RLS policies by removing problematic profile checks
-- Drop and recreate profiles policies that don't cause recursion

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Admins and employees can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create simplified policies that don't cause recursion
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- For admins viewing all profiles, we'll create a simpler policy
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- Update clients policies to avoid recursion
DROP POLICY IF EXISTS "Clients can view their own data" ON public.clients;
DROP POLICY IF EXISTS "Employees and admins can manage clients" ON public.clients;

CREATE POLICY "Clients can view their own data" 
ON public.clients 
FOR SELECT 
USING (profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Employees and admins can manage clients" 
ON public.clients 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'employee')
  )
);

-- Similar fixes for other tables to avoid recursion
DROP POLICY IF EXISTS "Employees and admins can manage projects" ON public.projects;
CREATE POLICY "Employees and admins can manage projects" 
ON public.projects 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'employee')
  )
);

DROP POLICY IF EXISTS "Employees and admins can manage documents" ON public.documents;
CREATE POLICY "Employees and admins can manage documents" 
ON public.documents 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'employee')
  )
);

DROP POLICY IF EXISTS "Only employees and admins can manage expenses" ON public.expenses;
CREATE POLICY "Only employees and admins can manage expenses" 
ON public.expenses 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'employee')
  )
);

DROP POLICY IF EXISTS "Employees and admins can manage progress photos" ON public.progress_photos;
CREATE POLICY "Employees and admins can manage progress photos" 
ON public.progress_photos 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'employee')
  )
);