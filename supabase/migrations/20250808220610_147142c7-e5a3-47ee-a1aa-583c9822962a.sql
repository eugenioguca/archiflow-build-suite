-- Handle the unique constraint by removing potential duplicates first
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'department_permissions') THEN
    -- Convert to text first
    ALTER TABLE public.department_permissions 
    ALTER COLUMN position TYPE text;
    
    -- Delete records that would create duplicates after mapping
    DELETE FROM public.department_permissions 
    WHERE (department, position, module_name) IN (
      SELECT department, 'gerente', module_name
      FROM public.department_permissions 
      WHERE position = 'jefatura'
      AND (department, 'gerente', module_name) IN (
        SELECT department, position, module_name 
        FROM public.department_permissions 
        WHERE position = 'gerente'
      )
    ) AND position = 'jefatura';
    
    -- Delete records that would create duplicates for coordinador mapping
    DELETE FROM public.department_permissions 
    WHERE (department, position, module_name) IN (
      SELECT department, 'coordinador', module_name
      FROM public.department_permissions 
      WHERE position = 'coordinacion'
      AND (department, 'coordinador', module_name) IN (
        SELECT department, position, module_name 
        FROM public.department_permissions 
        WHERE position = 'coordinador'
      )
    ) AND position = 'coordinacion';
    
    -- Delete records that would create duplicates for supervisor mapping
    DELETE FROM public.department_permissions 
    WHERE (department, position, module_name) IN (
      SELECT department, 'supervisor', module_name
      FROM public.department_permissions 
      WHERE position = 'supervision'
      AND (department, 'supervisor', module_name) IN (
        SELECT department, position, module_name 
        FROM public.department_permissions 
        WHERE position = 'supervisor'
      )
    ) AND position = 'supervision';
    
    -- Delete records that would create duplicates for director mapping
    DELETE FROM public.department_permissions 
    WHERE (department, position, module_name) IN (
      SELECT department, 'director', module_name
      FROM public.department_permissions 
      WHERE position = 'direccion_general'
      AND (department, 'director', module_name) IN (
        SELECT department, position, module_name 
        FROM public.department_permissions 
        WHERE position = 'director'
      )
    ) AND position = 'direccion_general';
    
    -- Now safely update the remaining records
    UPDATE public.department_permissions 
    SET position = CASE 
      WHEN position = 'direccion_general' THEN 'director'
      WHEN position = 'jefatura' THEN 'gerente'
      WHEN position = 'coordinacion' THEN 'coordinador'
      WHEN position = 'supervision' THEN 'supervisor'
      ELSE position
    END;
  END IF;
END $$;