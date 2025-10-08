-- =====================================================
-- Storage Policies para operation-manuals bucket
-- Permite a usuarios autenticados leer/firmar URLs
-- Solo admin/employee pueden subir
-- =====================================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "operation_manuals_authenticated_read" ON storage.objects;
DROP POLICY IF EXISTS "operation_manuals_authorized_write" ON storage.objects;
DROP POLICY IF EXISTS "operation_manuals_authorized_update" ON storage.objects;
DROP POLICY IF EXISTS "operation_manuals_authorized_delete" ON storage.objects;

-- Política de lectura: usuarios autenticados pueden leer y firmar URLs
CREATE POLICY "operation_manuals_authenticated_read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'operation-manuals');

-- Política de inserción: solo admin/employee pueden subir
CREATE POLICY "operation_manuals_authorized_write"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'operation-manuals'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.role IN ('admin', 'employee')
  )
);

-- Política de actualización: solo admin/employee
CREATE POLICY "operation_manuals_authorized_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'operation-manuals'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.role IN ('admin', 'employee')
  )
);

-- Política de eliminación: solo admin/employee
CREATE POLICY "operation_manuals_authorized_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'operation-manuals'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.role IN ('admin', 'employee')
  )
);