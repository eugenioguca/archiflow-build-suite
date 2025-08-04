-- Make position and department nullable for client profiles
ALTER TABLE public.profiles 
ALTER COLUMN position DROP NOT NULL,
ALTER COLUMN department DROP NOT NULL;

-- Set default values for client profiles
UPDATE public.profiles 
SET position = 'Cliente', department = 'Cliente'
WHERE role = 'client' AND (position IS NULL OR department IS NULL);