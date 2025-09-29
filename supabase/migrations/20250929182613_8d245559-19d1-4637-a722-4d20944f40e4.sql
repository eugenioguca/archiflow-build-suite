-- Asegurar que el bucket operation-manuals existe y es público
INSERT INTO storage.buckets (id, name, public)
VALUES ('operation-manuals', 'operation-manuals', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Eliminar políticas existentes para recrearlas correctamente
DROP POLICY IF EXISTS "Public can view operation manuals" ON storage.objects;
DROP POLICY IF EXISTS "Employees can upload operation manuals" ON storage.objects;
DROP POLICY IF EXISTS "Employees can update operation manuals" ON storage.objects;
DROP POLICY IF EXISTS "Employees can delete operation manuals" ON storage.objects;

-- Política para permitir acceso público de lectura a los manuales
CREATE POLICY "Public can view operation manuals"
ON storage.objects FOR SELECT
USING (bucket_id = 'operation-manuals');

-- Política para permitir a empleados y admins subir manuales
CREATE POLICY "Employees can upload operation manuals"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'operation-manuals' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'employee')
  )
);

-- Política para permitir a empleados y admins actualizar manuales
CREATE POLICY "Employees can update operation manuals"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'operation-manuals' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'employee')
  )
);

-- Política para permitir a empleados y admins eliminar manuales
CREATE POLICY "Employees can delete operation manuals"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'operation-manuals' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'employee')
  )
);