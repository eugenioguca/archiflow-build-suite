-- Eliminar el constraint hardcodeado actual
ALTER TABLE public.unified_financial_transactions 
DROP CONSTRAINT IF EXISTS unified_financial_transactions_departamento_check;

-- Función para validar departamento dinámicamente
CREATE OR REPLACE FUNCTION public.validate_departamento(departamento_value text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verificar que el departamento existe y está activo en el catálogo
  RETURN EXISTS (
    SELECT 1 
    FROM public.chart_of_accounts_departamentos 
    WHERE departamento = departamento_value 
    AND activo = true
  );
END;
$function$;

-- Función para validar mayor dinámicamente
CREATE OR REPLACE FUNCTION public.validate_mayor(mayor_id_value uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verificar que el mayor existe y está activo en el catálogo
  RETURN EXISTS (
    SELECT 1 
    FROM public.chart_of_accounts_mayor 
    WHERE id = mayor_id_value 
    AND activo = true
  );
END;
$function$;

-- Función para validar partida dinámicamente
CREATE OR REPLACE FUNCTION public.validate_partida(partida_id_value uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verificar que la partida existe y está activa en el catálogo
  RETURN EXISTS (
    SELECT 1 
    FROM public.chart_of_accounts_partidas 
    WHERE id = partida_id_value 
    AND activo = true
  );
END;
$function$;

-- Función para validar subpartida dinámicamente
CREATE OR REPLACE FUNCTION public.validate_subpartida(subpartida_id_value uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verificar que la subpartida existe y está activa en el catálogo
  RETURN EXISTS (
    SELECT 1 
    FROM public.chart_of_accounts_subpartidas 
    WHERE id = subpartida_id_value 
    AND activo = true
  );
END;
$function$;

-- Función de validación integral para transacciones unificadas
CREATE OR REPLACE FUNCTION public.validate_unified_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validar departamento (obligatorio)
  IF NEW.departamento IS NOT NULL AND NOT public.validate_departamento(NEW.departamento) THEN
    RAISE EXCEPTION 'El departamento "%" no existe o no está activo en el catálogo de cuentas', NEW.departamento;
  END IF;

  -- Validar mayor (si se proporciona)
  IF NEW.mayor_id IS NOT NULL AND NOT public.validate_mayor(NEW.mayor_id) THEN
    RAISE EXCEPTION 'El mayor seleccionado no existe o no está activo en el catálogo de cuentas';
  END IF;

  -- Validar partida (si se proporciona)
  IF NEW.partida_id IS NOT NULL AND NOT public.validate_partida(NEW.partida_id) THEN
    RAISE EXCEPTION 'La partida seleccionada no existe o no está activa en el catálogo de cuentas';
  END IF;

  -- Validar subpartida (si se proporciona)
  IF NEW.subpartida_id IS NOT NULL AND NOT public.validate_subpartida(NEW.subpartida_id) THEN
    RAISE EXCEPTION 'La subpartida seleccionada no existe o no está activa en el catálogo de cuentas';
  END IF;

  -- Validar integridad jerárquica: si hay partida, debe haber mayor
  IF NEW.partida_id IS NOT NULL AND NEW.mayor_id IS NULL THEN
    RAISE EXCEPTION 'Debe seleccionar un Mayor antes de seleccionar una Partida';
  END IF;

  -- Validar integridad jerárquica: si hay subpartida, debe haber partida
  IF NEW.subpartida_id IS NOT NULL AND NEW.partida_id IS NULL THEN
    RAISE EXCEPTION 'Debe seleccionar una Partida antes de seleccionar una Subpartida';
  END IF;

  -- Validar que la partida pertenece al mayor seleccionado
  IF NEW.mayor_id IS NOT NULL AND NEW.partida_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 
      FROM public.chart_of_accounts_partidas p
      WHERE p.id = NEW.partida_id 
      AND p.mayor_id = NEW.mayor_id
    ) THEN
      RAISE EXCEPTION 'La partida seleccionada no pertenece al mayor seleccionado';
    END IF;
  END IF;

  -- Validar que la subpartida pertenece a la partida seleccionada o es global del departamento
  IF NEW.partida_id IS NOT NULL AND NEW.subpartida_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 
      FROM public.chart_of_accounts_subpartidas s
      WHERE s.id = NEW.subpartida_id 
      AND (
        s.partida_id = NEW.partida_id OR 
        (s.es_global = true AND s.departamento_aplicable = NEW.departamento)
      )
    ) THEN
      RAISE EXCEPTION 'La subpartida seleccionada no es válida para la partida y departamento seleccionados';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Crear trigger para validar transacciones antes de insertar/actualizar
DROP TRIGGER IF EXISTS validate_unified_transaction_trigger ON public.unified_financial_transactions;
CREATE TRIGGER validate_unified_transaction_trigger
  BEFORE INSERT OR UPDATE ON public.unified_financial_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_unified_transaction();

-- Función para sincronizar automáticamente cuando se modifique el catálogo
CREATE OR REPLACE FUNCTION public.sync_catalog_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Cuando se desactiva un elemento del catálogo, registrar en logs
  IF TG_OP = 'UPDATE' AND OLD.activo = true AND NEW.activo = false THEN
    -- Log del cambio para auditoria
    INSERT INTO public.security_audit_log (
      event_type,
      user_id,
      event_data
    ) VALUES (
      'catalog_item_deactivated',
      auth.uid(),
      jsonb_build_object(
        'table', TG_TABLE_NAME,
        'item_id', NEW.id,
        'item_name', COALESCE(NEW.nombre, NEW.departamento),
        'deactivated_at', now()
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Aplicar triggers de sincronización a todas las tablas del catálogo
DROP TRIGGER IF EXISTS sync_departamentos_changes ON public.chart_of_accounts_departamentos;
CREATE TRIGGER sync_departamentos_changes
  AFTER UPDATE ON public.chart_of_accounts_departamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_catalog_changes();

DROP TRIGGER IF EXISTS sync_mayores_changes ON public.chart_of_accounts_mayor;
CREATE TRIGGER sync_mayores_changes
  AFTER UPDATE ON public.chart_of_accounts_mayor
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_catalog_changes();

DROP TRIGGER IF EXISTS sync_partidas_changes ON public.chart_of_accounts_partidas;
CREATE TRIGGER sync_partidas_changes
  AFTER UPDATE ON public.chart_of_accounts_partidas
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_catalog_changes();

DROP TRIGGER IF EXISTS sync_subpartidas_changes ON public.chart_of_accounts_subpartidas;
CREATE TRIGGER sync_subpartidas_changes
  AFTER UPDATE ON public.chart_of_accounts_subpartidas
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_catalog_changes();