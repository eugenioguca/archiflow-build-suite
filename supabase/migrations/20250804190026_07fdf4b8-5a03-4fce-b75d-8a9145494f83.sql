-- Add unique constraint to client_portal_settings.client_id to fix upsert operation
-- This resolves the "failed to link user to client" error by ensuring proper unique constraint
-- for the upsert operation in UserClientLinker component

ALTER TABLE public.client_portal_settings 
ADD CONSTRAINT client_portal_settings_client_id_key 
UNIQUE (client_id);