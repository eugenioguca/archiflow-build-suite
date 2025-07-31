-- Hacer público el bucket project-documents para permitir acceso directo
UPDATE storage.buckets 
SET public = true 
WHERE id = 'project-documents';

-- Crear políticas públicas para el bucket project-documents
CREATE POLICY "Acceso público para ver documentos de proyecto" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'project-documents');

CREATE POLICY "Los usuarios pueden subir documentos de proyecto" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'project-documents' AND auth.uid() = owner);

CREATE POLICY "Los usuarios pueden actualizar sus documentos de proyecto" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'project-documents' AND auth.uid() = owner);

CREATE POLICY "Los usuarios pueden eliminar sus documentos de proyecto" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'project-documents' AND auth.uid() = owner);