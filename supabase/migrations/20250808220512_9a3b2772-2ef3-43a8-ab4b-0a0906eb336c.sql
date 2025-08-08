-- First, let's see what values exist in department_permissions
DO $$
BEGIN
  -- Check if table exists and update all legacy position values
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'department_permissions') THEN
    -- Map all legacy position values to new ones
    UPDATE public.department_permissions 
    SET position = CASE 
      WHEN position = 'direccion_general' THEN 'director'
      WHEN position = 'jefatura' THEN 'gerente'  -- Map jefatura to gerente
      WHEN position = 'coordinacion' THEN 'coordinador'
      WHEN position = 'supervision' THEN 'supervisor'
      ELSE position::text
    END;
  END IF;
END $$;