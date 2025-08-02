-- First, let's check if there are any existing foreign key constraints and remove them
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_project_id_fkey;
ALTER TABLE public.incomes DROP CONSTRAINT IF EXISTS incomes_project_id_fkey;

-- Now add foreign key constraints to reference client_projects instead
ALTER TABLE public.expenses 
ADD CONSTRAINT expenses_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.client_projects(id) ON DELETE SET NULL;

ALTER TABLE public.incomes 
ADD CONSTRAINT incomes_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.client_projects(id) ON DELETE SET NULL;