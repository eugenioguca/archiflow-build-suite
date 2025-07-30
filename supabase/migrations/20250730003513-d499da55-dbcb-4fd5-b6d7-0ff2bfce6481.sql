-- Add approval status to profiles table
ALTER TABLE public.profiles 
ADD COLUMN approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Update existing users to be approved (so current users aren't blocked)
UPDATE public.profiles SET approval_status = 'approved';

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
$function$

-- Create RLS policy to only allow approved users to access data
CREATE POLICY "Only approved users can access system" 
ON public.profiles 
FOR ALL 
TO authenticated
USING (
  approval_status = 'approved' OR 
  public.is_admin(auth.uid()) -- Admins can always access
);

-- Update existing policies to also check approval status
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  (auth.uid() = user_id AND approval_status = 'approved') OR 
  public.is_admin(auth.uid())
);

-- Create policy for admins to manage user approvals
CREATE POLICY "Admins can manage user approvals" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));