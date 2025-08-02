-- Fix foreign keys and constraints for documents table to use client-project architecture

-- First, drop the incorrect foreign key constraint
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_project_id_fkey;

-- Add correct foreign key constraints
ALTER TABLE public.documents 
ADD CONSTRAINT documents_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.client_projects(id) ON DELETE CASCADE;

ALTER TABLE public.documents 
ADD CONSTRAINT documents_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- Make project_id and client_id NOT NULL as they're required for the architecture
ALTER TABLE public.documents 
ALTER COLUMN project_id SET NOT NULL,
ALTER COLUMN client_id SET NOT NULL;