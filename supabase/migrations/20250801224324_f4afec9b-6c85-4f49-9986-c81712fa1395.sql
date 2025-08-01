-- Agregar campo department a la tabla documents para rastrear qué departamento subió cada documento
ALTER TABLE public.documents 
ADD COLUMN department text DEFAULT 'clients';

-- Agregar campo department_permissions para controlar qué departamentos pueden ver cada documento
ALTER TABLE public.documents 
ADD COLUMN department_permissions text[] DEFAULT ARRAY['all'];

-- Crear índice para mejor performance en consultas por departamento
CREATE INDEX idx_documents_department ON public.documents(department);
CREATE INDEX idx_documents_project_department ON public.documents(project_id, department);

-- Función para auto-crear proyecto cuando un cliente pasa de lead a contacto
CREATE OR REPLACE FUNCTION public.auto_create_project_for_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Solo crear proyecto si el cliente pasa de 'nuevo_lead' a 'en_contacto' y no tiene proyecto
  IF OLD.sales_pipeline_stage = 'nuevo_lead' 
     AND NEW.sales_pipeline_stage = 'en_contacto' 
     AND NOT EXISTS (SELECT 1 FROM public.projects WHERE client_id = NEW.id) THEN
    
    INSERT INTO public.projects (
      client_id,
      name,
      description,
      status,
      created_by
    ) VALUES (
      NEW.id,
      'Proyecto para ' || NEW.full_name,
      'Proyecto creado automáticamente al convertir lead',
      'planning',
      (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear trigger para auto-crear proyectos
CREATE TRIGGER trigger_auto_create_project_for_client
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_project_for_client();

-- Función para obtener documentos acumulativos por proyecto
CREATE OR REPLACE FUNCTION public.get_project_cumulative_documents(
  project_id_param uuid,
  user_department text DEFAULT 'all'
)
RETURNS TABLE (
  id uuid,
  name text,
  file_path text,
  department text,
  uploaded_by uuid,
  created_at timestamp with time zone,
  file_type text,
  file_size bigint,
  description text,
  uploader_name text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.name,
    d.file_path,
    d.department,
    d.uploaded_by,
    d.created_at,
    d.file_type,
    d.file_size,
    d.description,
    p.display_name as uploader_name
  FROM public.documents d
  LEFT JOIN public.profiles p ON d.uploaded_by = p.id
  WHERE d.project_id = project_id_param
    AND (
      'all' = ANY(d.department_permissions) 
      OR user_department = ANY(d.department_permissions)
      OR d.department = user_department
    )
    AND d.document_status = 'active'
  ORDER BY d.department, d.created_at DESC;
END;
$$;