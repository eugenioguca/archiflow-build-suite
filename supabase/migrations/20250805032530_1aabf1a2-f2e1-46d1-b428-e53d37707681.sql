-- Clean up orphaned material finance requests
-- Delete material finance requests that reference non-existent clients or projects

DELETE FROM public.material_finance_requests 
WHERE client_id NOT IN (SELECT id FROM public.clients)
   OR project_id NOT IN (SELECT id FROM public.client_projects)
   OR client_id IS NULL 
   OR project_id IS NULL;

-- Also clean up any material requirements that are orphaned
DELETE FROM public.material_requirements 
WHERE project_id NOT IN (SELECT id FROM public.client_projects)
   OR project_id IS NULL;