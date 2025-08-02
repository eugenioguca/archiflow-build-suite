-- Fix the foreign key constraint in project_budgets to reference client_projects
ALTER TABLE public.project_budgets 
DROP CONSTRAINT IF EXISTS project_budgets_project_id_fkey;

ALTER TABLE public.project_budgets 
ADD CONSTRAINT project_budgets_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.client_projects(id) ON DELETE CASCADE;