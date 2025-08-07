-- Corregir funciones sin search_path configurado para cumplir con políticas de seguridad

-- Actualizar función update_plan_sequence
CREATE OR REPLACE FUNCTION public.update_plan_sequence()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Al crear un nuevo plan, marcar el anterior como no actual
  IF TG_OP = 'INSERT' THEN
    UPDATE payment_plans 
    SET is_current_plan = false, updated_at = NOW()
    WHERE client_project_id = NEW.client_project_id 
    AND plan_type = NEW.plan_type 
    AND id != NEW.id;
    
    -- Establecer la secuencia correcta
    NEW.plan_sequence := COALESCE(
      (SELECT MAX(plan_sequence) + 1 
       FROM payment_plans 
       WHERE client_project_id = NEW.client_project_id 
       AND plan_type = NEW.plan_type), 
      1
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Actualizar función auto_transition_sales_to_design
CREATE OR REPLACE FUNCTION public.auto_transition_sales_to_design()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
    
    -- Actualizar el proyecto para transición a diseño
    UPDATE client_projects 
    SET status = 'design', updated_at = NOW()
    WHERE id = (
      SELECT pp.client_project_id 
      FROM payment_plans pp 
      WHERE pp.id = NEW.payment_plan_id
    ) AND status = 'potential'
    AND sales_pipeline_stage = 'cliente_cerrado'
    AND EXISTS (
      SELECT 1 FROM client_documents cd
      WHERE cd.project_id = client_projects.id 
      AND cd.document_type IN ('constancia_situacion_fiscal', 'contract')
      GROUP BY cd.project_id
      HAVING COUNT(DISTINCT cd.document_type) >= 2
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Actualizar función auto_transition_design_to_construction
CREATE OR REPLACE FUNCTION public.auto_transition_design_to_construction()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

-- Actualizar función update_payment_plan_status
CREATE OR REPLACE FUNCTION public.update_payment_plan_status()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  plan_record RECORD;
  total_paid NUMERIC;
  total_amount NUMERIC;
BEGIN
  -- Obtener información del plan
  SELECT pp.* INTO plan_record
  FROM payment_plans pp
  WHERE pp.id = NEW.payment_plan_id;
  
  -- Calcular total pagado
  SELECT COALESCE(SUM(amount), 0) INTO total_paid
  FROM payment_installments
  WHERE payment_plan_id = NEW.payment_plan_id
  AND status = 'paid';
  
  total_amount := plan_record.total_amount;
  
  -- Actualizar estado del plan
  IF total_paid >= total_amount THEN
    UPDATE payment_plans 
    SET status = 'completed', updated_at = NOW()
    WHERE id = NEW.payment_plan_id;
  ELSIF total_paid > 0 THEN
    UPDATE payment_plans 
    SET status = 'active', updated_at = NOW()
    WHERE id = NEW.payment_plan_id AND status != 'active';
  END IF;
  
  RETURN NEW;
END;
$$;