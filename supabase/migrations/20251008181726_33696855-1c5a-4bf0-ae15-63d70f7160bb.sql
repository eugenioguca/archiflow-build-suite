-- Políticas de Storage para bucket operation-manuals
-- Objetivo: usuarios autenticados pueden listar/leer (signed URLs), 
-- solo admin/employee pueden escribir

-- Asegurar que el bucket existe y es privado
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'operation-manuals',
  'operation-manuals',
  false,
  52428800,
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-powerpoint']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-powerpoint'];

-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "company_manuals_read" ON storage.objects;
DROP POLICY IF EXISTS "company_manuals_insert" ON storage.objects;
DROP POLICY IF EXISTS "company_manuals_update" ON storage.objects;
DROP POLICY IF EXISTS "company_manuals_delete" ON storage.objects;

-- LECTURA: Usuarios autenticados pueden listar/ver archivos del bucket
CREATE POLICY "company_manuals_read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'operation-manuals');

-- ESCRITURA: Solo admin y employee pueden subir archivos
CREATE POLICY "company_manuals_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'operation-manuals'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'employee')
  )
);

-- ACTUALIZACIÓN: Solo admin y employee pueden actualizar archivos
CREATE POLICY "company_manuals_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'operation-manuals'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'employee')
  )
)
WITH CHECK (
  bucket_id = 'operation-manuals'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'employee')
  )
);

-- ELIMINACIÓN: Solo admin y employee pueden eliminar archivos
CREATE POLICY "company_manuals_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'operation-manuals'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'employee')
  )
);