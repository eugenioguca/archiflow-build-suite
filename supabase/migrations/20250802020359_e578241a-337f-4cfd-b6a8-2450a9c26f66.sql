-- Eliminar el trigger que crea automáticamente el primer proyecto
-- para evitar duplicación con la lógica del formulario
DROP TRIGGER IF EXISTS auto_create_first_project_trigger ON public.clients;
DROP FUNCTION IF EXISTS public.auto_create_first_project();