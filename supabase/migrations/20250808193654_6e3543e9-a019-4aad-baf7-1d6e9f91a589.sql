-- Corregir función get_project_team_members para incluir todos los roles del proyecto
DROP FUNCTION IF EXISTS public.get_project_team_members(uuid);

CREATE OR REPLACE FUNCTION public.get_project_team_members(project_id_param uuid)
RETURNS TABLE(user_id uuid, profile_id uuid, full_name text, email text, user_role text, user_position text, department text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.user_id,
    p.id as profile_id,
    p.full_name,
    p.email,
    p.role::text as user_role,
    p.position_enum::text as user_position,
    p.department_enum::text as department
  FROM public.profiles p
  WHERE p.role IN ('admin', 'employee')
  AND (
    -- Roles asignados en client_projects
    p.id IN (
      SELECT cp.assigned_advisor_id FROM public.client_projects cp WHERE cp.id = project_id_param AND cp.assigned_advisor_id IS NOT NULL
      UNION
      SELECT cp.project_manager_id FROM public.client_projects cp WHERE cp.id = project_id_param AND cp.project_manager_id IS NOT NULL
      UNION
      SELECT cp.construction_supervisor_id FROM public.client_projects cp WHERE cp.id = project_id_param AND cp.construction_supervisor_id IS NOT NULL
    )
    -- Miembros de equipos de construcción del proyecto
    OR p.id IN (
      SELECT DISTINCT (jsonb_array_elements(ct.members)->>'profile_id')::uuid
      FROM public.construction_teams ct
      WHERE ct.project_id = project_id_param
      AND jsonb_typeof(ct.members) = 'array'
    )
    -- Líderes de equipos de construcción
    OR p.id IN (
      SELECT ct.team_leader_id
      FROM public.construction_teams ct
      WHERE ct.project_id = project_id_param AND ct.team_leader_id IS NOT NULL
    )
  )
  ORDER BY p.full_name;
END;
$function$;