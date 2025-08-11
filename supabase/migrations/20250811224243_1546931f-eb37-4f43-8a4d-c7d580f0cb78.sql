-- Eliminar política incorrecta que usa tabla projects (obsoleta)
DROP POLICY IF EXISTS "Clients can view their project photos" ON public.progress_photos;

-- Crear política correcta usando la tabla client_projects (arquitectura unificada)
CREATE POLICY "Clients can view their project photos" 
ON public.progress_photos 
FOR SELECT 
USING (project_id IN (
  SELECT cp.id 
  FROM public.client_projects cp 
  JOIN public.clients c ON cp.client_id = c.id 
  JOIN public.profiles p ON c.profile_id = p.id 
  WHERE p.user_id = auth.uid() AND p.role = 'client'::user_role
));

-- Asegurar que empleados y admins también puedan ver las fotos
CREATE POLICY "Employees and admins can view all progress photos" 
ON public.progress_photos 
FOR SELECT 
USING (EXISTS (
  SELECT 1 
  FROM public.profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
));