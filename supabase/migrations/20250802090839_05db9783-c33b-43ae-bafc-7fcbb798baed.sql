-- Primero eliminar triggers que dependen de las funciones
DROP TRIGGER IF EXISTS auto_create_construction_project_trigger ON public.client_projects;

-- Ahora eliminar todas las funciones construction
DROP FUNCTION IF EXISTS public.insert_default_construction_budget_items(uuid);
DROP FUNCTION IF EXISTS public.create_construction_project_from_client(uuid);
DROP FUNCTION IF EXISTS public.revert_project_from_construction(uuid, text);
DROP FUNCTION IF EXISTS public.auto_create_construction_project();
DROP FUNCTION IF EXISTS public.check_budget_alerts(uuid);
DROP FUNCTION IF EXISTS public.update_budget_item_total();

-- Eliminar todas las tablas construction
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