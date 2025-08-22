-- Add global subpartidas support
ALTER TABLE public.chart_of_accounts_subpartidas 
ADD COLUMN es_global BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN departamento_aplicable TEXT;

-- Create some global construction subpartidas
DO $$
DECLARE
    admin_profile_id UUID;
BEGIN
    -- Get admin profile for created_by
    SELECT id INTO admin_profile_id 
    FROM public.profiles 
    WHERE role = 'admin' 
    LIMIT 1;
    
    -- Insert global construction subpartidas if admin exists
    IF admin_profile_id IS NOT NULL THEN
        INSERT INTO public.chart_of_accounts_subpartidas (
            partida_id, codigo, nombre, activo, es_global, departamento_aplicable, created_by
        ) VALUES
        (NULL, 'CON-GLOBAL-001', 'Material de Construcción', true, true, 'construccion', admin_profile_id),
        (NULL, 'CON-GLOBAL-002', 'Mano de Obra', true, true, 'construccion', admin_profile_id),
        (NULL, 'CON-GLOBAL-003', 'Equipo y Herramientas', true, true, 'construccion', admin_profile_id),
        (NULL, 'CON-GLOBAL-004', 'Transporte y Logística', true, true, 'construccion', admin_profile_id),
        (NULL, 'CON-GLOBAL-005', 'Servicios Externos', true, true, 'construccion', admin_profile_id),
        (NULL, 'CON-GLOBAL-006', 'Permisos y Licencias', true, true, 'construccion', admin_profile_id),
        (NULL, 'CON-GLOBAL-007', 'Supervisión Técnica', true, true, 'construccion', admin_profile_id),
        (NULL, 'CON-GLOBAL-008', 'Seguridad Industrial', true, true, 'construccion', admin_profile_id),
        (NULL, 'CON-GLOBAL-009', 'Control de Calidad', true, true, 'construccion', admin_profile_id),
        (NULL, 'CON-GLOBAL-010', 'Gastos Generales de Obra', true, true, 'construccion', admin_profile_id);
    END IF;
END $$;

-- Update the partida_id constraint to allow NULL for global subpartidas
ALTER TABLE public.chart_of_accounts_subpartidas 
ALTER COLUMN partida_id DROP NOT NULL;