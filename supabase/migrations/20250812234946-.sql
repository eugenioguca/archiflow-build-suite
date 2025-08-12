-- Crear bucket para las imágenes del mes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('monthly-images', 'monthly-images', true);

-- Crear políticas para el bucket monthly-images
-- Política para que todos puedan ver las imágenes (bucket público)
CREATE POLICY "Public access for monthly images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'monthly-images');

-- Política para que solo los administradores puedan subir imágenes
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

-- Política para que solo los administradores puedan actualizar imágenes
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

-- Política para que solo los administradores puedan eliminar imágenes
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