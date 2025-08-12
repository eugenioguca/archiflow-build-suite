-- Modificar el trigger auto_transition_to_construction para evitar transiciones prematuras
-- El trigger debe requerir un pago de primera parcialidad de construcción, no solo construction_budget > 0

DROP TRIGGER IF EXISTS auto_transition_to_construction_trigger ON client_projects;

CREATE OR REPLACE FUNCTION public.auto_transition_to_construction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Solo transicionar si el proyecto está en diseño y tiene presupuesto de construcción
  -- PERO ahora también verificamos que exista un plan de construcción con primer pago
  IF NEW.status = 'design' 
     AND NEW.construction_budget > 0
     AND (OLD.status IS NULL OR OLD.status != 'construction')
     AND EXISTS (
       SELECT 1 FROM payment_plans pp
       JOIN payment_installments pi ON pp.id = pi.payment_plan_id
       WHERE pp.client_project_id = NEW.id
       AND pp.plan_type = 'construction_payment'
       AND pp.is_current_plan = true
       AND pi.installment_number = 1
       AND pi.status = 'paid'
     ) THEN
    
    -- Solo entonces transicionar a construcción
    NEW.status = 'construction';
    NEW.moved_to_construction_at = now();
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recrear el trigger
CREATE TRIGGER auto_transition_to_construction_trigger
    BEFORE UPDATE ON client_projects
    FOR EACH ROW
    EXECUTE FUNCTION auto_transition_to_construction();