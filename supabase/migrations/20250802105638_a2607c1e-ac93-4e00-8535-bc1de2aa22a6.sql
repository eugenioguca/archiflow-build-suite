-- Create trigger on client_projects table for auto-transition to construction
CREATE TRIGGER trigger_auto_transition_to_construction
  BEFORE UPDATE ON public.client_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_transition_to_construction();