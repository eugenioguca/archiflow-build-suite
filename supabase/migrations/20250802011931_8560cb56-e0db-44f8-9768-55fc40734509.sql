-- Actualizar referencias en otras tablas para que apunten a project_id
-- Agregar columna project_id donde no existe y vincular documentos
ALTER TABLE public.client_documents ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.client_projects(id);

-- Actualizar client_documents para vincular al proyecto
UPDATE public.client_documents 
SET project_id = (
  SELECT cp.id 
  FROM public.client_projects cp 
  WHERE cp.client_id = client_documents.client_id 
  LIMIT 1
)
WHERE project_id IS NULL;

-- Crear índice para client_documents
CREATE INDEX IF NOT EXISTS idx_client_documents_project_id ON public.client_documents(project_id);

-- Actualizar política de CRM activities para usar la nueva estructura
DROP POLICY IF EXISTS "Users can view activities they created or for their assigned clients" ON public.crm_activities;

CREATE POLICY "Users can view activities they created or for their assigned clients" 
ON public.crm_activities 
FOR SELECT 
USING (
  (user_id = auth.uid()) 
  OR 
  (client_id IN (
    SELECT cp.client_id 
    FROM public.client_projects cp 
    JOIN public.profiles p ON cp.assigned_advisor_id = p.id 
    WHERE p.user_id = auth.uid()
  )) 
  OR 
  (EXISTS (
    SELECT 1 
    FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'employee')
  ))
);

-- Función para auto-crear proyecto al crear cliente
CREATE OR REPLACE FUNCTION public.auto_create_first_project()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.client_projects (
    client_id,
    project_name,
    project_description,
    service_type,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    'Proyecto Principal - ' || NEW.full_name,
    'Primer proyecto del cliente',
    'diseño',
    now(),
    now()
  );
  RETURN NEW;
END;
$$;

-- Trigger para crear proyecto automáticamente al crear cliente
DROP TRIGGER IF EXISTS auto_create_first_project_trigger ON public.clients;
CREATE TRIGGER auto_create_first_project_trigger
AFTER INSERT ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_first_project();