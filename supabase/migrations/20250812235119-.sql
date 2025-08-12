-- Verificar si el bucket existe
SELECT * FROM storage.buckets WHERE name = 'monthly-images';

-- Primero eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Public access for monthly images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload monthly images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update monthly images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete monthly images" ON storage.objects;

-- Crear las políticas necesarias
CREATE POLICY "Public access for monthly images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'monthly-images');

CREATE POLICY "Admins can upload monthly images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'monthly-images' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can update monthly images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'monthly-images' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete monthly images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'monthly-images' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);