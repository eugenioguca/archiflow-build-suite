-- FASE 1: CORRECCIÓN INMEDIATA - Actualizar proyectos existentes que califican para diseño
UPDATE public.client_projects 
SET status = 'design',
    updated_at = now()
WHERE sales_pipeline_stage = 'cliente_cerrado'
  AND constancia_situacion_fiscal_uploaded = true
  AND contract_uploaded = true
  AND status = 'potential'
  AND EXISTS (
    SELECT 1 
    FROM payment_plans pp
    JOIN payment_installments pi ON pp.id = pi.payment_plan_id
    WHERE pp.client_project_id = client_projects.id 
    AND pp.status = 'active'
    AND pi.status = 'paid'
  );

-- Crear fases de diseño para proyectos que no las tienen
INSERT INTO public.design_phases (
  project_id,
  phase_name,
  phase_order,
  status,
  created_by
)
SELECT 
  cp.id as project_id,
  phase_data.phase_name,
  phase_data.phase_order,
  'pending' as status,
  (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1) as created_by
FROM public.client_projects cp
CROSS JOIN (
  VALUES 
    ('Zonificación', 1),
    ('Volumetría', 2),
    ('Acabados', 3),
    ('Renders', 4),
    ('Diseño Completado', 5)
) AS phase_data(phase_name, phase_order)
WHERE cp.status = 'design'
  AND NOT EXISTS (
    SELECT 1 FROM public.design_phases dp 
    WHERE dp.project_id = cp.id
  );

-- FASE 2: MEJORA DEL TRIGGER - Hacer más robusto el trigger de transición automática
CREATE OR REPLACE FUNCTION public.auto_transition_to_design()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  has_paid_installment BOOLEAN := false;
BEGIN
  -- Check if project should transition to design
  IF NEW.sales_pipeline_stage = 'cliente_cerrado' 
     AND NEW.constancia_situacion_fiscal_uploaded = true 
     AND NEW.contract_uploaded = true 
     AND NEW.status NOT IN ('design', 'construction', 'design_completed', 'design_only_completed') THEN
    
    -- Verificar si existe al menos un installment pagado
    SELECT EXISTS (
      SELECT 1 
      FROM payment_plans pp
      JOIN payment_installments pi ON pp.id = pi.payment_plan_id
      WHERE pp.client_project_id = NEW.id 
      AND pp.status = 'active'
      AND pi.status = 'paid'
    ) INTO has_paid_installment;
    
    -- Solo proceder si hay al menos un pago realizado
    IF has_paid_installment THEN
      -- Update status to design or construction based on existing design
      IF NEW.has_existing_design = true THEN
        NEW.status = 'construction';
        NEW.moved_to_construction_at = now();
      ELSE
        NEW.status = 'design';
      END IF;
      
      -- Asegurar que existan las fases de diseño si no tiene diseño existente
      IF NEW.has_existing_design = false THEN
        -- Esto se ejecutará después del UPDATE, en un trigger AFTER
        PERFORM pg_notify('create_design_phases', NEW.id::text);
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Crear función para crear fases de diseño automáticamente
CREATE OR REPLACE FUNCTION public.ensure_design_phases()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  admin_profile_id uuid;
BEGIN
  -- Solo actuar si el proyecto cambió a 'design' y no tiene diseño existente
  IF NEW.status = 'design' AND NEW.has_existing_design = false 
     AND (OLD.status IS NULL OR OLD.status != 'design') THEN
    
    -- Get admin profile as creator
    SELECT id INTO admin_profile_id 
    FROM public.profiles 
    WHERE role = 'admin' 
    LIMIT 1;
    
    -- Crear fases de diseño si no existen
    IF NOT EXISTS (SELECT 1 FROM public.design_phases WHERE project_id = NEW.id) THEN
      INSERT INTO public.design_phases (
        project_id, 
        phase_name, 
        phase_order, 
        status, 
        created_by
      ) VALUES
      (NEW.id, 'Zonificación', 1, 'pending', admin_profile_id),
      (NEW.id, 'Volumetría', 2, 'pending', admin_profile_id),
      (NEW.id, 'Acabados', 3, 'pending', admin_profile_id),
      (NEW.id, 'Renders', 4, 'pending', admin_profile_id),
      (NEW.id, 'Diseño Completado', 5, 'pending', admin_profile_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recrear el trigger con la nueva función mejorada
DROP TRIGGER IF EXISTS trigger_auto_transition_to_design ON public.client_projects;
CREATE TRIGGER trigger_auto_transition_to_design
  BEFORE UPDATE ON public.client_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_transition_to_design();

-- Crear trigger AFTER para asegurar que se crean las fases de diseño
DROP TRIGGER IF EXISTS trigger_ensure_design_phases ON public.client_projects;
CREATE TRIGGER trigger_ensure_design_phases
  AFTER UPDATE ON public.client_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_design_phases();