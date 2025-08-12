-- Crear bucket para los manuales de operación
INSERT INTO storage.buckets (id, name, public) 
VALUES ('operation-manuals', 'operation-manuals', true);

-- Crear políticas para el bucket operation-manuals
-- Política para que todos puedan ver los manuales (bucket público)
CREATE POLICY "Public access for operation manuals" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'operation-manuals');

-- Política para que solo los administradores puedan subir manuales
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

-- Política para que solo los administradores puedan actualizar manuales
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

-- Política para que solo los administradores puedan eliminar manuales
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