-- Fix the trigger function with correct table alias and column references
CREATE OR REPLACE FUNCTION public.auto_transition_sales_to_design()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
      -- Verificar documentos requeridos usando la tabla documents unificada
      SELECT 1 FROM documents 
      WHERE project_id = client_projects.id 
      AND type IN ('constancia_situacion_fiscal', 'contract')
      AND document_status = 'active'
      GROUP BY project_id
      HAVING COUNT(DISTINCT type) >= 2
    );
  END IF;
  
  RETURN NEW;
END;
$function$;