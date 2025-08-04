-- Create hierarchical permission system while preserving existing client-project architecture

-- Create enums for departments and positions
CREATE TYPE public.department_type AS ENUM ('ventas', 'diseño', 'construcción', 'finanzas', 'contabilidad');
CREATE TYPE public.position_hierarchy AS ENUM ('direccion_general', 'director', 'gerente', 'jefatura', 'analista', 'auxiliar');

-- Add new columns with the enum types (temporary names)
ALTER TABLE public.profiles 
ADD COLUMN department_enum department_type,
ADD COLUMN position_enum position_hierarchy,
ADD COLUMN immediate_supervisor_id UUID REFERENCES public.profiles(id),
ADD COLUMN hire_date DATE DEFAULT CURRENT_DATE;

-- Update existing admin users to have direccion_general position
UPDATE public.profiles 
SET position_enum = 'direccion_general', department_enum = 'finanzas' 
WHERE role = 'admin';

-- Create user branch assignments table for multi-branch employees
CREATE TABLE public.user_branch_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  branch_office_id UUID NOT NULL REFERENCES public.branch_offices(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  UNIQUE(user_id, branch_office_id)
);

-- Enable RLS on user_branch_assignments
ALTER TABLE public.user_branch_assignments ENABLE ROW LEVEL SECURITY;

-- Create policy for user_branch_assignments
CREATE POLICY "Employees and admins can manage user branch assignments" ON public.user_branch_assignments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
  )
);

-- Create department permissions table
CREATE TABLE public.department_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department department_type NOT NULL,
  position position_hierarchy NOT NULL,
  module_name TEXT NOT NULL,
  can_access BOOLEAN DEFAULT true,
  can_view_all_branches BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(department, position, module_name)
);

-- Enable RLS on department_permissions
ALTER TABLE public.department_permissions ENABLE ROW LEVEL SECURITY;

-- Create policy for department_permissions
CREATE POLICY "Admins can manage department permissions" ON public.department_permissions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'::user_role
  )
);

-- Insert default permission matrix
INSERT INTO public.department_permissions (department, position, module_name, can_access, can_view_all_branches) VALUES
-- Directors permissions
('ventas', 'director', 'dashboard', true, true),
('ventas', 'director', 'clients', true, true),
('ventas', 'director', 'sales', true, true),
('ventas', 'director', 'design', true, true),
('ventas', 'director', 'construction', true, true),
('ventas', 'director', 'suppliers', true, true),
('ventas', 'director', 'client_portal_preview', true, true),

('diseño', 'director', 'dashboard', true, true),
('diseño', 'director', 'clients', true, true),
('diseño', 'director', 'sales', true, true),
('diseño', 'director', 'design', true, true),
('diseño', 'director', 'construction', true, true),
('diseño', 'director', 'suppliers', true, true),
('diseño', 'director', 'client_portal_preview', true, true),

('construcción', 'director', 'dashboard', true, true),
('construcción', 'director', 'clients', true, true),
('construcción', 'director', 'sales', true, true),
('construcción', 'director', 'design', true, true),
('construcción', 'director', 'construction', true, true),
('construcción', 'director', 'suppliers', true, true),
('construcción', 'director', 'client_portal_preview', true, true),

-- Finance and Accounting Directors - full access except tools
('finanzas', 'director', 'dashboard', true, true),
('finanzas', 'director', 'clients', true, true),
('finanzas', 'director', 'sales', true, true),
('finanzas', 'director', 'design', true, true),
('finanzas', 'director', 'construction', true, true),
('finanzas', 'director', 'suppliers', true, true),
('finanzas', 'director', 'finances', true, true),
('finanzas', 'director', 'accounting', true, true),

('contabilidad', 'director', 'dashboard', true, true),
('contabilidad', 'director', 'clients', true, true),
('contabilidad', 'director', 'sales', true, true),
('contabilidad', 'director', 'design', true, true),
('contabilidad', 'director', 'construction', true, true),
('contabilidad', 'director', 'suppliers', true, true),
('contabilidad', 'director', 'finances', true, true),
('contabilidad', 'director', 'accounting', true, true);

