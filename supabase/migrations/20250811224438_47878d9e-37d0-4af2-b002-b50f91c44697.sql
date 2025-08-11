-- Eliminar todas las políticas existentes de progress_photos
DROP POLICY IF EXISTS "Clients can view their project photos" ON public.progress_photos;
DROP POLICY IF EXISTS "Employees and admins can view all progress photos" ON public.progress_photos;
DROP POLICY IF EXISTS "Employees and admins can manage progress photos" ON public.progress_photos;

-- Recrear las políticas con nombres más específicos y testing
CREATE POLICY "clients_can_view_project_photos" 
ON public.progress_photos 
FOR SELECT 
TO authenticated
USING (
  project_id IN (
    SELECT cp.id 
    FROM public.client_projects cp 
    JOIN public.clients c ON cp.client_id = c.id 
    JOIN public.profiles p ON c.profile_id = p.id 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'client'::user_role
  )
);

-- Política para empleados y admins
CREATE POLICY "employees_admins_view_all_photos" 
ON public.progress_photos 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
  )
);

-- Política para empleados y admins (INSERT, UPDATE, DELETE)
CREATE POLICY "employees_admins_manage_photos" 
ON public.progress_photos 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
  )
);