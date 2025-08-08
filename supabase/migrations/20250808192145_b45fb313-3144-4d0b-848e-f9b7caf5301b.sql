-- Eliminar funciones existentes para recrear con tipos correctos
DROP FUNCTION IF EXISTS public.get_users_by_department(text);
DROP FUNCTION IF EXISTS public.get_users_by_position(text);
DROP FUNCTION IF EXISTS public.get_project_team_members(uuid);

-- Recrear función get_users_by_department con tipos corregidos
CREATE OR REPLACE FUNCTION public.get_users_by_department(department_param text)
 RETURNS TABLE(user_id uuid, profile_id uuid, full_name text, email text, user_role text, user_position text, department text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.id as profile_id,
    p.full_name,
    p.email,
    p.role::text as user_role,
    p.position_enum::text as user_position,
    p.department_enum::text as department
  FROM public.profiles p
  WHERE p.department_enum::text = department_param
  AND p.role IN ('admin', 'employee')
  ORDER BY p.full_name;
END;
$function$;

-- Recrear función get_users_by_position con tipos corregidos
CREATE OR REPLACE FUNCTION public.get_users_by_position(position_param text)
 RETURNS TABLE(user_id uuid, profile_id uuid, full_name text, email text, user_role text, user_position text, department text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.id as profile_id,
    p.full_name,
    p.email,
    p.role::text as user_role,
    p.position_enum::text as user_position,
    p.department_enum::text as department
  FROM public.profiles p
  WHERE p.position_enum::text = position_param
  AND p.role IN ('admin', 'employee')
  ORDER BY p.full_name;
END;
$function$;

-- Recrear función get_project_team_members mejorada
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
  WHERE p.id IN (
    SELECT cp.assigned_advisor_id FROM public.client_projects cp WHERE cp.id = project_id_param AND cp.assigned_advisor_id IS NOT NULL
    UNION
    SELECT cp.project_manager_id FROM public.client_projects cp WHERE cp.id = project_id_param AND cp.project_manager_id IS NOT NULL
    UNION
    SELECT cp.construction_supervisor_id FROM public.client_projects cp WHERE cp.id = project_id_param AND cp.construction_supervisor_id IS NOT NULL
  ) AND p.id IS NOT NULL
  ORDER BY p.full_name;
END;
$function$;

-- Nueva función para búsqueda inteligente de usuarios
CREATE OR REPLACE FUNCTION public.search_users_for_invitation(
  search_text text DEFAULT '',
  limit_results integer DEFAULT 20
)
 RETURNS TABLE(user_id uuid, profile_id uuid, full_name text, email text, user_role text, user_position text, department text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
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
    search_text = '' OR
    p.full_name ILIKE '%' || search_text || '%' OR
    p.email ILIKE '%' || search_text || '%'
  )
  ORDER BY 
    CASE 
      WHEN p.full_name ILIKE search_text || '%' THEN 1
      WHEN p.full_name ILIKE '%' || search_text || '%' THEN 2
      WHEN p.email ILIKE search_text || '%' THEN 3
      ELSE 4
    END,
    p.full_name
  LIMIT limit_results;
END;
$function$;