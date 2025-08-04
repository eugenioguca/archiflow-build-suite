-- Fix the trigger issue by moving it to the correct table
-- Step 1: Drop the problematic trigger from clients table
DROP TRIGGER IF EXISTS trigger_auto_create_project_for_client ON public.clients;

-- Step 2: Create the trigger on client_projects table where it belongs
CREATE TRIGGER trigger_auto_create_project_for_client
  BEFORE UPDATE ON public.client_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_project_for_client();

-- Note: The function auto_create_project_for_client() already exists and works correctly
-- It checks for sales_pipeline_stage changes from 'nuevo_lead' to 'en_contacto'
-- and creates a project if none exists, which is the correct behavior