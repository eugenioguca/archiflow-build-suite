-- Create the missing trigger for auto transition to design
CREATE TRIGGER auto_transition_to_design_trigger
  BEFORE UPDATE ON public.client_projects
  FOR EACH ROW
  EXECUTE FUNCTION auto_transition_to_design();