-- Migrate existing users with direccion_general to director + general
UPDATE public.profiles 
SET 
  position_enum = 'director',
  department_enum = 'general'
WHERE position_enum = 'direccion_general';

-- Update the has_module_permission function to recognize director + general as having full access
CREATE OR REPLACE FUNCTION public.has_module_permission(_user_id uuid, _module text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  
  -- Director General (director + general) has access to everything
  IF user_profile.position_enum = 'director' AND user_profile.department_enum = 'general' THEN
    RETURN true;
  END IF;
  
  -- Directors have access to most modules
  IF user_profile.position_enum = 'director' THEN
    RETURN true;
  END IF;
  
  -- Module-specific permissions for employees
  IF user_profile.role = 'employee' THEN
    CASE _module
      WHEN 'dashboard' THEN RETURN true;
      WHEN 'calendar' THEN RETURN true;
      WHEN 'clients' THEN RETURN user_profile.department_enum IN ('ventas', 'finanzas', 'contabilidad');
      WHEN 'sales' THEN RETURN user_profile.department_enum = 'ventas';
      WHEN 'design' THEN RETURN user_profile.department_enum = 'diseño';
      WHEN 'construction' THEN RETURN user_profile.department_enum = 'construcción';
      WHEN 'suppliers' THEN RETURN user_profile.department_enum IN ('construcción', 'finanzas', 'contabilidad');
      WHEN 'finances' THEN RETURN user_profile.department_enum IN ('finanzas', 'contabilidad');
      WHEN 'accounting' THEN RETURN user_profile.department_enum = 'contabilidad';
      WHEN 'client_portal_preview' THEN RETURN user_profile.department_enum IN ('ventas', 'diseño', 'construcción');
      WHEN 'tools' THEN RETURN user_profile.department_enum IN ('finanzas', 'contabilidad');
      ELSE RETURN false;
    END CASE;
  END IF;
  
  RETURN false;
END;
$function$;

-- Update get_user_branch_offices function to include director + general
CREATE OR REPLACE FUNCTION public.get_user_branch_offices(_user_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_profile RECORD;
  branch_ids UUID[];
BEGIN
  -- Get user profile
  SELECT p.role, p.department_enum, p.position_enum INTO user_profile
  FROM public.profiles p
  WHERE p.user_id = _user_id;
  
  -- Admins and directors see all branches
  IF user_profile.role = 'admin' OR user_profile.position_enum = 'director' THEN
    SELECT ARRAY(SELECT id FROM public.branch_offices WHERE active = true) INTO branch_ids;
    RETURN branch_ids;
  END IF;
  
  -- Director General (director + general) sees all branches
  IF user_profile.position_enum = 'director' AND user_profile.department_enum = 'general' THEN
    SELECT ARRAY(SELECT id FROM public.branch_offices WHERE active = true) INTO branch_ids;
    RETURN branch_ids;
  END IF;
  
  -- Finance and accounting see all branches
  IF user_profile.department_enum IN ('finanzas', 'contabilidad') THEN
    SELECT ARRAY(SELECT id FROM public.branch_offices WHERE active = true) INTO branch_ids;
    RETURN branch_ids;
  END IF;
  
  -- Other users see only assigned branches
  SELECT ARRAY(
    SELECT uba.branch_office_id 
    FROM public.user_branch_assignments uba
    JOIN public.profiles p ON p.id = uba.user_id
    WHERE p.user_id = _user_id
  ) INTO branch_ids;
  
  RETURN branch_ids;
END;
$function$;