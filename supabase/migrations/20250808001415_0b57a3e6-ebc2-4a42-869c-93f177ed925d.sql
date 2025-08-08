-- Create trigger for automatic transition from design to construction
-- when first construction payment installment is paid

CREATE OR REPLACE FUNCTION public.auto_transition_design_to_construction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- Drop trigger if exists and recreate it
DROP TRIGGER IF EXISTS trigger_auto_transition_design_to_construction ON payment_installments;

-- Create the trigger on payment_installments table
CREATE TRIGGER trigger_auto_transition_design_to_construction
  AFTER UPDATE ON payment_installments
  FOR EACH ROW
  EXECUTE FUNCTION auto_transition_design_to_construction();