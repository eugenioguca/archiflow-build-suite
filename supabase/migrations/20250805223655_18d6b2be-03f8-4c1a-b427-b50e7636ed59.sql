-- Create plan_type enum to differentiate between sales and construction payment plans
CREATE TYPE plan_type AS ENUM ('sales_to_design', 'design_to_construction');

-- Add plan_type column to payment_plans table
ALTER TABLE public.payment_plans 
ADD COLUMN plan_type plan_type DEFAULT 'sales_to_design';

-- Update existing payment plans to be sales_to_design type
UPDATE public.payment_plans 
SET plan_type = 'sales_to_design' 
WHERE plan_type IS NULL;

-- Create function for auto transition from design to construction
CREATE OR REPLACE FUNCTION public.auto_transition_to_construction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  has_paid_construction_installment BOOLEAN := false;
BEGIN
  -- Check if project should transition from design to construction
  IF NEW.status = 'design' 
     AND NEW.construction_budget > 0
     AND (OLD.status IS NULL OR OLD.status != 'construction') THEN
    
    -- Check if there's at least one paid installment in design_to_construction plan
    SELECT EXISTS (
      SELECT 1 
      FROM payment_plans pp
      JOIN payment_installments pi ON pp.id = pi.payment_plan_id
      WHERE pp.client_project_id = NEW.id 
      AND pp.plan_type = 'design_to_construction'
      AND pp.status = 'active'
      AND pi.status = 'paid'
    ) INTO has_paid_construction_installment;
    
    -- Transition to construction if payment received
    IF has_paid_construction_installment THEN
      NEW.status = 'construction';
      NEW.moved_to_construction_at = now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for auto transition to construction
DROP TRIGGER IF EXISTS auto_transition_to_construction_trigger ON public.client_projects;
CREATE TRIGGER auto_transition_to_construction_trigger
  BEFORE UPDATE ON public.client_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_transition_to_construction();

-- Add index for better performance on plan_type queries
CREATE INDEX IF NOT EXISTS idx_payment_plans_plan_type ON public.payment_plans(plan_type);
CREATE INDEX IF NOT EXISTS idx_payment_plans_client_project_plan_type ON public.payment_plans(client_project_id, plan_type);