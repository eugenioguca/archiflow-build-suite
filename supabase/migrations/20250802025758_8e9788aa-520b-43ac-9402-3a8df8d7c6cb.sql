-- Agregar campos para el contrato firmado por el cliente
ALTER TABLE public.client_projects 
ADD COLUMN contract_url text,
ADD COLUMN contract_uploaded boolean DEFAULT false;