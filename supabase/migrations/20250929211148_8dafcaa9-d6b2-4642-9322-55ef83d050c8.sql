-- Función para importación atómica de conceptos en Planning v2
-- Si cualquier fila falla, toda la transacción se revierte
CREATE OR REPLACE FUNCTION planning_v2_bulk_import(
  _budget_id UUID,
  _partida_name TEXT,
  _conceptos JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _partida_id UUID;
  _concepto JSONB;
  _result JSONB;
  _imported_count INTEGER := 0;
  _user_id UUID;
BEGIN
  -- Obtener usuario actual
  SELECT auth.uid() INTO _user_id;
  
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Lock para evitar conflictos concurrentes
  PERFORM pg_advisory_xact_lock(987654321);
  
  -- Validar que el presupuesto existe y el usuario tiene acceso
  IF NOT EXISTS (
    SELECT 1 FROM planning_budgets 
    WHERE id = _budget_id 
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = _user_id
      AND p.role IN ('admin', 'employee')
    )
  ) THEN
    RAISE EXCEPTION 'Presupuesto no encontrado o sin permisos';
  END IF;
  
  -- Crear o buscar la partida
  SELECT id INTO _partida_id
  FROM planning_partidas
  WHERE budget_id = _budget_id
  AND name = _partida_name;
  
  IF _partida_id IS NULL THEN
    -- Crear nueva partida
    INSERT INTO planning_partidas (budget_id, name, order_index, active)
    VALUES (
      _budget_id,
      _partida_name,
      COALESCE((SELECT MAX(order_index) + 1 FROM planning_partidas WHERE budget_id = _budget_id), 0),
      true
    )
    RETURNING id INTO _partida_id;
  END IF;
  
  -- Insertar conceptos uno por uno
  FOR _concepto IN SELECT * FROM jsonb_array_elements(_conceptos)
  LOOP
    INSERT INTO planning_conceptos (
      partida_id,
      code,
      short_description,
      long_description,
      unit,
      provider,
      cantidad_real,
      desperdicio_pct,
      precio_real,
      honorarios_pct,
      wbs_code,
      active,
      sumable,
      order_index
    ) VALUES (
      _partida_id,
      (_concepto->>'code'),
      (_concepto->>'short_description'),
      (_concepto->>'long_description'),
      (_concepto->>'unit'),
      (_concepto->>'provider'),
      COALESCE((_concepto->>'cantidad_real')::NUMERIC, 0),
      COALESCE((_concepto->>'desperdicio_pct')::NUMERIC, 0),
      COALESCE((_concepto->>'precio_real')::NUMERIC, 0),
      COALESCE((_concepto->>'honorarios_pct')::NUMERIC, 0),
      (_concepto->>'wbs_code'),
      COALESCE((_concepto->>'active')::BOOLEAN, true),
      COALESCE((_concepto->>'sumable')::BOOLEAN, true),
      COALESCE((_concepto->>'order_index')::INTEGER, _imported_count)
    );
    
    _imported_count := _imported_count + 1;
  END LOOP;
  
  -- Retornar resultado exitoso
  _result := jsonb_build_object(
    'success', true,
    'imported_count', _imported_count,
    'partida_id', _partida_id,
    'message', format('Se importaron %s conceptos correctamente', _imported_count)
  );
  
  RETURN _result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- En caso de error, la transacción se revierte automáticamente
    RAISE EXCEPTION 'Error en importación: %', SQLERRM;
END;
$$;