-- Remove any construction-related tables if they exist
DROP TABLE IF EXISTS public.construction_projects CASCADE;
DROP TABLE IF EXISTS public.construction_phases CASCADE; 
DROP TABLE IF EXISTS public.construction_milestones CASCADE;
DROP TABLE IF EXISTS public.construction_project_budgets CASCADE;

-- Remove any construction-related columns from existing tables
ALTER TABLE public.client_projects DROP COLUMN IF EXISTS construction_project_id CASCADE;
ALTER TABLE public.progress_photos DROP COLUMN IF EXISTS construction_project_id CASCADE;
ALTER TABLE public.budget_items DROP COLUMN IF EXISTS construction_project_id CASCADE;

-- Clean up any construction-related functions
DROP FUNCTION IF EXISTS public.create_construction_project(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.update_construction_progress() CASCADE;