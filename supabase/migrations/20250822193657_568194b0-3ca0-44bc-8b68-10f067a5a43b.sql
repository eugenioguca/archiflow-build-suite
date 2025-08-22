-- Create RPC function for safe mass deletion of chart of accounts data
CREATE OR REPLACE FUNCTION public.safe_mass_delete_chart_accounts(
  table_name text, 
  record_ids uuid[]
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer := 0;
  error_message text := '';
  is_authorized boolean := false;
BEGIN
  -- Validate permissions using existing function
  SELECT public.validate_bulk_delete_permissions(table_name, record_ids) INTO is_authorized;
  
  IF NOT is_authorized THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No tiene permisos para realizar eliminación masiva',
      'deleted_count', 0
    );
  END IF;

  -- Validate table name to prevent SQL injection
  IF table_name NOT IN ('chart_of_accounts_departamentos', 'chart_of_accounts_mayor', 'chart_of_accounts_partidas', 'chart_of_accounts_subpartidas') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Tabla no válida para eliminación masiva',
      'deleted_count', 0
    );
  END IF;

  BEGIN
    -- Execute the deletion based on table name
    CASE table_name
      WHEN 'chart_of_accounts_departamentos' THEN
        DELETE FROM public.chart_of_accounts_departamentos WHERE id = ANY(record_ids);
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        
      WHEN 'chart_of_accounts_mayor' THEN
        DELETE FROM public.chart_of_accounts_mayor WHERE id = ANY(record_ids);
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        
      WHEN 'chart_of_accounts_partidas' THEN
        DELETE FROM public.chart_of_accounts_partidas WHERE id = ANY(record_ids);
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        
      WHEN 'chart_of_accounts_subpartidas' THEN
        DELETE FROM public.chart_of_accounts_subpartidas WHERE id = ANY(record_ids);
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
    END CASE;

    -- Log the successful operation
    PERFORM public.log_security_event(
      'mass_delete_success',
      jsonb_build_object(
        'table_name', table_name,
        'deleted_count', deleted_count,
        'record_ids_count', array_length(record_ids, 1)
      )
    );

    RETURN jsonb_build_object(
      'success', true,
      'deleted_count', deleted_count,
      'message', format('Se eliminaron %s registros exitosamente', deleted_count)
    );

  EXCEPTION WHEN OTHERS THEN
    error_message := SQLERRM;
    
    -- Log the error
    PERFORM public.log_security_event(
      'mass_delete_error',
      jsonb_build_object(
        'table_name', table_name,
        'error', error_message,
        'record_ids_count', array_length(record_ids, 1)
      )
    );

    RETURN jsonb_build_object(
      'success', false,
      'error', format('Error al eliminar registros: %s', error_message),
      'deleted_count', 0
    );
  END;
END;
$$;