-- Continue fixing remaining database functions with missing search_path

-- Fix get_user_branch_offices
CREATE OR REPLACE FUNCTION public.get_user_branch_offices(_user_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  user_profile RECORD;
  branch_ids UUID[];
BEGIN
  -- Get user profile
  SELECT p.role, p.department_enum, p.position_enum INTO user_profile
  FROM public.profiles p
  WHERE p.user_id = _user_id;
  
  -- Admins and directors see all branches
  IF user_profile.role = 'admin' OR user_profile.position_enum = 'director' THEN
    SELECT ARRAY(SELECT id FROM public.branch_offices WHERE active = true) INTO branch_ids;
    RETURN branch_ids;
  END IF;
  
  -- Finance and accounting see all branches
  IF user_profile.department_enum IN ('finanzas', 'contabilidad') THEN
    SELECT ARRAY(SELECT id FROM public.branch_offices WHERE active = true) INTO branch_ids;
    RETURN branch_ids;
  END IF;
  
  -- Other users see only assigned branches
  SELECT ARRAY(
    SELECT uba.branch_office_id 
    FROM public.user_branch_assignments uba
    JOIN public.profiles p ON p.id = uba.user_id
    WHERE p.user_id = _user_id
  ) INTO branch_ids;
  
  RETURN branch_ids;
END;
$function$;

-- Fix ensure_design_phases
CREATE OR REPLACE FUNCTION public.ensure_design_phases()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Fix update_alliance_stats
CREATE OR REPLACE FUNCTION public.update_alliance_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update clients_referred count
    UPDATE public.commercial_alliances 
    SET clients_referred = clients_referred + 1,
        updated_at = now()
    WHERE id = NEW.alliance_id AND NEW.alliance_id IS NOT NULL;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle alliance change
    IF OLD.alliance_id IS DISTINCT FROM NEW.alliance_id THEN
      -- Decrease count for old alliance
      IF OLD.alliance_id IS NOT NULL THEN
        UPDATE public.commercial_alliances 
        SET clients_referred = clients_referred - 1,
            updated_at = now()
        WHERE id = OLD.alliance_id;
      END IF;
      -- Increase count for new alliance
      IF NEW.alliance_id IS NOT NULL THEN
        UPDATE public.commercial_alliances 
        SET clients_referred = clients_referred + 1,
            updated_at = now()
        WHERE id = NEW.alliance_id;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrease count when client is deleted
    IF OLD.alliance_id IS NOT NULL THEN
      UPDATE public.commercial_alliances 
      SET clients_referred = clients_referred - 1,
          updated_at = now()
      WHERE id = OLD.alliance_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- Fix generate_payment_reference
CREATE OR REPLACE FUNCTION public.generate_payment_reference()
RETURNS text
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
DECLARE
  sequence_num INTEGER;
  reference_code TEXT;
BEGIN
  -- Get next sequence number for today
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(reference_code, '-', 4) AS INTEGER)
  ), 0) + 1 INTO sequence_num
  FROM public.treasury_payment_references
  WHERE DATE(created_at) = CURRENT_DATE;
  
  -- Generate reference code: PAG-YYYYMMDD-###
  reference_code := 'PAG-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(sequence_num::TEXT, 3, '0');
  
  RETURN reference_code;
END;
$function$;

-- Fix auto_transition_to_design
CREATE OR REPLACE FUNCTION public.auto_transition_to_design()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;