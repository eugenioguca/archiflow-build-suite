-- CRITICAL SECURITY FIXES

-- 1. First, let's check current profiles table RLS policies
-- We need to see what policies exist before modifying them

-- 2. Create secure admin-only role update function
CREATE OR REPLACE FUNCTION public.update_user_role_secure(_user_id uuid, _new_role user_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_role user_role;
BEGIN
  -- Get current user's role
  SELECT role INTO current_user_role
  FROM public.profiles
  WHERE user_id = auth.uid();
  
  -- Only admins can update roles
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can update user roles';
  END IF;
  
  -- Prevent users from changing their own role
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'Users cannot modify their own role';
  END IF;
  
  -- Update the role
  UPDATE public.profiles 
  SET role = _new_role, updated_at = now()
  WHERE user_id = _user_id;
  
  -- Log the security event
  PERFORM public.log_security_event(
    'role_updated',
    jsonb_build_object(
      'target_user_id', _user_id,
      'new_role', _new_role,
      'updated_by', auth.uid()
    )
  );
END;
$$;

-- 3. Create secure admin-only approval status update function
CREATE OR REPLACE FUNCTION public.update_user_approval_secure(_user_id uuid, _approval_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_role user_role;
BEGIN
  -- Get current user's role
  SELECT role INTO current_user_role
  FROM public.profiles
  WHERE user_id = auth.uid();
  
  -- Only admins can update approval status
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can update approval status';
  END IF;
  
  -- Update the approval status
  UPDATE public.profiles 
  SET approval_status = _approval_status, updated_at = now()
  WHERE user_id = _user_id;
  
  -- Log the security event
  PERFORM public.log_security_event(
    'approval_status_updated',
    jsonb_build_object(
      'target_user_id', _user_id,
      'new_approval_status', _approval_status,
      'updated_by', auth.uid()
    )
  );
END;
$$;

-- 4. Drop existing overly permissive RLS policies on profiles
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- 5. Create new secure RLS policies for profiles table
-- Users can only update their own non-sensitive profile fields
CREATE POLICY "Users can update own basic profile fields"
ON public.profiles
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid() AND
  -- Prevent updates to sensitive fields
  role = (SELECT role FROM public.profiles WHERE user_id = auth.uid()) AND
  approval_status = (SELECT approval_status FROM public.profiles WHERE user_id = auth.uid())
);

-- Admin-only policy for role and approval status updates
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);

-- 6. Fix all database functions with missing search_path
-- Update existing functions to include proper search_path

-- Fix sync_construction_budget_improved
CREATE OR REPLACE FUNCTION public.sync_construction_budget_improved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Actualizar el construction_budget del proyecto con la suma actual de items
  UPDATE public.client_projects 
  SET 
    construction_budget = (
      SELECT COALESCE(SUM(total_price), 0)
      FROM public.construction_budget_items 
      WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Fix fix_budget_discrepancies
CREATE OR REPLACE FUNCTION public.fix_budget_discrepancies()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Actualizar todos los proyectos para que construction_budget coincida con la suma de sus items
  UPDATE public.client_projects 
  SET 
    construction_budget = calculated_budget.total_budget,
    updated_at = now()
  FROM (
    SELECT 
      cp.id as project_id,
      COALESCE(SUM(cbi.total_price), 0) as total_budget
    FROM public.client_projects cp
    LEFT JOIN public.construction_budget_items cbi ON cp.id = cbi.project_id
    WHERE cp.status = 'construction'
    GROUP BY cp.id
  ) as calculated_budget
  WHERE client_projects.id = calculated_budget.project_id
  AND client_projects.construction_budget != calculated_budget.total_budget;
  
  RAISE NOTICE 'Budget discrepancies fixed for construction projects';
END;
$function$;

-- Fix has_module_permission
CREATE OR REPLACE FUNCTION public.has_module_permission(_user_id uuid, _module text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  user_profile RECORD;
BEGIN
  -- Get user profile
  SELECT p.role, p.department_enum, p.position_enum INTO user_profile
  FROM public.profiles p
  WHERE p.user_id = _user_id;
  
  -- Admins have access to everything
  IF user_profile.role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Clients only have client access
  IF user_profile.role = 'client' THEN
    RETURN _module = 'client_portal';
  END IF;
  
  -- If no department/position assigned, deny access
  IF user_profile.department_enum IS NULL OR user_profile.position_enum IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check department permissions
  RETURN EXISTS (
    SELECT 1 FROM public.department_permissions dp
    WHERE dp.department = user_profile.department_enum
    AND dp.position = user_profile.position_enum
    AND dp.module_name = _module
    AND dp.can_access = true
  );
END;
$function$;