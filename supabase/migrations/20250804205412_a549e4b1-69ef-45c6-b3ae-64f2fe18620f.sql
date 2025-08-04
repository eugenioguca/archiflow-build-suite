-- Crear los tipos enum necesarios
CREATE TYPE department_enum AS ENUM ('ventas', 'diseño', 'construcción', 'finanzas', 'contabilidad');
CREATE TYPE position_enum AS ENUM ('director', 'gerente', 'jefatura', 'analista', 'auxiliar');

-- Migrar datos existentes de department/position a department_enum/position_enum
UPDATE public.profiles 
SET 
  department_enum = CASE 
    WHEN department = 'ventas' THEN 'ventas'::department_enum
    WHEN department = 'diseño' THEN 'diseño'::department_enum
    WHEN department = 'construcción' THEN 'construcción'::department_enum
    WHEN department = 'finanzas' THEN 'finanzas'::department_enum
    WHEN department = 'contabilidad' THEN 'contabilidad'::department_enum
    ELSE NULL
  END,
  position_enum = CASE 
    WHEN position = 'director' THEN 'director'::position_enum
    WHEN position = 'gerente' THEN 'gerente'::position_enum
    WHEN position = 'jefatura' THEN 'jefatura'::position_enum
    WHEN position = 'analista' THEN 'analista'::position_enum
    WHEN position = 'auxiliar' THEN 'auxiliar'::position_enum
    ELSE NULL
  END
WHERE department_enum IS NULL OR position_enum IS NULL;