-- Add permissions for other positions (gerente, jefatura, analista, auxiliar)
-- Sales, Design, Construction departments - branch filtered
INSERT INTO public.department_permissions (department, position, module_name, can_access, can_view_all_branches)
SELECT dept, pos, module, true, false
FROM (VALUES 
  ('ventas'::department_type), ('diseño'::department_type), ('construcción'::department_type)
) AS depts(dept)
CROSS JOIN (VALUES 
  ('gerente'::position_hierarchy), ('jefatura'::position_hierarchy), ('analista'::position_hierarchy), ('auxiliar'::position_hierarchy)
) AS positions(pos)
CROSS JOIN (VALUES 
  ('dashboard'), ('clients'), ('sales'), ('design'), ('construction'), ('suppliers'), ('client_portal_preview')
) AS modules(module);

-- Finance and Accounting - full access except tools
INSERT INTO public.department_permissions (department, position, module_name, can_access, can_view_all_branches)
SELECT dept, pos, module, true, true
FROM (VALUES 
  ('finanzas'::department_type), ('contabilidad'::department_type)
) AS depts(dept)
CROSS JOIN (VALUES 
  ('gerente'::position_hierarchy), ('jefatura'::position_hierarchy), ('analista'::position_hierarchy), ('auxiliar'::position_hierarchy)
) AS positions(pos)
CROSS JOIN (VALUES 
  ('dashboard'), ('clients'), ('sales'), ('design'), ('construction'), ('suppliers'), ('finances'), ('accounting')
) AS modules(module);

-- Create function to check user permissions
CREATE OR REPLACE FUNCTION public.has_module_permission(_user_id UUID, _module TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_profile RECORD;
BEGIN
  -- Get user profile
  SELECT p.role, p.department_enum, p.position_enum INTO user_profile
  FROM public.profiles p
  WHERE p.user_id = _user_id;
  
  -- Admins have access to everything
  IF user_profile.role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Clients only have client access
  IF user_profile.role = 'client' THEN
    RETURN _module = 'client_portal';
  END IF;
  
  -- If no department/position assigned, deny access
  IF user_profile.department_enum IS NULL OR user_profile.position_enum IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check department permissions
  RETURN EXISTS (
    SELECT 1 FROM public.department_permissions dp
    WHERE dp.department = user_profile.department_enum
    AND dp.position = user_profile.position_enum
    AND dp.module_name = _module
    AND dp.can_access = true
  );
END;
$$;

-- Create function to get user branch offices
CREATE OR REPLACE FUNCTION public.get_user_branch_offices(_user_id UUID)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_profile RECORD;
  branch_ids UUID[];
BEGIN
  -- Get user profile
  SELECT p.role, p.department_enum, p.position_enum INTO user_profile
  FROM public.profiles p
  WHERE p.user_id = _user_id;
  
  -- Admins and directors see all branches
  IF user_profile.role = 'admin' OR user_profile.position_enum = 'director' THEN
    SELECT ARRAY(SELECT id FROM public.branch_offices WHERE active = true) INTO branch_ids;
    RETURN branch_ids;
  END IF;
  
  -- Finance and accounting see all branches
  IF user_profile.department_enum IN ('finanzas', 'contabilidad') THEN
    SELECT ARRAY(SELECT id FROM public.branch_offices WHERE active = true) INTO branch_ids;
    RETURN branch_ids;
  END IF;
  
  -- Other users see only assigned branches
  SELECT ARRAY(
    SELECT uba.branch_office_id 
    FROM public.user_branch_assignments uba
    JOIN public.profiles p ON p.id = uba.user_id
    WHERE p.user_id = _user_id
  ) INTO branch_ids;
  
  RETURN branch_ids;
END;
$$;