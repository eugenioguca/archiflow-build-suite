-- Crear políticas RLS para la tabla documents para clientes
-- Política para que los clientes puedan ver documentos de sus proyectos
CREATE POLICY "Clients can view documents of their projects" 
ON public.documents
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

-- Política para que los clientes puedan subir documentos a sus proyectos
CREATE POLICY "Clients can upload documents to their projects" 
ON public.documents
FOR INSERT 
WITH CHECK (
  project_id IN (
    SELECT cp.id 
    FROM client_projects cp 
    JOIN clients c ON cp.client_id = c.id 
    JOIN profiles p ON c.profile_id = p.id 
    WHERE p.user_id = auth.uid() AND p.role = 'client'::user_role
  )
);