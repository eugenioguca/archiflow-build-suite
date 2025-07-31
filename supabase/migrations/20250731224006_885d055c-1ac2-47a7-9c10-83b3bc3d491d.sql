-- Arreglar la otra función con search_path mutable
CREATE OR REPLACE FUNCTION public.has_module_permission(_user_id uuid, _module module_name, _permission text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Admins have all permissions
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = _user_id AND role = 'admin'
  ) THEN
    RETURN true;
  END IF;
  
  -- Check specific permission
  RETURN EXISTS (
    SELECT 1 FROM public.user_permissions up
    WHERE up.user_id = _user_id 
    AND up.module = _module
    AND (
      (_permission = 'view' AND up.can_view = true) OR
      (_permission = 'create' AND up.can_create = true) OR
      (_permission = 'edit' AND up.can_edit = true) OR
      (_permission = 'delete' AND up.can_delete = true)
    )
  );
END;
$function$;