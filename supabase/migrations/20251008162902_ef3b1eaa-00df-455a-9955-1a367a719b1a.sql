-- Asegurar políticas correctas para bucket operation-manuals
-- Este bucket almacena manuales de empresa (operación y presentación corporativa)

-- El bucket debe existir y NO debe ser público (las signed URLs funcionan sin que sea público)
INSERT INTO storage.buckets (id, name, public)
VALUES ('operation-manuals', 'operation-manuals', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Eliminar políticas antiguas que puedan causar conflictos
DROP POLICY IF EXISTS "Public can view operation manuals" ON storage.objects;
DROP POLICY IF EXISTS "Public access for operation manuals" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view operation manuals" ON storage.objects;
DROP POLICY IF EXISTS "Admin and employees can upload operation manuals" ON storage.objects;
DROP POLICY IF EXISTS "Employees can upload operation manuals" ON storage.objects;
DROP POLICY IF EXISTS "Admin and employees can update operation manuals" ON storage.objects;
DROP POLICY IF EXISTS "Employees can update operation manuals" ON storage.objects;
DROP POLICY IF EXISTS "Admin and employees can delete operation manuals" ON storage.objects;
DROP POLICY IF EXISTS "Employees can delete operation manuals" ON storage.objects;

-- Política para SELECT: permite a usuarios autenticados ver objetos (necesario para signed URLs)
CREATE POLICY "Authenticated can view operation manuals"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'operation-manuals');

-- Política para INSERT: solo admin y employees pueden subir manuales
CREATE POLICY "Staff can upload operation manuals"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'operation-manuals' 
  AND (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'employee')
    )
  )
);

-- Política para UPDATE: solo admin y employees pueden actualizar
CREATE POLICY "Staff can update operation manuals"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'operation-manuals' 
  AND (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'employee')
    )
  )
);

-- Política para DELETE: solo admin y employees pueden eliminar
CREATE POLICY "Staff can delete operation manuals"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'operation-manuals' 
  AND (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'employee')
    )
  )
);