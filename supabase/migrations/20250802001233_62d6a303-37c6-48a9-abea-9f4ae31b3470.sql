-- Add missing columns to client_documents table
ALTER TABLE public.client_documents 
ADD COLUMN file_type TEXT,
ADD COLUMN file_size BIGINT;