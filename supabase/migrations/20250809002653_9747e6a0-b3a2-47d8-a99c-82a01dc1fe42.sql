-- Fix the critical foreign key issue by correcting the RPC function
-- and updating search_users_and_clients_for_invitation to fix column ambiguity

-- Drop and recreate the function to fix the column ambiguity error
DROP FUNCTION IF EXISTS public.search_users_and_clients_for_invitation(text, integer);

CREATE OR REPLACE FUNCTION public.search_users_and_clients_for_invitation(
  search_text text DEFAULT '',
  limit_results integer DEFAULT 20
)
RETURNS TABLE(
  user_id uuid,
  profile_id uuid,
  full_name text,
  email text,
  user_role text,
  user_position text,
  department text,
  user_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  -- Get employees from profiles
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
  
  -- Get clients from clients table
  SELECT 
    NULL::uuid as user_id,  -- Clients don't have user_id in auth.users
    c.profile_id as profile_id,
    c.full_name,
    c.email,
    'client'::text as user_role,
    NULL::text as user_position,
    NULL::text as department,
    'client'::text as user_type
  FROM public.clients c
  WHERE c.profile_id IS NOT NULL
  AND (
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