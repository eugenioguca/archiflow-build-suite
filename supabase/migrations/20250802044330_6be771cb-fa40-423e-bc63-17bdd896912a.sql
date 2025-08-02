-- Migration: Add existing sales advisors to design project teams

-- Insert sales advisors into project_team_members for projects in design phase
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