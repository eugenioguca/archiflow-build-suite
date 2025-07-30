-- Update the handle_new_user function to set new users as pending
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    user_role := 'client';
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