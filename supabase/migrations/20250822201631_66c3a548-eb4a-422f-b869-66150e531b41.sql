-- Update validate_import_departments to preserve original casing
CREATE OR REPLACE FUNCTION public.validate_import_departments(departments text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  dept text;
  normalized_name text;
  existing_dept_name text;
  new_departments jsonb := '[]'::jsonb;
  existing_departments jsonb := '[]'::jsonb;
  invalid_departments jsonb := '[]'::jsonb;
BEGIN
  FOREACH dept IN ARRAY departments
  LOOP
    -- Skip empty or null departments
    IF dept IS NULL OR TRIM(dept) = '' THEN
      CONTINUE;
    END IF;
    
    -- Normalize only for comparison (lowercase, trim, handle variations)
    normalized_name := TRIM(LOWER(dept));
    normalized_name := CASE 
      WHEN normalized_name IN ('ventas', 'venta', 'comercial') THEN 'ventas'
      WHEN normalized_name IN ('administracion', 'admin', 'administrativo') THEN 'administracion'
      WHEN normalized_name IN ('operaciones', 'operacion', 'ops') THEN 'operaciones'
      WHEN normalized_name IN ('finanzas', 'financiero', 'contabilidad') THEN 'finanzas'
      WHEN normalized_name IN ('construccion', 'obra', 'construcción') THEN 'construccion'
      WHEN normalized_name IN ('diseno', 'diseño', 'design') THEN 'diseno'
      WHEN normalized_name IN ('general', 'corporativo') THEN 'general'
      ELSE normalized_name
    END;
    
    -- Check if department exists using normalized comparison
    SELECT departamento INTO existing_dept_name
    FROM public.chart_of_accounts_departamentos
    WHERE LOWER(TRIM(departamento)) = normalized_name
    LIMIT 1;
    
    -- Validate department name format
    IF LENGTH(TRIM(dept)) < 2 THEN
      invalid_departments := invalid_departments || jsonb_build_object(
        'original', dept,
        'reason', 'Nombre demasiado corto (mínimo 2 caracteres)'
      );
    ELSIF existing_dept_name IS NOT NULL THEN
      -- Use existing name from database (preserve original format from DB)
      existing_departments := existing_departments || jsonb_build_object(
        'original', dept,
        'existing', existing_dept_name
      );
    ELSE
      -- New department - preserve original format from Excel
      new_departments := new_departments || jsonb_build_object(
        'original', dept,
        'normalized', dept  -- Keep original format, don't normalize
      );
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'new_departments', new_departments,
    'existing_departments', existing_departments,
    'invalid_departments', invalid_departments
  );
END;
$function$;

-- Update ensure_department_exists to preserve original casing
CREATE OR REPLACE FUNCTION public.ensure_department_exists(dept_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  dept_id uuid;
  normalized_name text;
BEGIN
  -- Normalize department name only for comparison (trim, lowercase, handle common variations)
  normalized_name := TRIM(LOWER(dept_name));
  
  -- Handle common variations for comparison only
  normalized_name := CASE 
    WHEN normalized_name IN ('ventas', 'venta', 'comercial') THEN 'ventas'
    WHEN normalized_name IN ('administracion', 'admin', 'administrativo') THEN 'administracion'
    WHEN normalized_name IN ('operaciones', 'operacion', 'ops') THEN 'operaciones'
    WHEN normalized_name IN ('finanzas', 'financiero', 'contabilidad') THEN 'finanzas'
    WHEN normalized_name IN ('construccion', 'obra', 'construcción') THEN 'construccion'
    WHEN normalized_name IN ('diseno', 'diseño', 'design') THEN 'diseno'
    WHEN normalized_name IN ('general', 'corporativo') THEN 'general'
    ELSE normalized_name
  END;
  
  -- Try to find existing department using normalized comparison
  SELECT id INTO dept_id
  FROM public.chart_of_accounts_departamentos
  WHERE LOWER(TRIM(departamento)) = normalized_name
  LIMIT 1;
  
  -- If not found, create it with the ORIGINAL name (preserve Excel format)
  IF dept_id IS NULL THEN
    INSERT INTO public.chart_of_accounts_departamentos (
      departamento,
      activo,
      created_by
    ) VALUES (
      TRIM(dept_name),  -- Use original name from Excel, just trimmed
      true,
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    ) RETURNING id INTO dept_id;
  END IF;
  
  RETURN dept_id;
END;
$function$;