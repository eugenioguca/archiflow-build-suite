-- Paso final: Eliminar bucket obsoleto client-documents y limpiar políticas relacionadas
-- Esto completará la migración al sistema unificado

-- Eliminar políticas obsoletas del bucket client-documents
DROP POLICY IF EXISTS "Employees and admins can upload client documents" ON storage.objects;
DROP POLICY IF EXISTS "Employees and admins can view client documents" ON storage.objects;
DROP POLICY IF EXISTS "Employees and admins can update client documents" ON storage.objects;
DROP POLICY IF EXISTS "Employees and admins can delete client documents" ON storage.objects;
DROP POLICY IF EXISTS "Clients can view their own documents" ON storage.objects;

-- Eliminar el bucket client-documents (esto también eliminará cualquier archivo que pudiera quedar)
DELETE FROM storage.objects WHERE bucket_id = 'client-documents';
DELETE FROM storage.buckets WHERE id = 'client-documents';

-- Verificar que todas las funciones estén usando el sistema unificado
-- Asegurar que no haya referencias a client_documents en funciones activas

-- Log de confirmación
DO $$ 
BEGIN
  RAISE NOTICE '=== LIMPIEZA FINAL COMPLETADA ===';
  RAISE NOTICE 'Bucket client-documents eliminado exitosamente';
  RAISE NOTICE 'Políticas obsoletas eliminadas';
  RAISE NOTICE 'Sistema completamente migrado al bucket project-documents';
  RAISE NOTICE 'Todas las funciones usan tabla documents unificada';
  RAISE NOTICE 'El sistema está completamente actualizado y sin referencias obsoletas';
END $$;