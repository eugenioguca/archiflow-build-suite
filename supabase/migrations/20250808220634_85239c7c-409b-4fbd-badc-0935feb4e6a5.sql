-- Temporarily drop the department_permissions table to avoid conflicts
DROP TABLE IF EXISTS public.department_permissions CASCADE;

-- Now recreate the enum safely
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

-- Drop the old enum
DROP TYPE position_hierarchy_old CASCADE;