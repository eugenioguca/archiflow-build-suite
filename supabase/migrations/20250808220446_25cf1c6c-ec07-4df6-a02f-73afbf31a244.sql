-- Check if department_permissions table exists and what it contains
DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'department_permissions') THEN
    -- Update any references to direccion_general in department_permissions
    UPDATE public.department_permissions 
    SET position = 'director' 
    WHERE position = 'direccion_general';
  END IF;
END $$;

-- Now safely recreate the enum
ALTER TYPE position_hierarchy RENAME TO position_hierarchy_old;

CREATE TYPE position_hierarchy AS ENUM (
  'director',
  'gerente',
  'coordinador',
  'supervisor',
  'especialista',
  'auxiliar'
);

-- Update the profiles table to use the new enum
ALTER TABLE public.profiles 
ALTER COLUMN position_enum TYPE position_hierarchy 
USING position_enum::text::position_hierarchy;

-- Update department_permissions table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'department_permissions') THEN
    ALTER TABLE public.department_permissions 
    ALTER COLUMN position TYPE position_hierarchy 
    USING position::text::position_hierarchy;
  END IF;
END $$;

-- Drop the old enum
DROP TYPE position_hierarchy_old CASCADE;