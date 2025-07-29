-- Create permissions system for granular access control

-- Create enum for available modules
CREATE TYPE public.module_name AS ENUM (
  'dashboard',
  'clients', 
  'projects',
  'documents',
  'finances',
  'accounting',
  'progress_photos'
);

-- Create user permissions table
CREATE TABLE public.user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  module module_name NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, module)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Only admins can manage permissions
CREATE POLICY "Only admins can manage user permissions" 
ON public.user_permissions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- Users can view their own permissions
CREATE POLICY "Users can view their own permissions" 
ON public.user_permissions 
FOR SELECT 
USING (user_id = auth.uid());

-- Create function to check module permissions
CREATE OR REPLACE FUNCTION public.has_module_permission(
  _user_id UUID, 
  _module module_name, 
  _permission TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  -- Admins have all permissions
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = _user_id AND role = 'admin'
  ) THEN
    RETURN true;
  END IF;
  
  -- Check specific permission
  RETURN EXISTS (
    SELECT 1 FROM public.user_permissions up
    WHERE up.user_id = _user_id 
    AND up.module = _module
    AND (
      (_permission = 'view' AND up.can_view = true) OR
      (_permission = 'create' AND up.can_create = true) OR
      (_permission = 'edit' AND up.can_edit = true) OR
      (_permission = 'delete' AND up.can_delete = true)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for updating timestamps
CREATE TRIGGER update_user_permissions_updated_at
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default permissions for admin users
INSERT INTO public.user_permissions (user_id, module, can_view, can_create, can_edit, can_delete)
SELECT 
  p.user_id,
  m.module,
  true,
  true, 
  true,
  true
FROM public.profiles p
CROSS JOIN (
  VALUES 
    ('dashboard'::module_name),
    ('clients'::module_name),
    ('projects'::module_name), 
    ('documents'::module_name),
    ('finances'::module_name),
    ('accounting'::module_name),
    ('progress_photos'::module_name)
) AS m(module)
WHERE p.role = 'admin'
ON CONFLICT (user_id, module) DO NOTHING;