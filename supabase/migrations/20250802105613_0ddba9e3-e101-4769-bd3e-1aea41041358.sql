-- Create trigger function to auto-transition projects from budget_accepted to construction
CREATE OR REPLACE FUNCTION public.auto_transition_to_construction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- When project status changes to budget_accepted, automatically transition to construction
  IF NEW.status = 'budget_accepted' AND (OLD.status != 'budget_accepted' OR OLD.status IS NULL) THEN
    NEW.status = 'construction';
    NEW.moved_to_construction_at = now();
  END IF;
  
  RETURN NEW;
END;
$function$