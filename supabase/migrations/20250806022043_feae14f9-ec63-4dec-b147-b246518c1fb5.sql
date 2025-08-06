-- Migrar el proyecto existente que ya tiene un presupuesto en estado 'draft'
-- Primero actualizamos el estado a 'approved' para el proyecto específico
UPDATE public.project_budgets 
SET status = 'approved' 
WHERE project_id = 'cb7df726-bd7a-4d30-b265-cb5fb33076c5' 
AND status = 'draft';

-- El trigger se ejecutará automáticamente y migrará los items