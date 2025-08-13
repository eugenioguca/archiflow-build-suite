-- FASE 2: MEJORAS DE ROBUSTEZ - Función para eliminación masiva con transacciones atómicas

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

  -- Verificar que las transacciones existan y obtener información para auditoría
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
    -- Verificar integridad referencial antes de eliminar
    IF EXISTS (
      SELECT 1 FROM payment_complements 
      WHERE id IN (
        SELECT unnest(
          ARRAY(
            SELECT jsonb_array_elements_text(metadata->'transaction_references')
            FROM unified_financial_transactions 
            WHERE id = ANY(transaction_ids)
            AND metadata ? 'transaction_references'
          )
        )::uuid[]
      )
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'No se pueden eliminar transacciones que tienen complementos de pago asociados',
        'deleted_count', 0
      );
    END IF;

    -- Eliminar las transacciones
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

-- Función para eliminación segura de registros del catálogo de cuentas
CREATE OR REPLACE FUNCTION public.safe_delete_chart_account(table_name text, record_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  user_profile RECORD;
  dependencies_count integer := 0;
  result jsonb;
BEGIN
  -- Obtener perfil del usuario
  SELECT role, department_enum, position_enum INTO user_profile
  FROM profiles
  WHERE user_id = auth.uid();
  
  -- Solo admins y contabilidad pueden eliminar registros del catálogo
  IF NOT (user_profile.role = 'admin' OR 
          (user_profile.role = 'employee' AND user_profile.department_enum = 'contabilidad')) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No tienes permisos para eliminar registros del catálogo de cuentas'
    );
  END IF;
  
  -- Verificar dependencias según el tipo de tabla
  IF table_name = 'chart_of_accounts_mayor' THEN
    SELECT COUNT(*) INTO dependencies_count
    FROM chart_of_accounts_partidas 
    WHERE mayor_id = record_id;
    
    IF dependencies_count > 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('No se puede eliminar el mayor porque tiene %s partidas asociadas', dependencies_count)
      );
    END IF;
    
    -- Verificar si hay transacciones que usan este mayor
    SELECT COUNT(*) INTO dependencies_count
    FROM unified_financial_transactions 
    WHERE mayor_id = record_id;
    
    IF dependencies_count > 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('No se puede eliminar el mayor porque tiene %s transacciones asociadas', dependencies_count)
      );
    END IF;
    
  ELSIF table_name = 'chart_of_accounts_partidas' THEN
    SELECT COUNT(*) INTO dependencies_count
    FROM chart_of_accounts_subpartidas 
    WHERE partida_id = record_id;
    
    IF dependencies_count > 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('No se puede eliminar la partida porque tiene %s subpartidas asociadas', dependencies_count)
      );
    END IF;
    
    -- Verificar si hay transacciones que usan esta partida
    SELECT COUNT(*) INTO dependencies_count
    FROM unified_financial_transactions 
    WHERE partida_id = record_id;
    
    IF dependencies_count > 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('No se puede eliminar la partida porque tiene %s transacciones asociadas', dependencies_count)
      );
    END IF;
    
  ELSIF table_name = 'chart_of_accounts_subpartidas' THEN
    -- Verificar si hay transacciones que usan esta subpartida
    SELECT COUNT(*) INTO dependencies_count
    FROM unified_financial_transactions 
    WHERE subpartida_id = record_id;
    
    IF dependencies_count > 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('No se puede eliminar la subpartida porque tiene %s transacciones asociadas', dependencies_count)
      );
    END IF;
  END IF;
  
  -- Si llegamos aquí, es seguro eliminar
  BEGIN
    EXECUTE format('DELETE FROM %I WHERE id = $1', table_name) USING record_id;
    
    -- Log de auditoría
    PERFORM log_security_event(
      'chart_account_deleted',
      jsonb_build_object(
        'table_name', table_name,
        'record_id', record_id,
        'user_role', user_profile.role,
        'user_department', user_profile.department_enum
      )
    );
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Registro eliminado exitosamente'
    );
    
  EXCEPTION WHEN OTHERS THEN
    PERFORM log_security_event(
      'chart_account_delete_error',
      jsonb_build_object(
        'table_name', table_name,
        'record_id', record_id,
        'error_message', SQLERRM
      )
    );
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Error al eliminar: ' || SQLERRM
    );
  END;
END;
$function$;