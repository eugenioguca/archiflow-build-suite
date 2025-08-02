-- Create function to revert project from construction module
CREATE OR REPLACE FUNCTION public.revert_project_from_construction(
  project_id_param UUID,
  revert_reason TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete all construction-related data in cascade order
  
  -- Delete construction timelines
  DELETE FROM public.construction_timelines 
  WHERE project_id = project_id_param;
  
  -- Delete construction deliveries
  DELETE FROM public.construction_deliveries 
  WHERE project_id = project_id_param;
  
  -- Delete construction expenses
  DELETE FROM public.construction_expenses 
  WHERE project_id = project_id_param;
  
  -- Delete construction materials
  DELETE FROM public.construction_materials 
  WHERE project_id = project_id_param;
  
  -- Delete construction budget items
  DELETE FROM public.construction_budget_items 
  WHERE project_id = project_id_param;
  
  -- Delete construction teams
  DELETE FROM public.construction_teams 
  WHERE project_id = project_id_param;
  
  -- Delete construction phases
  DELETE FROM public.construction_phases 
  WHERE project_id IN (
    SELECT id FROM public.construction_projects 
    WHERE project_id = project_id_param
  );
  
  -- Delete construction budget alerts
  DELETE FROM public.construction_budget_alerts 
  WHERE project_id = project_id_param;
  
  -- Delete construction budget changes
  DELETE FROM public.construction_budget_changes 
  WHERE project_id IN (
    SELECT id FROM public.construction_projects 
    WHERE project_id = project_id_param
  );
  
  -- Delete construction project
  DELETE FROM public.construction_projects 
  WHERE project_id = project_id_param;
  
  -- Update client project status back to design_completed
  UPDATE public.client_projects 
  SET 
    status = 'design_completed',
    moved_to_construction_at = NULL,
    construction_budget = 0,
    spent_budget = 0,
    construction_area = 0,
    construction_start_date = NULL,
    permit_status = 'pending',
    permit_expiry_date = NULL,
    project_manager_id = NULL,
    construction_supervisor_id = NULL,
    updated_at = now()
  WHERE id = project_id_param;
  
  -- Log the reversion action
  INSERT INTO public.construction_budget_changes (
    project_id,
    previous_budget,
    new_budget,
    change_amount,
    change_percentage,
    change_reason,
    authorized_by,
    notes
  ) 
  SELECT 
    cp.id,
    cp.construction_budget,
    0,
    -cp.construction_budget,
    -100,
    'project_reverted',
    (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1),
    'Proyecto revertido del módulo de construcción. Motivo: ' || revert_reason
  FROM public.construction_projects cp
  WHERE cp.project_id = project_id_param;
  
END;
$function$;