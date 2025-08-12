-- Corregir la función delete_project_cascade para eliminar referencias a tablas inexistentes
CREATE OR REPLACE FUNCTION public.delete_project_cascade(project_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete in order to respect foreign key constraints
  -- Only delete from tables that actually exist
  
  -- Delete event alerts first
  DELETE FROM public.client_project_calendar_event_alerts 
  WHERE event_id IN (
    SELECT id FROM public.client_project_calendar_events 
    WHERE client_project_id = project_id_param
  );
  
  -- Delete calendar events
  DELETE FROM public.client_project_calendar_events WHERE client_project_id = project_id_param;
  
  -- Delete chat notifications for this project
  DELETE FROM public.chat_notifications WHERE project_id = project_id_param;
  
  -- Delete client portal notifications for this project
  DELETE FROM public.client_portal_notifications WHERE project_id = project_id_param;
  
  -- Delete client payment proofs for this project
  DELETE FROM public.client_payment_proofs WHERE project_id = project_id_param;
  
  -- Delete payment installments for this project
  DELETE FROM public.payment_installments 
  WHERE payment_plan_id IN (
    SELECT id FROM public.payment_plans WHERE client_project_id = project_id_param
  );
  
  -- Delete payment plans for this project
  DELETE FROM public.payment_plans WHERE client_project_id = project_id_param;
  
  -- Delete construction budget items for this project
  DELETE FROM public.construction_budget_items WHERE project_id = project_id_param;
  
  -- Delete budget change log for this project
  DELETE FROM public.budget_change_log WHERE project_id = project_id_param;
  
  -- Delete construction timeline for this project
  DELETE FROM public.construction_timeline WHERE project_id = project_id_param;
  
  -- Delete construction milestones for this project
  DELETE FROM public.construction_milestones WHERE project_id = project_id_param;
  
  -- Delete construction phases for this project
  DELETE FROM public.construction_phases WHERE project_id = project_id_param;
  
  -- Delete construction teams for this project
  DELETE FROM public.construction_teams WHERE project_id = project_id_param;
  
  -- Delete construction equipment for this project
  DELETE FROM public.construction_equipment WHERE project_id = project_id_param;
  
  -- Delete design phases for this project
  DELETE FROM public.design_phases WHERE project_id = project_id_param;
  
  -- Delete budget items for this project
  DELETE FROM public.budget_items 
  WHERE budget_id IN (
    SELECT id FROM public.project_budgets WHERE project_id = project_id_param
  );
  
  -- Delete project budgets for this project
  DELETE FROM public.project_budgets WHERE project_id = project_id_param;
  
  -- Delete material finance requests for this project
  DELETE FROM public.material_finance_requests WHERE project_id = project_id_param;
  
  -- Delete material requirements for this project
  DELETE FROM public.material_requirements WHERE project_id = project_id_param;
  
  -- Delete documents for this project
  DELETE FROM public.documents WHERE project_id = project_id_param;
  
  -- Delete expenses for this project
  DELETE FROM public.expenses WHERE project_id = project_id_param;
  
  -- Delete incomes for this project
  DELETE FROM public.incomes WHERE project_id = project_id_param;
  
  -- Delete billing clients for this project
  DELETE FROM public.billing_clients WHERE project_id = project_id_param;
  
  -- Delete CFDI documents for this project (by income/expense)
  DELETE FROM public.cfdi_documents WHERE expense_id IN (
    SELECT id FROM public.expenses WHERE project_id = project_id_param
  );
  
  DELETE FROM public.cfdi_documents WHERE income_id IN (
    SELECT id FROM public.incomes WHERE project_id = project_id_param
  );
  
  -- Delete project chat messages if table exists
  DELETE FROM public.project_chat WHERE project_id = project_id_param;
  
  -- Finally, delete the project
  DELETE FROM public.client_projects WHERE id = project_id_param;
  
END;
$function$;