-- Migrar datos existentes usando los tipos correctos
UPDATE public.profiles 
SET 
  department_enum = CASE 
    WHEN department = 'ventas' THEN 'ventas'::department_type
    WHEN department = 'diseño' THEN 'diseño'::department_type
    WHEN department = 'construcción' THEN 'construcción'::department_type
    WHEN department = 'finanzas' THEN 'finanzas'::department_type
    WHEN department = 'contabilidad' THEN 'contabilidad'::department_type
    ELSE NULL
  END,
  position_enum = CASE 
    WHEN position = 'director' THEN 'director'::position_hierarchy
    WHEN position = 'gerente' THEN 'gerente'::position_hierarchy
    WHEN position = 'jefatura' THEN 'jefatura'::position_hierarchy
    WHEN position = 'analista' THEN 'analista'::position_hierarchy
    WHEN position = 'auxiliar' THEN 'auxiliar'::position_hierarchy
    ELSE NULL
  END
WHERE department_enum IS NULL OR position_enum IS NULL;