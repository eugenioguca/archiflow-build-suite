-- Corregir la función get_project_cumulative_documents para evitar columnas ambiguas
DROP FUNCTION IF EXISTS public.get_project_cumulative_documents(uuid, text);

CREATE OR REPLACE FUNCTION public.get_project_cumulative_documents(project_id_param uuid, user_department text DEFAULT 'all'::text)
 RETURNS TABLE(id uuid, name text, file_path text, department text, uploaded_by uuid, created_at timestamp with time zone, file_type text, file_size bigint, description text, uploader_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  -- Documentos de la tabla documents (documentos del proyecto)
  SELECT 
    d.id::uuid,
    d.name::text,
    d.file_path::text,
    d.department::text,
    d.uploaded_by::uuid,
    d.created_at::timestamp with time zone,
    d.file_type::text,
    d.file_size::bigint,
    d.description::text,
    COALESCE(p.full_name, 'Usuario')::text as uploader_name
  FROM public.documents d
  LEFT JOIN public.profiles p ON d.uploaded_by = p.id
  WHERE d.project_id = project_id_param
    AND (
      'all' = ANY(d.department_permissions) 
      OR user_department = ANY(d.department_permissions)
      OR d.department = user_department
      OR user_department = 'all'
    )
    AND d.document_status = 'active'
  
  UNION ALL
  
  -- Documentos de la tabla client_documents (documentos heredados del cliente)
  SELECT 
    cd.id::uuid,
    cd.document_name::text as name,
    cd.file_path::text,
    cd.document_type::text as department,
    cd.uploaded_by::uuid,
    cd.created_at::timestamp with time zone,
    cd.file_type::text,
    cd.file_size::bigint,
    NULL::text as description,
    COALESCE(p2.full_name, 'Usuario')::text as uploader_name
  FROM public.client_documents cd
  LEFT JOIN public.profiles p2 ON cd.uploaded_by = p2.id
  WHERE cd.project_id = project_id_param
    OR cd.client_id = (SELECT client_id FROM public.client_projects WHERE id = project_id_param)
  
  ORDER BY created_at DESC;
END;
$function$;