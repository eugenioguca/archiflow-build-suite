-- Fix only the project_id foreign key for documents table
-- The client_id foreign key already exists

-- First, drop the incorrect foreign key constraint  
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_project_id_fkey;

-- Add correct foreign key constraint pointing to client_projects
ALTER TABLE public.documents 
ADD CONSTRAINT documents_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.client_projects(id) ON DELETE CASCADE;