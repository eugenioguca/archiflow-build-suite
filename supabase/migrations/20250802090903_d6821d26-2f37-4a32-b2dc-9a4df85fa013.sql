-- Eliminar con CASCADE para eliminar dependencias
DROP FUNCTION IF EXISTS public.insert_default_construction_budget_items(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.create_construction_project_from_client(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.revert_project_from_construction(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.auto_create_construction_project() CASCADE;
DROP FUNCTION IF EXISTS public.check_budget_alerts(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.update_budget_item_total() CASCADE;

-- Eliminar todas las tablas construction con CASCADE
DROP TABLE IF EXISTS public.construction_budget_changes CASCADE;
DROP TABLE IF EXISTS public.construction_budget_alerts CASCADE;
DROP TABLE IF EXISTS public.construction_budget_items CASCADE;
DROP TABLE IF EXISTS public.construction_deliveries CASCADE;
DROP TABLE IF EXISTS public.construction_expenses CASCADE;
DROP TABLE IF EXISTS public.construction_materials CASCADE;
DROP TABLE IF EXISTS public.construction_teams CASCADE;
DROP TABLE IF EXISTS public.construction_timelines CASCADE;
DROP TABLE IF EXISTS public.construction_phases CASCADE;
DROP TABLE IF EXISTS public.construction_projects CASCADE;