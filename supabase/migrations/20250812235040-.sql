-- Verificar si el bucket existe y sus configuraciones
SELECT * FROM storage.buckets WHERE name = 'monthly-images';

-- Crear las políticas faltantes si no existen (usando CREATE OR REPLACE para evitar duplicados)
CREATE OR REPLACE POLICY "Public access for monthly images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'monthly-images');

CREATE OR REPLACE POLICY "Admins can upload monthly images" 
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

CREATE OR REPLACE POLICY "Admins can update monthly images" 
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

CREATE OR REPLACE POLICY "Admins can delete monthly images" 
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