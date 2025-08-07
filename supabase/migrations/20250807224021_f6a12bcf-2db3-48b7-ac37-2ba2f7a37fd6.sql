-- FASE 1: MIGRACIÓN DE DATOS DEL SISTEMA DUAL AL UNIFICADO
-- Paso 1: Migrar registros de client_documents a documents

-- Primero, insertar los registros de client_documents que no estén ya en documents
INSERT INTO public.documents (
  id,
  project_id,
  client_id,
  file_name,
  file_path,
  file_type,
  file_size,
  department,
  document_type,
  description,
  uploaded_by,
  created_at,
  updated_at,
  is_deleted
)
SELECT 
  cd.id,
  cd.project_id,
  cd.client_id,
  cd.document_name as file_name,
  -- Migrar la ruta del bucket client-documents al project-documents
  CASE 
    WHEN cd.file_path LIKE 'client-documents/%' THEN 
      REPLACE(cd.file_path, 'client-documents/', 'project-documents/')
    ELSE 
      'project-documents/' || cd.file_path
  END as file_path,
  cd.file_type,
  cd.file_size,
  CASE 
    -- Mapear tipos específicos de documentos requeridos
    WHEN cd.document_type = 'constancia_situacion_fiscal' THEN 'fiscal'
    WHEN cd.document_type = 'contract' THEN 'contracts'
    WHEN cd.document_type = 'identification' THEN 'legal'
    WHEN cd.document_type = 'proof_of_address' THEN 'legal'
    WHEN cd.document_type = 'curp' THEN 'legal'
    WHEN cd.document_type = 'plan_pagos' THEN 'financial'
    ELSE 'general'
  END as department,
  cd.document_type,
  'Migrado desde client_documents' as description,
  cd.uploaded_by,
  cd.created_at,
  cd.updated_at,
  false as is_deleted
FROM public.client_documents cd
WHERE NOT EXISTS (
  SELECT 1 FROM public.documents d 
  WHERE d.id = cd.id
)
AND cd.project_id IS NOT NULL;

-- Paso 2: Crear función unificada para obtener documentos del proyecto
CREATE OR REPLACE FUNCTION public.get_unified_project_documents(project_id_param uuid)
RETURNS TABLE (
  id uuid,
  project_id uuid,
  client_id uuid,
  file_name text,
  file_path text,
  file_type text,
  file_size bigint,
  department text,
  document_type text,
  description text,
  uploaded_by uuid,
  uploader_name text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  category text,
  phase_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.project_id,
    d.client_id,
    d.file_name,
    d.file_path,
    d.file_type,
    d.file_size,
    d.department,
    d.document_type,
    COALESCE(d.description, '') as description,
    d.uploaded_by,
    COALESCE(p.full_name, p.email, 'Sistema') as uploader_name,
    d.created_at,
    d.updated_at,
    CASE d.department
      WHEN 'fiscal' THEN 'Documentos Fiscales'
      WHEN 'contracts' THEN 'Contratos'
      WHEN 'legal' THEN 'Documentos Legales'
      WHEN 'financial' THEN 'Documentos Financieros'
      WHEN 'diseño' THEN 'Diseño'
      WHEN 'construction' THEN 'Construcción'
      ELSE 'General'
    END as category,
    CASE 
      WHEN d.department = 'diseño' THEN COALESCE(dp.phase_name, 'General')
      WHEN d.department = 'construction' THEN COALESCE(cp.phase_name, 'General')
      ELSE 'N/A'
    END as phase_name
  FROM public.documents d
  LEFT JOIN public.profiles p ON p.id = d.uploaded_by
  LEFT JOIN public.design_phases dp ON dp.id = d.phase_id
  LEFT JOIN public.construction_phases cp ON cp.id = d.phase_id
  WHERE d.project_id = project_id_param
    AND d.is_deleted = false
  ORDER BY d.created_at DESC;
END;
$$;

-- Paso 3: Actualizar referencias en client_projects para reflejar documentos migrados
UPDATE public.client_projects 
SET 
  constancia_situacion_fiscal_uploaded = EXISTS (
    SELECT 1 FROM public.documents 
    WHERE project_id = client_projects.id 
    AND document_type = 'constancia_situacion_fiscal'
    AND is_deleted = false
  ),
  contract_uploaded = EXISTS (
    SELECT 1 FROM public.documents 
    WHERE project_id = client_projects.id 
    AND document_type = 'contract'
    AND is_deleted = false
  )
WHERE EXISTS (
  SELECT 1 FROM public.client_documents cd 
  WHERE cd.project_id = client_projects.id
);

-- Paso 4: Crear índices para optimizar la función unificada
CREATE INDEX IF NOT EXISTS idx_documents_project_department 
ON public.documents(project_id, department) 
WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_documents_document_type 
ON public.documents(document_type) 
WHERE is_deleted = false;