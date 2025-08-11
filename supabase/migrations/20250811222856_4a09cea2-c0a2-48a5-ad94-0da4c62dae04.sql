-- Crear políticas RLS para progress_photos para que los clientes puedan ver fotos de sus proyectos
CREATE POLICY "Clients can view progress photos of their projects" 
ON public.progress_photos
FOR SELECT 
USING (
  project_id IN (
    SELECT cp.id 
    FROM client_projects cp 
    JOIN clients c ON cp.client_id = c.id 
    JOIN profiles p ON c.profile_id = p.id 
    WHERE p.user_id = auth.uid() AND p.role = 'client'::user_role
  )
);

-- Política para que empleados y admins puedan gestionar fotos de progreso
CREATE POLICY "Employees and admins can manage progress photos" 
ON public.progress_photos
FOR ALL 
USING (
  EXISTS (
    SELECT 1 
    FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
  )
);

-- Habilitar RLS en la tabla progress_photos si no está habilitado
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;