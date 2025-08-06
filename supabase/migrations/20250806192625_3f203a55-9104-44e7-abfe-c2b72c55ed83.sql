-- Update delete_client_cascade function to handle budget_change_log
CREATE OR REPLACE FUNCTION public.delete_client_cascade(client_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete in order to respect foreign key constraints
  
  -- Delete client portal notifications
  DELETE FROM public.client_portal_notifications WHERE client_id = client_id_param;
  
  -- Delete client portal chat messages
  DELETE FROM public.client_portal_chat WHERE client_id = client_id_param;
  
  -- Delete client payment proofs
  DELETE FROM public.client_payment_proofs WHERE client_id = client_id_param;
  
  -- Delete client payments
  DELETE FROM public.client_payments WHERE client_id = client_id_param;
  
  -- Delete client documents
  DELETE FROM public.client_documents WHERE client_id = client_id_param;
  
  -- Delete billing clients
  DELETE FROM public.billing_clients WHERE client_id = client_id_param;
  
  -- Delete CRM activities
  DELETE FROM public.crm_activities WHERE client_id = client_id_param;
  
  -- Delete payment installments for projects of this client
  DELETE FROM public.payment_installments 
  WHERE payment_plan_id IN (
    SELECT id FROM public.payment_plans 
    WHERE client_project_id IN (
      SELECT id FROM public.client_projects WHERE client_id = client_id_param
    )
  );
  
  -- Delete payment plans for projects of this client
  DELETE FROM public.payment_plans 
  WHERE client_project_id IN (
    SELECT id FROM public.client_projects WHERE client_id = client_id_param
  );
  
  -- Delete budget change log for projects of this client (NEW - BEFORE deleting budget items)
  DELETE FROM public.budget_change_log 
  WHERE project_id IN (
    SELECT id FROM public.client_projects WHERE client_id = client_id_param
  );
  
  -- Delete construction budget items for projects of this client
  DELETE FROM public.construction_budget_items 
  WHERE project_id IN (
    SELECT id FROM public.client_projects WHERE client_id = client_id_param
  );
  
  -- Delete construction timeline for projects of this client
  DELETE FROM public.construction_timeline 
  WHERE project_id IN (
    SELECT id FROM public.client_projects WHERE client_id = client_id_param
  );
  
  -- Delete construction milestones for projects of this client
  DELETE FROM public.construction_milestones 
  WHERE project_id IN (
    SELECT id FROM public.client_projects WHERE client_id = client_id_param
  );
  
  -- Delete construction phases for projects of this client
  DELETE FROM public.construction_phases 
  WHERE project_id IN (
    SELECT id FROM public.client_projects WHERE client_id = client_id_param
  );
  
  -- Delete construction teams for projects of this client
  DELETE FROM public.construction_teams 
  WHERE project_id IN (
    SELECT id FROM public.client_projects WHERE client_id = client_id_param
  );
  
  -- Delete construction equipment for projects of this client
  DELETE FROM public.construction_equipment 
  WHERE project_id IN (
    SELECT id FROM public.client_projects WHERE client_id = client_id_param
  );
  
  -- Delete design phases for projects of this client
  DELETE FROM public.design_phases 
  WHERE project_id IN (
    SELECT id FROM public.client_projects WHERE client_id = client_id_param
  );
  
  -- Delete budget items for projects of this client
  DELETE FROM public.budget_items 
  WHERE budget_id IN (
    SELECT id FROM public.project_budgets 
    WHERE project_id IN (
      SELECT id FROM public.client_projects WHERE client_id = client_id_param
    )
  );
  
  -- Delete project budgets for projects of this client
  DELETE FROM public.project_budgets 
  WHERE project_id IN (
    SELECT id FROM public.client_projects WHERE client_id = client_id_param
  );
  
  -- Delete material requirements for projects of this client
  DELETE FROM public.material_requirements 
  WHERE project_id IN (
    SELECT id FROM public.client_projects WHERE client_id = client_id_param
  );
  
  -- Delete material finance requests for projects of this client
  DELETE FROM public.material_finance_requests 
  WHERE project_id IN (
    SELECT id FROM public.client_projects WHERE client_id = client_id_param
  );
  
  -- Delete documents for projects of this client
  DELETE FROM public.documents 
  WHERE project_id IN (
    SELECT id FROM public.client_projects WHERE client_id = client_id_param
  );
  
  -- Delete expenses for this client
  DELETE FROM public.expenses WHERE client_id = client_id_param;
  
  -- Delete incomes for this client
  DELETE FROM public.incomes WHERE client_id = client_id_param;
  
  -- Delete CFDI documents for this client
  DELETE FROM public.cfdi_documents WHERE client_id = client_id_param;
  
  -- Delete client projects
  DELETE FROM public.client_projects WHERE client_id = client_id_param;
  
  -- Delete client portal settings
  DELETE FROM public.client_portal_settings WHERE client_id = client_id_param;
  
  -- Finally, delete the client
  DELETE FROM public.clients WHERE id = client_id_param;
  
END;
$function$;