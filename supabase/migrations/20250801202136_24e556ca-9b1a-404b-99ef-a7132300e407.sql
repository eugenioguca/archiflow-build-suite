-- Change state_id column to state_name in clients table
ALTER TABLE public.clients 
DROP COLUMN IF EXISTS state_id,
ADD COLUMN IF NOT EXISTS state_name TEXT;