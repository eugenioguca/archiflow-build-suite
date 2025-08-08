-- Remove direccion_general from position_hierarchy enum
-- Since we've migrated all users, we can now safely recreate the enum without direccion_general
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
DROP TYPE position_hierarchy_old;