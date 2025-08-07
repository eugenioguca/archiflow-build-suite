-- FASE 2: ACTUALIZACIÓN DE BACKEND - TRIGGERS Y RLS POLICIES
-- Paso 1: Actualizar triggers para trabajar solo con tabla documents

-- Crear trigger para actualizar client_projects cuando se suban documentos requeridos
CREATE OR REPLACE FUNCTION public.update_client_project_document_flags()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Actualizar flags de documentos en client_projects
    UPDATE public.client_projects 
    SET 
      constancia_situacion_fiscal_uploaded = EXISTS (
        SELECT 1 FROM public.documents 
        WHERE project_id = NEW.project_id 
        AND category = 'constancia_situacion_fiscal'
        AND document_status = 'active'
      ),
      contract_uploaded = EXISTS (
        SELECT 1 FROM public.documents 
        WHERE project_id = NEW.project_id 
        AND category = 'contract'
        AND document_status = 'active'
      ),
      updated_at = NOW()
    WHERE id = NEW.project_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Actualizar flags cuando se eliminen documentos
    UPDATE public.client_projects 
    SET 
      constancia_situacion_fiscal_uploaded = EXISTS (
        SELECT 1 FROM public.documents 
        WHERE project_id = OLD.project_id 
        AND category = 'constancia_situacion_fiscal'
        AND document_status = 'active'
      ),
      contract_uploaded = EXISTS (
        SELECT 1 FROM public.documents 
        WHERE project_id = OLD.project_id 
        AND category = 'contract'
        AND document_status = 'active'
      ),
      updated_at = NOW()
    WHERE id = OLD.project_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Eliminar trigger anterior si existe
DROP TRIGGER IF EXISTS update_project_document_flags ON public.documents;

-- Crear nuevo trigger
CREATE TRIGGER update_project_document_flags
  AFTER INSERT OR UPDATE OR DELETE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_client_project_document_flags();

-- Paso 2: Actualizar RLS policies para documents (mantener las existentes pero optimizar)
-- Verificar que las políticas existentes funcionen para el flujo unificado

-- Función de seguridad para verificar si el usuario puede acceder al proyecto
CREATE OR REPLACE FUNCTION public.user_can_access_project(project_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_profile RECORD;
BEGIN
  -- Obtener perfil del usuario actual
  SELECT p.* INTO user_profile
  FROM public.profiles p
  WHERE p.user_id = auth.uid();
  
  IF user_profile IS NULL THEN
    RETURN false;
  END IF;
  
  -- Admins y empleados pueden acceder a todos los proyectos
  IF user_profile.role IN ('admin', 'employee') THEN
    RETURN true;
  END IF;
  
  -- Clientes solo pueden acceder a sus propios proyectos
  IF user_profile.role = 'client' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.client_projects cp
      JOIN public.clients c ON c.id = cp.client_id
      WHERE cp.id = project_id_param
      AND c.profile_id = user_profile.id
    );
  END IF;
  
  RETURN false;
END;
$$;

-- Paso 3: Eliminar referencias obsoletas a client_documents en funciones existentes
-- Actualizar función que pudiera referenciar client_documents
DROP FUNCTION IF EXISTS public.get_project_cumulative_documents(uuid);

-- Crear alias para compatibilidad con código existente
CREATE OR REPLACE FUNCTION public.get_project_cumulative_documents(project_id_param uuid)
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
  category_name text,
  phase_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Redirigir a la nueva función unificada
  RETURN QUERY
  SELECT * FROM public.get_unified_project_documents(project_id_param);
END;
$$;