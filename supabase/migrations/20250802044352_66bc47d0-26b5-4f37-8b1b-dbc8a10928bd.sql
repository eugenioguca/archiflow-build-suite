-- Fix the foreign key constraint in project_team_members to reference client_projects
ALTER TABLE public.project_team_members 
DROP CONSTRAINT IF EXISTS project_team_members_project_id_fkey;

ALTER TABLE public.project_team_members 
ADD CONSTRAINT project_team_members_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.client_projects(id) ON DELETE CASCADE;

-- Now insert sales advisors into project_team_members for projects in design phase
INSERT INTO public.project_team_members (project_id, user_id, role, responsibilities)
SELECT 
  cp.id as project_id,
  cp.assigned_advisor_id as user_id,
  'sales_advisor' as role,
  'Asesor de ventas que cerró al cliente' as responsibilities
FROM public.client_projects cp
WHERE cp.status IN ('design', 'design_completed') 
  AND cp.assigned_advisor_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.project_team_members ptm 
    WHERE ptm.project_id = cp.id 
    AND ptm.user_id = cp.assigned_advisor_id
  );