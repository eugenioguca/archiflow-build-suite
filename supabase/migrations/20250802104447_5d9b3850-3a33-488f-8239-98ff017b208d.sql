-- Primero, eliminar el foreign key constraint problemático
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_project_id_fkey;

-- Asegurar que la tabla documents tenga las columnas necesarias
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS client_id UUID;

-- Crear el foreign key correcto hacia client_projects
ALTER TABLE public.documents 
ADD CONSTRAINT documents_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.client_projects(id) ON DELETE CASCADE;

-- Crear foreign key para client_id hacia clients
ALTER TABLE public.documents 
ADD CONSTRAINT documents_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- Actualizar registros existentes para que tengan client_id
UPDATE public.documents 
SET client_id = cp.client_id 
FROM public.client_projects cp 
WHERE documents.project_id = cp.id 
AND documents.client_id IS NULL;