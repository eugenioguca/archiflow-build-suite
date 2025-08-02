-- Update design_phases to reference client_projects instead of projects
ALTER TABLE public.design_phases 
DROP CONSTRAINT IF EXISTS design_phases_project_id_fkey;

ALTER TABLE public.design_phases 
ADD CONSTRAINT design_phases_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.client_projects(id) ON DELETE CASCADE;

-- Now create design phases for existing client_projects in design status
DO $$
DECLARE
    project_record RECORD;
BEGIN
    -- Find client_projects with status = 'design' but no design_phases
    FOR project_record IN 
        SELECT cp.id 
        FROM public.client_projects cp
        WHERE cp.status = 'design' 
        AND NOT EXISTS (SELECT 1 FROM public.design_phases dp WHERE dp.project_id = cp.id)
    LOOP
        -- Create default phases for each project
        PERFORM public.create_default_design_phases(project_record.id);
    END LOOP;
END $$;