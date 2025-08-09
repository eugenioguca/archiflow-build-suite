-- Fix the ambiguous column error in search_users_and_clients_for_invitation
DROP FUNCTION IF EXISTS public.search_users_and_clients_for_invitation(text, integer);

CREATE OR REPLACE FUNCTION public.search_users_and_clients_for_invitation(
  search_text text DEFAULT ''::text, 
  limit_results integer DEFAULT 20
)
RETURNS TABLE(
  user_id uuid, 
  profile_id uuid, 
  full_name text, 
  email text, 
  user_role text, 
  user_position text, 
  department text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  -- Get employees and admins from profiles
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
  
  UNION ALL
  
  -- Get clients from clients table
  SELECT 
    COALESCE(cp.user_id, '00000000-0000-0000-0000-000000000000'::uuid) as user_id,
    c.profile_id,
    c.full_name,
    COALESCE(c.email, '') as email,
    'client'::text as user_role,
    ''::text as user_position,
    ''::text as department
  FROM public.clients c
  LEFT JOIN public.profiles cp ON cp.id = c.profile_id
  WHERE (
    search_text = '' OR
    c.full_name ILIKE '%' || search_text || '%' OR
    c.email ILIKE '%' || search_text || '%'
  )
  
  ORDER BY 
    CASE 
      WHEN full_name ILIKE search_text || '%' THEN 1
      WHEN full_name ILIKE '%' || search_text || '%' THEN 2
      WHEN email ILIKE search_text || '%' THEN 3
      ELSE 4
    END,
    full_name
  LIMIT limit_results;
END;
$function$;