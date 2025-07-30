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