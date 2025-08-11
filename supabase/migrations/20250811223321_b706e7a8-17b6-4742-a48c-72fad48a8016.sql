-- Crear políticas de storage para que los clientes puedan subir documentos
-- Política para que los clientes puedan subir archivos a sus proyectos
CREATE POLICY "Clients can upload documents to their project folders" 
ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'project-documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT c.id::text 
    FROM clients c 
    JOIN profiles p ON c.profile_id = p.id 
    WHERE p.user_id = auth.uid() AND p.role = 'client'::user_role
  )
);

-- Política para que los clientes puedan acceder a archivos de sus proyectos
CREATE POLICY "Clients can access their project documents" 
ON storage.objects
FOR SELECT 
USING (
  bucket_id = 'project-documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT c.id::text 
    FROM clients c 
    JOIN profiles p ON c.profile_id = p.id 
    WHERE p.user_id = auth.uid() AND p.role = 'client'::user_role
  )
);

-- Política para que empleados y admins puedan gestionar todos los documentos
CREATE POLICY "Employees and admins can manage all project documents" 
ON storage.objects
FOR ALL 
USING (
  bucket_id = 'project-documents' 
  AND EXISTS (
    SELECT 1 
    FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
  )
);