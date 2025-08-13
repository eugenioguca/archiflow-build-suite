-- FASE 1: CORRECCIONES CRÍTICAS DE SEGURIDAD

-- 1. Agregar política RLS faltante para platform_settings
CREATE POLICY "Admin users can view platform settings" ON public.platform_settings
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admin users can update platform settings" ON public.platform_settings
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admin users can insert platform settings" ON public.platform_settings
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- 2. Agregar SET search_path a funciones críticas que no lo tienen
CREATE OR REPLACE FUNCTION public.auto_create_material_finance_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  project_client_id UUID;
  requester_profile_id UUID;
BEGIN
  -- Only create request when status changes to 'requerido' (instead of 'required')
  IF NEW.status = 'requerido' AND (OLD.status IS NULL OR OLD.status != 'requerido') THEN
    -- Get client_id from project
    SELECT client_id INTO project_client_id
    FROM client_projects
    WHERE id = NEW.project_id;
    
    -- Get current user's profile
    SELECT id INTO requester_profile_id
    FROM profiles
    WHERE user_id = auth.uid()
    LIMIT 1;
    
    -- Insert finance request if not exists
    INSERT INTO material_finance_requests (
      material_requirement_id,
      project_id,
      client_id,
      requested_by,
      supplier_id
    ) VALUES (
      NEW.id,
      NEW.project_id,
      project_client_id,
      COALESCE(requester_profile_id, NEW.created_by),
      NEW.supplier_id
    )
    ON CONFLICT (material_requirement_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_create_project_for_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Solo crear proyecto si el cliente pasa de 'nuevo_lead' a 'en_contacto' y no tiene proyecto
  IF OLD.sales_pipeline_stage = 'nuevo_lead' 
     AND NEW.sales_pipeline_stage = 'en_contacto' 
     AND NOT EXISTS (SELECT 1 FROM projects WHERE client_id = NEW.client_id) THEN
    
    INSERT INTO projects (
      client_id,
      name,
      description,
      status
    ) VALUES (
      NEW.client_id,
      'Proyecto para ' || (SELECT full_name FROM clients WHERE id = NEW.client_id),
      'Proyecto creado automáticamente al convertir lead',
      'planning'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_transition_design_to_construction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Verificar si hay plan de pago de construcción con primer anticipo pagado
  IF EXISTS (
    SELECT 1 FROM payment_plans pp
    JOIN payment_installments pi ON pp.id = pi.payment_plan_id
    WHERE pp.client_project_id = (
      SELECT client_project_id FROM payment_plans WHERE id = NEW.payment_plan_id
    )
    AND pp.plan_type = 'construction_payment'
    AND pp.is_current_plan = true
    AND pi.installment_number = 1
    AND pi.status = 'paid'
  ) AND TG_OP = 'UPDATE' AND OLD.status != 'paid' AND NEW.status = 'paid' THEN
    
    -- Actualizar el proyecto para transición a construcción
    UPDATE client_projects 
    SET status = 'construction', moved_to_construction_at = NOW(), updated_at = NOW()
    WHERE id = (
      SELECT pp.client_project_id 
      FROM payment_plans pp 
      WHERE pp.id = NEW.payment_plan_id
    ) AND status = 'design'
    AND construction_budget > 0;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_transition_sales_to_design()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Verificar si hay plan de pago de diseño con primer anticipo pagado
  IF EXISTS (
    SELECT 1 FROM payment_plans pp
    JOIN payment_installments pi ON pp.id = pi.payment_plan_id
    WHERE pp.client_project_id = (
      SELECT client_project_id FROM payment_plans WHERE id = NEW.payment_plan_id
    )
    AND pp.plan_type = 'design_payment'
    AND pp.is_current_plan = true
    AND pi.installment_number = 1
    AND pi.status = 'paid'
  ) AND TG_OP = 'UPDATE' AND OLD.status != 'paid' AND NEW.status = 'paid' THEN
    
    -- Actualizar el proyecto para transición a diseño (sin verificaciones complejas)
    UPDATE client_projects 
    SET status = 'design', updated_at = NOW()
    WHERE id = (
      SELECT pp.client_project_id 
      FROM payment_plans pp 
      WHERE pp.id = NEW.payment_plan_id
    ) AND status = 'potential'
    AND sales_pipeline_stage = 'cliente_cerrado';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 3. Función de seguridad para validar permisos de eliminación masiva
CREATE OR REPLACE FUNCTION public.validate_bulk_delete_permissions(table_name text, record_ids uuid[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  user_profile RECORD;
  is_authorized boolean := false;
BEGIN
  -- Obtener perfil del usuario
  SELECT role, department_enum, position_enum INTO user_profile
  FROM profiles
  WHERE user_id = auth.uid();
  
  -- Solo admins y directores pueden hacer eliminaciones masivas
  IF user_profile.role = 'admin' OR 
     (user_profile.position_enum = 'director' AND user_profile.department_enum = 'general') THEN
    is_authorized := true;
  END IF;
  
  -- Log del intento de eliminación masiva
  PERFORM log_security_event(
    'bulk_delete_attempt', 
    jsonb_build_object(
      'table_name', table_name,
      'record_count', array_length(record_ids, 1),
      'user_role', user_profile.role,
      'authorized', is_authorized
    )
  );
  
  RETURN is_authorized;
END;
$function$;