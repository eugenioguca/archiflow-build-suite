-- Step 1: Convert department_permissions position column to text first
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'department_permissions') THEN
    -- Change column to text first
    ALTER TABLE public.department_permissions 
    ALTER COLUMN position TYPE text;
    
    -- Now update the text values
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

-- Step 2: Now recreate the enum safely
ALTER TYPE position_hierarchy RENAME TO position_hierarchy_old;

CREATE TYPE position_hierarchy AS ENUM (
  'director',
  'gerente',
  'coordinador',
  'supervisor',
  'especialista',
  'auxiliar'
);

-- Step 3: Update all tables to use the new enum
ALTER TABLE public.profiles 
ALTER COLUMN position_enum TYPE position_hierarchy 
USING position_enum::text::position_hierarchy;

-- Update department_permissions table back to enum
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'department_permissions') THEN
    ALTER TABLE public.department_permissions 
    ALTER COLUMN position TYPE position_hierarchy 
    USING position::text::position_hierarchy;
  END IF;
END $$;

-- Step 4: Drop the old enum
DROP TYPE position_hierarchy_old CASCADE;