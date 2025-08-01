-- Add inheritance support to documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS inherited_from_client boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS original_client_document_id uuid;

-- Create client_documents table for lead phase sensitive documents
CREATE TABLE IF NOT EXISTS public.client_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL,
  document_type text NOT NULL,
  document_name text NOT NULL,
  file_path text NOT NULL,
  file_type text,
  file_size bigint,
  description text,
  uploaded_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on client_documents
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for client_documents
CREATE POLICY "Employees and admins can manage client documents" 
ON public.client_documents 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));

CREATE POLICY "Clients can view their own documents" 
ON public.client_documents 
FOR SELECT 
USING (client_id IN (
  SELECT c.id FROM clients c 
  JOIN profiles p ON p.id = c.profile_id 
  WHERE p.user_id = auth.uid() AND p.role = 'client'
));

-- Function to inherit client documents to project
CREATE OR REPLACE FUNCTION public.inherit_client_documents_to_project(
  client_id_param uuid,
  project_id_param uuid
) RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public'
AS $$
DECLARE
  doc_record RECORD;
  new_file_path text;
BEGIN
  -- Copy each client document to project documents
  FOR doc_record IN 
    SELECT * FROM public.client_documents 
    WHERE client_id = client_id_param
  LOOP
    -- Build new path in project-documents bucket
    new_file_path := 'proyecto_' || project_id_param || '/inherited/' || 
                     CASE 
                       WHEN doc_record.document_type IN ('curp', 'rfc', 'constancia_fiscal', 'identificacion') THEN 'fiscal/'
                       ELSE 'legal/'
                     END || 
                     doc_record.document_name;
    
    -- Insert into documents table
    INSERT INTO public.documents (
      project_id,
      client_id,
      name,
      description,
      file_path,
      file_type,
      file_size,
      uploaded_by,
      department,
      department_permissions,
      access_level,
      inherited_from_client,
      original_client_document_id
    ) VALUES (
      project_id_param,
      client_id_param,
      doc_record.document_name,
      doc_record.description || ' (Heredado del cliente)',
      new_file_path,
      doc_record.file_type,
      doc_record.file_size,
      doc_record.uploaded_by,
      'inherited',
      ARRAY['all'],
      'internal',
      true,
      doc_record.id
    );
  END LOOP;
END;
$$;

-- Trigger to automatically inherit documents when project is created
CREATE OR REPLACE FUNCTION public.auto_inherit_client_documents()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public'
AS $$
BEGIN
  -- Check if client has documents to inherit
  IF EXISTS (SELECT 1 FROM public.client_documents WHERE client_id = NEW.client_id) THEN
    -- Call inheritance function
    PERFORM public.inherit_client_documents_to_project(NEW.client_id, NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic inheritance
DROP TRIGGER IF EXISTS trigger_auto_inherit_client_documents ON public.projects;
CREATE TRIGGER trigger_auto_inherit_client_documents
AFTER INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.auto_inherit_client_documents();