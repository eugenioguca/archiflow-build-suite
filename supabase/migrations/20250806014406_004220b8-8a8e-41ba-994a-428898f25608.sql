-- Create external_team_members table for non-platform users
CREATE TABLE public.external_team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  position TEXT,
  company TEXT,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL,
  responsibilities TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.external_team_members ENABLE ROW LEVEL SECURITY;

-- Create policies for external team members
CREATE POLICY "Employees and admins can manage external team members" 
ON public.external_team_members 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.user_id = auth.uid() 
  AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
));

-- Create trigger for updated_at
CREATE TRIGGER update_external_team_members_updated_at
BEFORE UPDATE ON public.external_team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();