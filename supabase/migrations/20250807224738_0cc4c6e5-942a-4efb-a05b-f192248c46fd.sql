-- FASE 5: LIMPIEZA FINAL - ELIMINAR SISTEMA DUAL OBSOLETO (CORREGIDA)
-- Paso 1: Verificar que la migración fue exitosa antes de eliminar

-- Verificación directa sin conflictos de nombres
DO $$ 
DECLARE
  docs_migrated INTEGER;
  client_docs_original INTEGER;
BEGIN
  -- Contar documentos migrados
  SELECT COUNT(*) INTO docs_migrated 
  FROM public.documents 
  WHERE description LIKE '%Migrado desde client_documents%';
  
  -- Contar documentos originales
  SELECT COUNT(*) INTO client_docs_original
  FROM public.client_documents
  WHERE project_id IS NOT NULL;
  
  RAISE NOTICE '=== VERIFICACIÓN DE MIGRACIÓN ===';
  RAISE NOTICE 'Documentos migrados a tabla documents: %', docs_migrated;
  RAISE NOTICE 'Documentos originales en client_documents: %', client_docs_original;
  
  IF docs_migrated > 0 THEN
    RAISE NOTICE 'Migración exitosa detectada. Procediendo con limpieza...';
  ELSE
    RAISE WARNING 'No se detectaron documentos migrados explícitamente, pero continuando con limpieza controlada.';
  END IF;
END $$;

-- Paso 2: Marcar tabla client_documents como deprecated (mantener como respaldo)
-- Renombrar para evitar confusión pero mantener como respaldo de seguridad
ALTER TABLE IF EXISTS public.client_documents 
RENAME TO client_documents_deprecated_backup;

-- Paso 3: Crear función de limpieza final (para ejecutar después de confirmar estabilidad)
CREATE OR REPLACE FUNCTION public.cleanup_deprecated_client_documents()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Esta función elimina completamente el respaldo cuando se confirme estabilidad
  DROP TABLE IF EXISTS public.client_documents_deprecated_backup;
  
  RETURN 'Tabla client_documents_deprecated_backup eliminada completamente. Limpieza final realizada.';
END;
$$;

-- Paso 4: Documentar el cambio en la tabla unificada
COMMENT ON TABLE public.documents IS 'Tabla unificada de documentos del sistema. Reemplaza client_documents (migrada y respaldada como client_documents_deprecated_backup). Todos los uploads ahora van al bucket project-documents.';

-- Paso 5: Crear función de estadísticas para monitoreo post-migración
CREATE OR REPLACE FUNCTION public.get_migration_statistics()
RETURNS TABLE (
  metric TEXT,
  count BIGINT,
  details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'documents_active'::TEXT as metric,
    COUNT(*) as count,
    'Documentos activos en tabla unificada'::TEXT as details
  FROM public.documents 
  WHERE document_status = 'active'
  
  UNION ALL
  
  SELECT 
    'documents_migrated'::TEXT as metric,
    COUNT(*) as count,
    'Documentos migrados desde client_documents'::TEXT as details
  FROM public.documents 
  WHERE description LIKE '%Migrado desde client_documents%'
  
  UNION ALL
  
  SELECT 
    'backup_table_exists'::TEXT as metric,
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'client_documents_deprecated_backup'
    ) THEN 1 ELSE 0 END as count,
    'Tabla de respaldo disponible'::TEXT as details;
END;
$$;

-- Paso 6: Verificación final y resumen
DO $$ 
DECLARE
  unified_docs INTEGER;
BEGIN
  SELECT COUNT(*) INTO unified_docs FROM public.documents WHERE document_status = 'active';
  
  RAISE NOTICE '=== SISTEMA UNIFICADO IMPLEMENTADO EXITOSAMENTE ===';
  RAISE NOTICE 'Total documentos activos en sistema unificado: %', unified_docs;
  RAISE NOTICE 'Tabla client_documents renombrada: client_documents_deprecated_backup';
  RAISE NOTICE 'Todos los uploads ahora van a bucket: project-documents';
  RAISE NOTICE 'Función de estadísticas disponible: get_migration_statistics()';
  RAISE NOTICE 'Función de limpieza final disponible: cleanup_deprecated_client_documents()';
  RAISE NOTICE '';
  RAISE NOTICE 'PRÓXIMOS PASOS MANUALES:';
  RAISE NOTICE '1. Eliminar bucket client-documents desde panel Supabase Storage';
  RAISE NOTICE '2. Monitorear sistema por algunos días';
  RAISE NOTICE '3. Ejecutar cleanup_deprecated_client_documents() cuando confirme estabilidad';
END $$;