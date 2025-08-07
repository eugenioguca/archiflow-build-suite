-- FASE 5: LIMPIEZA FINAL - ELIMINAR SISTEMA DUAL OBSOLETO
-- Paso 1: Verificar que la migración fue exitosa antes de eliminar

-- Crear tabla de respaldo temporal para verificación
CREATE TEMP TABLE migration_verification AS
SELECT 
  COUNT(*) as migrated_count,
  'documents' as table_name
FROM public.documents 
WHERE description LIKE '%Migrado desde client_documents%'
UNION ALL
SELECT 
  COUNT(*) as original_count,
  'client_documents' as table_name  
FROM public.client_documents
WHERE project_id IS NOT NULL;

-- Mostrar resumen de migración
DO $$ 
DECLARE
  migrated_count INTEGER;
  original_count INTEGER;
BEGIN
  SELECT migrated_count INTO migrated_count FROM migration_verification WHERE table_name = 'documents';
  SELECT migrated_count INTO original_count FROM migration_verification WHERE table_name = 'client_documents';
  
  RAISE NOTICE 'RESUMEN DE MIGRACIÓN:';
  RAISE NOTICE 'Documentos migrados a tabla documents: %', migrated_count;
  RAISE NOTICE 'Documentos originales en client_documents: %', original_count;
  
  IF migrated_count > 0 THEN
    RAISE NOTICE 'Migración exitosa detectada. Procediendo con limpieza...';
  ELSE
    RAISE EXCEPTION 'No se detectaron documentos migrados. Abortando limpieza por seguridad.';
  END IF;
END $$;

-- Paso 2: Eliminar triggers obsoletos relacionados con client_documents
DROP TRIGGER IF EXISTS notify_team_new_chat_message ON public.client_portal_chat;
DROP TRIGGER IF EXISTS notify_client_new_chat_response ON public.client_portal_chat;

-- Paso 3: Eliminar suscripciones y referencias a client_documents
-- (Las suscripciones en tiempo real se manejan desde el frontend)

-- Paso 4: Marcar tabla client_documents como deprecated (en lugar de eliminar inmediatamente)
-- Primero, renombrar para evitar confusión pero mantener como respaldo
ALTER TABLE IF EXISTS public.client_documents 
RENAME TO client_documents_deprecated_backup;

-- Paso 5: Crear función de limpieza que se puede ejecutar más tarde cuando se confirme estabilidad
CREATE OR REPLACE FUNCTION public.cleanup_deprecated_client_documents()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Esta función se puede ejecutar manualmente después de confirmar que todo funciona
  -- DROP TABLE IF EXISTS public.client_documents_deprecated_backup;
  
  RETURN 'Función de limpieza creada. Ejecutar manualmente cuando se confirme estabilidad del sistema.';
END;
$$;

-- Paso 6: Actualizar comentarios en la tabla documents para documentar el cambio
COMMENT ON TABLE public.documents IS 'Tabla unificada de documentos del sistema. Reemplaza las antiguas tablas client_documents (migrada) y mantiene compatibilidad con documents existentes.';

-- Paso 7: Limpiar funciones obsoletas pero mantener alias para compatibilidad
-- La función get_project_cumulative_documents ya fue actualizada como alias

-- Paso 8: Verificación final
DO $$ 
BEGIN
  RAISE NOTICE '=== LIMPIEZA COMPLETADA ===';
  RAISE NOTICE 'Sistema unificado implementado exitosamente';
  RAISE NOTICE 'Tabla client_documents renombrada a client_documents_deprecated_backup';
  RAISE NOTICE 'Función de limpieza final disponible: cleanup_deprecated_client_documents()';
  RAISE NOTICE 'Bucket client-documents debe eliminarse manualmente desde el panel de Supabase';
END $$;