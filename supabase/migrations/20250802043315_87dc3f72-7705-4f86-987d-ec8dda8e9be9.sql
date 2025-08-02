-- First update the foreign key reference
ALTER TABLE public.design_phases 
DROP CONSTRAINT IF EXISTS design_phases_project_id_fkey;

ALTER TABLE public.design_phases 
ADD CONSTRAINT design_phases_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.client_projects(id) ON DELETE CASCADE;

-- Make created_by nullable temporarily to fix existing data
ALTER TABLE public.design_phases 
ALTER COLUMN created_by DROP NOT NULL;

-- Update the function to handle null created_by
CREATE OR REPLACE FUNCTION public.create_default_design_phases(project_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  admin_profile_id uuid;
BEGIN
  -- Get first admin profile as creator
  SELECT id INTO admin_profile_id 
  FROM public.profiles 
  WHERE role = 'admin' 
  LIMIT 1;

  INSERT INTO public.design_phases (
    project_id, 
    phase_name, 
    phase_order, 
    status, 
    created_by
  ) VALUES
  (project_id_param, 'Zonificación', 1, 'pending', admin_profile_id),
  (project_id_param, 'Volumetría', 2, 'pending', admin_profile_id),
  (project_id_param, 'Acabados', 3, 'pending', admin_profile_id),
  (project_id_param, 'Renders', 4, 'pending', admin_profile_id),
  (project_id_param, 'Diseño Completado', 5, 'pending', admin_profile_id);
END;
$function$;

-- Now create design phases for existing client_projects in design status
DO $$
DECLARE
    project_record RECORD;
BEGIN
    FOR project_record IN 
        SELECT cp.id 
        FROM public.client_projects cp
        WHERE cp.status = 'design' 
        AND NOT EXISTS (SELECT 1 FROM public.design_phases dp WHERE dp.project_id = cp.id)
    LOOP
        PERFORM public.create_default_design_phases(project_record.id);
    END LOOP;
END $$;