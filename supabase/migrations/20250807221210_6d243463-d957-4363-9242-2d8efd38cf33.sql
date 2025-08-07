-- Fix the INSERT policy for client-documents bucket
DROP POLICY IF EXISTS "Employees and admins can upload client documents" ON storage.objects;

CREATE POLICY "Employees and admins can upload client documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'client-documents' 
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
  )
);

-- Also ensure the get_project_cumulative_documents function includes client_documents
CREATE OR REPLACE FUNCTION public.get_project_cumulative_documents(p_project_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  file_path text,
  file_type text,
  file_size bigint,
  created_at timestamptz,
  document_type text,
  department text,
  uploader_name text,
  source text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cd.id,
    cd.document_name as name,
    cd.file_path,
    cd.file_type,
    cd.file_size,
    cd.created_at,
    cd.document_type,
    'client'::text as department,
    COALESCE(p.full_name, 'Usuario') as uploader_name,
    'client_documents'::text as source
  FROM public.client_documents cd
  LEFT JOIN public.profiles p ON p.user_id = cd.uploaded_by
  WHERE cd.project_id = p_project_id
  
  UNION ALL
  
  SELECT 
    d.id,
    d.name,
    d.file_path,
    d.file_type,
    d.file_size,
    d.created_at,
    'project_document'::text as document_type,
    d.department,
    COALESCE(p.full_name, 'Usuario') as uploader_name,
    'project_documents'::text as source
  FROM public.documents d
  LEFT JOIN public.profiles p ON p.user_id = d.uploaded_by
  WHERE d.project_id = p_project_id
  
  ORDER BY created_at DESC;
END;
$$;