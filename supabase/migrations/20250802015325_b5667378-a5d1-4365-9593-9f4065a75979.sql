-- Agregar campo state a la tabla clients
ALTER TABLE public.clients 
ADD COLUMN state TEXT;

-- Agregar campos para el origen del lead en client_projects
ALTER TABLE public.client_projects 
ADD COLUMN lead_source TEXT,
ADD COLUMN lead_source_details TEXT;