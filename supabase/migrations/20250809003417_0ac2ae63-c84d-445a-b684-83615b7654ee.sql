-- Fix the ambiguous column reference in search_users_and_clients_for_invitation function
DROP FUNCTION IF EXISTS public.search_users_and_clients_for_invitation(text, integer);

CREATE OR REPLACE FUNCTION public.search_users_and_clients_for_invitation(search_text text DEFAULT ''::text, limit_results integer DEFAULT 20)
RETURNS TABLE(user_id uuid, profile_id uuid, full_name text, email text, user_role text, user_position text, department text, user_type text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  -- Get employees and admins
  SELECT 
    p.user_id,
    p.id as profile_id,
    p.full_name,
    p.email,
    p.role::text as user_role,
    p.position_enum::text as user_position,
    p.department_enum::text as department,
    'employee'::text as user_type
  FROM public.profiles p
  WHERE p.role IN ('admin', 'employee')
  AND (
    search_text = '' OR
    p.full_name ILIKE '%' || search_text || '%' OR
    p.email ILIKE '%' || search_text || '%'
  )
  
  UNION ALL
  
  -- Get clients
  SELECT 
    COALESCE(cp.user_id, gen_random_uuid()) as user_id,
    cp.id as profile_id,
    c.full_name,
    c.email,
    'client'::text as user_role,
    NULL::text as user_position,
    NULL::text as department,
    'client'::text as user_type
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