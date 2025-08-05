-- Create the auto_transition_to_design function
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
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create the trigger for auto transition to design
DROP TRIGGER IF EXISTS auto_transition_to_design_trigger ON public.client_projects;
CREATE TRIGGER auto_transition_to_design_trigger
  BEFORE UPDATE ON public.client_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_transition_to_design();