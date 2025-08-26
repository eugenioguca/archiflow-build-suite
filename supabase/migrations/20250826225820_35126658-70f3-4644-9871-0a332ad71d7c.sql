-- Corregir función bulk_delete_unified_transactions eliminando verificación de metadata inexistente

CREATE OR REPLACE FUNCTION public.bulk_delete_unified_transactions(transaction_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  delete_count integer := 0;
  validation_result boolean := false;
  user_profile RECORD;
  result jsonb;
BEGIN
  -- Validar permisos usando la función creada anteriormente
  validation_result := validate_bulk_delete_permissions('unified_financial_transactions', transaction_ids);
  
  IF NOT validation_result THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No tienes permisos para realizar eliminaciones masivas',
      'deleted_count', 0
    );
  END IF;

  -- Verificar que las transacciones existan
  IF NOT EXISTS (
    SELECT 1 FROM unified_financial_transactions 
    WHERE id = ANY(transaction_ids)
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Una o más transacciones no existen',
      'deleted_count', 0
    );
  END IF;

  -- Realizar eliminación en transacción atómica
  BEGIN
    -- Eliminar las transacciones directamente
    DELETE FROM unified_financial_transactions 
    WHERE id = ANY(transaction_ids);
    
    GET DIAGNOSTICS delete_count = ROW_COUNT;
    
    -- Log de auditoría
    PERFORM log_security_event(
      'bulk_delete_completed',
      jsonb_build_object(
        'table_name', 'unified_financial_transactions',
        'deleted_count', delete_count,
        'transaction_ids', to_jsonb(transaction_ids)
      )
    );
    
    result := jsonb_build_object(
      'success', true,
      'deleted_count', delete_count,
      'message', 'Transacciones eliminadas exitosamente'
    );
    
    RETURN result;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log del error
    PERFORM log_security_event(
      'bulk_delete_error',
      jsonb_build_object(
        'table_name', 'unified_financial_transactions',
        'error_message', SQLERRM,
        'transaction_ids', to_jsonb(transaction_ids)
      )
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Error interno: ' || SQLERRM,
      'deleted_count', 0
    );
  END;
END;
$function$;