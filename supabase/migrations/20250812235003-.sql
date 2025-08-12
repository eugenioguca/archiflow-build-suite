-- Verificar políticas existentes para el bucket monthly-images
SELECT * FROM storage.policies WHERE bucket_id = 'monthly-images';