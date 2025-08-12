-- Verificar si el bucket existe
SELECT * FROM storage.buckets WHERE name = 'operation-manuals';

-- Eliminar políticas existentes si existen para evitar duplicados
DROP POLICY IF EXISTS "Public access for operation manuals" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload operation manuals" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update operation manuals" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete operation manuals" ON storage.objects;

-- Crear las políticas necesarias
CREATE POLICY "Public access for operation manuals" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'operation-manuals');

CREATE POLICY "Admins can upload operation manuals" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'operation-manuals' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can update operation manuals" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'operation-manuals' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete operation manuals" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'operation-manuals' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);