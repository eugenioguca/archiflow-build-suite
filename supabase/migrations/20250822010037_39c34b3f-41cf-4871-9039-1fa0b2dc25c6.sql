-- Remove the rigid check constraint on chart_of_accounts_mayor that causes import failures
ALTER TABLE public.chart_of_accounts_mayor 
DROP CONSTRAINT IF EXISTS chart_of_accounts_mayor_departamento_check;

-- Create a function to auto-create departments during import
CREATE OR REPLACE FUNCTION public.ensure_department_exists(dept_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  dept_id uuid;
  normalized_name text;
BEGIN
  -- Normalize department name (trim, lowercase, handle common variations)
  normalized_name := TRIM(LOWER(dept_name));
  
  -- Handle common variations
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
  
  -- Try to find existing department
  SELECT id INTO dept_id
  FROM public.chart_of_accounts_departamentos
  WHERE LOWER(TRIM(departamento)) = normalized_name
  LIMIT 1;
  
  -- If not found, create it
  IF dept_id IS NULL THEN
    INSERT INTO public.chart_of_accounts_departamentos (
      departamento,
      activo,
      created_by
    ) VALUES (
      normalized_name,
      true,
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    ) RETURNING id INTO dept_id;
  END IF;
  
  RETURN dept_id;
END;
$$;

-- Create a function to validate and normalize department data before import
CREATE OR REPLACE FUNCTION public.validate_import_departments(departments text[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  dept text;
  normalized_name text;
  validation_result jsonb := '{"existing": [], "new": [], "invalid": []}'::jsonb;
  existing_dept record;
BEGIN
  FOREACH dept IN ARRAY departments
  LOOP
    -- Skip empty or null departments
    IF dept IS NULL OR TRIM(dept) = '' THEN
      CONTINUE;
    END IF;
    
    -- Normalize department name
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
    
    -- Check if department exists
    SELECT departamento INTO existing_dept
    FROM public.chart_of_accounts_departamentos
    WHERE LOWER(TRIM(departamento)) = normalized_name
    LIMIT 1;
    
    IF FOUND THEN
      validation_result := jsonb_set(
        validation_result, 
        '{existing}', 
        validation_result->'existing' || jsonb_build_object('original', dept, 'normalized', normalized_name)
      );
    ELSE
      -- Validate department name format
      IF LENGTH(normalized_name) < 2 OR LENGTH(normalized_name) > 50 THEN
        validation_result := jsonb_set(
          validation_result, 
          '{invalid}', 
          validation_result->'invalid' || jsonb_build_object(
            'original', dept, 
            'reason', 'Nombre debe tener entre 2 y 50 caracteres'
          )
        );
      ELSE
        validation_result := jsonb_set(
          validation_result, 
          '{new}', 
          validation_result->'new' || jsonb_build_object('original', dept, 'normalized', normalized_name)
        );
      END IF;
    END IF;
  END LOOP;
  
  RETURN validation_result;
END;
$$;